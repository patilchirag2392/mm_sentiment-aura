from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import logging
import time
import asyncio
from typing import Callable

logger = logging.getLogger(__name__)

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        
        try:
            # add timeout for slow APIs
            response = await asyncio.wait_for(
                call_next(request),
                timeout=30.0  # 30 second timeout
            )
            
            # add processing time header
            process_time = time.time() - start_time
            response.headers["X-Process-Time"] = str(process_time)
            
            # log slow requests
            if process_time > 5:
                logger.warning(f"Slow request: {request.url.path} took {process_time:.2f}s")
            
            return response
            
        except asyncio.TimeoutError:
            # handle slow API timeout
            logger.error(f"Request timeout: {request.url.path} after 30s")
            return JSONResponse(
                status_code=504,
                content={
                    "error": "timeout",
                    "message": "Claude API took too long to respond",
                    "fallback_data": {
                        "sentiment": {"type": "neutral", "score": 0, "intensity": 0.5},
                        "keywords": [],
                        "emotions": {"joy": 0, "sadness": 0, "anger": 0, "fear": 0, "surprise": 0, "disgust": 0}
                    }
                }
            )
            
        except HTTPException as e:
            # pass through FastAPI HTTP exceptions
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "error": "http_error",
                    "message": e.detail,
                    "status_code": e.status_code
                }
            )
            
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}", exc_info=True)

            return JSONResponse(
                status_code=500,
                content={
                    "error": "internal_error",
                    "message": "An error occurred processing your request",
                    "fallback_data": {
                        "sentiment": {"type": "neutral", "score": 0, "intensity": 0.5},
                        "keywords": [],
                        "emotions": {"joy": 0, "sadness": 0, "anger": 0, "fear": 0, "surprise": 0, "disgust": 0}
                    }
                }
            )

class WebSocketErrorHandler:
    @staticmethod
    async def handle_disconnect(websocket, error: Exception = None):
        if error:
            logger.error(f"WebSocket error: {str(error)}")
        else:
            logger.info("WebSocket disconnected normally")
        
        try:
            await websocket.close()
        except:
            pass
        
        return {
            "status": "disconnected",
            "reconnect": True,
            "message": "Connection lost, please reconnect"
        }
    
    @staticmethod
    def should_reconnect(error: Exception) -> bool:
        # don't reconnect for authentication errors
        if "401" in str(error) or "403" in str(error):
            return False
        # reconnect for network errors
        if "timeout" in str(error).lower() or "connection" in str(error).lower():
            return True
        return True