from fastapi import APIRouter, HTTPException, status
from typing import Dict, Any
import logging
import asyncio
from models import TextProcessRequest, TextProcessResponse, ErrorResponse  
from claude_service import get_claude_service  
from config import settings  

logger = logging.getLogger(__name__)

# create router
router = APIRouter(prefix="/api", tags=["sentiment"])

# track concurrent requests for simple rate limiting
_concurrent_requests = 0
_request_lock = asyncio.Lock()

@router.post(
    "/process_text",
    response_model=TextProcessResponse,
    responses={
        429: {"model": ErrorResponse, "description": "Too many requests"},
        500: {"model": ErrorResponse, "description": "Internal server error"},
        504: {"model": ErrorResponse, "description": "Claude API timeout"}
    }
)
async def process_text(request: TextProcessRequest) -> TextProcessResponse:
    global _concurrent_requests
    
    # simple rate limiting
    async with _request_lock:
        if _concurrent_requests >= settings.MAX_CONCURRENT_REQUESTS:
            logger.warning(f"Rate limit reached: {_concurrent_requests} concurrent requests")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many concurrent requests. Please try again."
            )
        _concurrent_requests += 1
    
    try:
        logger.info(f"Processing text with Claude: {request.text[:50]}...")
        
        # get Claude service and process text
        claude_service = get_claude_service()
        result = await claude_service.process_text(request.text)
        
        # log if we're using fallback
        if result.get("is_fallback"):
            logger.warning("Using fallback response due to Claude API error")
        
        # create response matching frontend expectations
        return TextProcessResponse(**result)
        
    except asyncio.TimeoutError:
        logger.error("Claude API timeout")
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Claude API request timed out"
        )
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}", exc_info=True)
        # return fallback response instead of error
        claude_service = get_claude_service()
        fallback = claude_service._get_fallback_response()
        return TextProcessResponse(**fallback)
    finally:
        async with _request_lock:
            _concurrent_requests -= 1

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