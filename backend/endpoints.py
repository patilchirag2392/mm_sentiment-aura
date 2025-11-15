from fastapi import APIRouter, HTTPException, status, WebSocket
from typing import Dict, Any
import logging
import asyncio
from models import TextProcessRequest, TextProcessResponse, ErrorResponse  
from claude_service import get_claude_service  
from config import settings
from deepgram_proxy import websocket_transcribe_handler
from pydantic import BaseModel
from typing import Optional, List  

logger = logging.getLogger(__name__)

class TextProcessRequest(BaseModel):
    text: str
    
class SentimentResponse(BaseModel):
    sentiment_score: float
    emotion: str
    intensity: float
    keywords: List[str]
    confidence: float
    error: Optional[str] = None

def get_primary_emotion(emotions_dict: dict) -> str:
    """Extract the primary emotion from emotion scores."""
    if not emotions_dict:
        return "neutral"
    
    primary = max(emotions_dict.items(), key=lambda x: x[1])
    
    if primary[1] > 0.3:
        return primary[0]
    
    return "neutral"

# create router
router = APIRouter(prefix="/api", tags=["sentiment"])

# track concurrent requests for simple rate limiting
_concurrent_requests = 0
_request_lock = asyncio.Lock()

@router.get("/status")
async def get_api_status() -> Dict[str, Any]:
    """Get current API status and Claude configuration."""
    try:
        claude_service = get_claude_service()
        
        return {
            "status": "operational",
            "concurrent_requests": _concurrent_requests,
            "max_concurrent_requests": settings.MAX_CONCURRENT_REQUESTS,
            "ai_provider": "anthropic",
            "model": claude_service.model,
            "model_info": {
                "claude-3-opus-20240229": "Most capable model",
                "claude-3-sonnet-20240229": "Balanced performance",
                "claude-3-haiku-20240307": "Fastest response"
            }.get(claude_service.model, "Claude model"),
            "features": {
                "sentiment_analysis": True,
                "keyword_extraction": True,
                "emotion_detection": True
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "concurrent_requests": _concurrent_requests,
            "max_concurrent_requests": settings.MAX_CONCURRENT_REQUESTS
        }

@router.get("/models")
async def get_available_models() -> Dict[str, Any]:
    """Get information about available Claude models."""
    return {
        "current_model": settings.CLAUDE_MODEL,
        "available_models": [
            {
                "id": "claude-3-5-sonnet-20241022",
                "name": "Claude 3.5 Sonnet",
                "description": "Latest and most capable balanced model",
                "speed": "fast",
                "quality": "excellent"
            },
            {
                "id": "claude-3-opus-20240229",
                "name": "Claude 3 Opus",
                "description": "Most capable model for complex analysis",
                "speed": "slower",
                "quality": "highest"
            },
            {
                "id": "claude-3-haiku-20240307",
                "name": "Claude 3 Haiku",
                "description": "Fastest response times",
                "speed": "fastest",
                "quality": "good"
            }
        ]
    }

@router.websocket("/ws/transcribe")
async def websocket_transcribe(websocket: WebSocket):
    """
    WebSocket endpoint for Deepgram transcription proxy.
    """
    await websocket_transcribe_handler(websocket)

@router.post("/process_text", response_model=SentimentResponse)
async def process_text(request: TextProcessRequest):
    """
    Process text to extract sentiment and keywords using Claude API.
    Transforms claude_service response to match frontend expectations.
    """
    logger.info(f"📝 Processing text: '{request.text[:50]}...'")
    
    if not request.text or not request.text.strip():
        logger.warning("Empty text received")
        return SentimentResponse(
            sentiment_score=0.0,
            emotion="neutral",
            intensity=0.0,
            keywords=[],
            confidence=0.0,
            error="Empty text provided"
        )
    
    try:
        claude_service = get_claude_service()
        result = await claude_service.process_text(request.text)
        
        sentiment = result.get("sentiment", {})
        emotions = result.get("emotions", {})
        keywords = result.get("keywords", [])
        
        primary_emotion = get_primary_emotion(emotions)
        
        if primary_emotion == "neutral":
            sentiment_type = sentiment.get("type", "neutral")
            emotion_map = {
                "positive": "happy",
                "negative": "sad",
                "neutral": "neutral",
                "mixed": "surprised"
            }
            primary_emotion = emotion_map.get(sentiment_type, "neutral")
        
        confidence = sentiment.get("intensity", 0.5)
        if result.get("is_fallback", False):
            confidence = 0.3
        
        response = SentimentResponse(
            sentiment_score=sentiment.get("score", 0.0),
            emotion=primary_emotion,
            intensity=sentiment.get("intensity", 0.5),
            keywords=keywords[:5],  # Limit to 5 keywords
            confidence=confidence
        )
        
        logger.info(f" Sentiment: {response.emotion} (score: {response.sentiment_score}, intensity: {response.intensity})")
        logger.info(f" Keywords: {', '.join(response.keywords)}")
        
        return response
        
    except Exception as e:
        logger.error(f" Error processing text: {e}")
        return SentimentResponse(
            sentiment_score=0.0,
            emotion="neutral",
            intensity=0.0,
            keywords=[],
            confidence=0.0,
            error=str(e)
        )