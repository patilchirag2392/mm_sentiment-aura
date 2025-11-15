from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from contextlib import asynccontextmanager
import uvicorn
import logging
import os

# load env vars
load_dotenv()

# configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

import endpoints
from config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    logger.info("Starting up the Sentiment Aura backend...")
    logger.info("AI Provider: Anthropic Claude")
    logger.info("This is a proxy service")

    # validate settings
    try:
        settings.validate()
        logger.info("Configuration settings validated successfully.")
    except ValueError as e:
        logger.error(f"Configuration error: {e}")

    yield
    logger.info("Shutting down the Sentiment Aura backend...")

# initialize FastAPI app
app = FastAPI(
    title="Sentiment Aura Backend",
    description="Backend service for Sentiment Aura application",
    version="1.0.0",
    lifespan=lifespan
)

# configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)

@app.get("/")
async def root():
    """Root endpoint with service info."""
    return {
        "service": "Sentiment Aura Backend",
        "type": "proxy-service",
        "ai_provider": "anthropic",
        "status": "operational",
        "endpoints": {
            "health": "/api/health",
            "process_text": "/api/process_text (POST)",
            "status": "/api/status",
            "models": "/api/models",
            "docs": "/docs"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "sentiment-aura-backend",
        "ai_provider": "anthropic-claude",
        "type": "proxy-only-no-local-nlp"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )

