from pydantic import BaseModel, Field
from typing import List, Dict, Literal, Optional
from datetime import datetime

class TextProcessRequest(BaseModel):
    """Request model for /process_text endpoint."""
    text: str = Field(..., min_length=1, max_length=1000, description="Text to analyze")
    session_id: Optional[str] = Field(None, description="Optional session tracking")
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "I'm really excited about this new project!",
                "session_id": "user-123"
            }
        }

class EmotionScores(BaseModel):
    """Detailed emotion intensity scores."""
    joy: float = Field(0.0, ge=0.0, le=1.0)
    sadness: float = Field(0.0, ge=0.0, le=1.0)
    anger: float = Field(0.0, ge=0.0, le=1.0)
    fear: float = Field(0.0, ge=0.0, le=1.0)
    surprise: float = Field(0.0, ge=0.0, le=1.0)
    disgust: float = Field(0.0, ge=0.0, le=1.0)

class SentimentInfo(BaseModel):
    """Sentiment analysis results."""
    type: Literal["positive", "negative", "neutral", "mixed"]
    score: float = Field(..., ge=-1.0, le=1.0, description="Sentiment score from -1 to 1")
    intensity: float = Field(..., ge=0.0, le=1.0, description="Emotion intensity from 0 to 1")

class TextProcessResponse(BaseModel):
    sentiment: SentimentInfo
    keywords: List[str] = Field(..., max_items=10, description="Max 10 keywords for UI display")
    emotions: EmotionScores
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    processing_time_ms: Optional[int] = Field(None, description="API processing time")
    
    class Config:
        json_schema_extra = {
            "example": {
                "sentiment": {
                    "type": "positive",
                    "score": 0.85,
                    "intensity": 0.7
                },
                "keywords": ["excited", "project", "new"],
                "emotions": {
                    "joy": 0.8,
                    "sadness": 0.0,
                    "anger": 0.0,
                    "fear": 0.0,
                    "surprise": 0.3,
                    "disgust": 0.0
                },
                "timestamp": 1699564800000,
                "processing_time_ms": 245
            }
        }

class ErrorResponse(BaseModel):
    """Error response model."""
    error: str
    message: str
    path: Optional[str] = None
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))