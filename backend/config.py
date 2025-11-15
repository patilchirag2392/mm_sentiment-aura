import os
from typing import List
from dotenv import load_dotenv
import logging

load_dotenv()

logger = logging.getLogger(__name__)

class Settings:
    """Application settings for Claude integration."""
    
    # server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://localhost:5173"
    ).split(",")
    
    # claude configuration
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")
    
    # API parameters
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", 300))
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", 0.3))
    
    # rate limiting
    RATE_LIMIT_PER_MINUTE: int = int(os.getenv("RATE_LIMIT_PER_MINUTE", 60))
    REQUEST_TIMEOUT_SECONDS: int = int(os.getenv("REQUEST_TIMEOUT_SECONDS", 30))
    MAX_CONCURRENT_REQUESTS: int = 10
    
    # retry configuration
    MAX_RETRIES: int = 3
    RETRY_DELAY: int = 2  # seconds
    
    @classmethod
    def validate(cls):
        """Validate required settings."""
        if not cls.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY is required. "
                "Please set it in your .env file."
            )
        
        valid_models = [
            "claude-3-opus-20240229",
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",      # using this
            "claude-2.1",
            "claude-2.0",
            "claude-instant-1.2"
        ]
        
        # check if model is valid
        if cls.CLAUDE_MODEL not in valid_models:
            logger.warning(
                f"Unknown Claude model: {cls.CLAUDE_MODEL}. "
                f"Using default: claude-3-haiku-20240307"
            )
            cls.CLAUDE_MODEL = "claude-3-haiku-20240307"

        logger.info(f"Using Claude model: {cls.CLAUDE_MODEL}") 
        
        return True

settings = Settings()
settings.validate()