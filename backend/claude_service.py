import os
import json
import time
import logging
from typing import Dict, Any, Optional
from tenacity import retry, stop_after_attempt, wait_exponential
from anthropic import AsyncAnthropic
import asyncio
from config import settings 

logger = logging.getLogger(__name__)

class ClaudeService:
    def __init__(self):
        """Initialize Claude service."""
        if not settings.ANTHROPIC_API_KEY:
            raise ValueError(
                "ANTHROPIC_API_KEY not configured. "
                "Please set it in your .env file."
            )
        
        # initialize Claude client
        self.client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        self.model = settings.CLAUDE_MODEL
        
        logger.info(f"Initialized Claude service with model: {self.model}")
        
        # log model capabilities
        model_info = {
            "claude-3-opus-20240229": "Most capable, best for complex analysis",
            "claude-3-sonnet-20240229": "Balanced performance and speed",
            "claude-3-haiku-20240307": "Fastest response times"                 # using this
        }
        logger.info(f"Model capability: {model_info.get(self.model, 'Standard')}")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True
    )
    async def process_text(self, text: str) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            logger.info(f"Processing text with Claude: '{text[:50]}...'")
            
            # call Claude API with prompt
            response = await self._call_claude_improved(text)
            
            # parse and validate response
            result = self._parse_claude_response(response)
            
            # add processing metrics
            processing_time = int((time.time() - start_time) * 1000)
            result["processing_time_ms"] = processing_time
            
            logger.info(f"Claude processed text in {processing_time}ms")
            logger.debug(f"Parsed result: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Claude API call failed: {str(e)}", exc_info=True)
            # return fallback response for graceful degradation
            return self._get_fallback_response()
    
    async def _call_claude_improved(self, text: str) -> str:
        try:
            prompt = f"""Analyze this text for sentiment and emotions:
"{text}"

Return a JSON object with:
1. sentiment type (positive/negative/neutral/mixed) and score (-1 to 1)
2. keywords (important words from the text)
3. emotion scores (0 to 1) for joy, sadness, anger, fear, surprise, disgust

Example format:
{{"sentiment": {{"type": "positive", "score": 0.8, "intensity": 0.7}}, "keywords": ["excited", "amazing"], "emotions": {{"joy": 0.8, "sadness": 0.0, "anger": 0.0, "fear": 0.0, "surprise": 0.3, "disgust": 0.0}}}}

JSON Response:"""

            # create message with Claude's preferred format
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=settings.MAX_TOKENS,
                temperature=settings.TEMPERATURE,
                messages=[
                    {
                        "role": "user",
                        "content": prompt
                    }
                ]
            )
            
            # extract text from Claude's response
            if message.content and len(message.content) > 0:
                response_text = message.content[0].text
                logger.info(f"Claude raw response received, length: {len(response_text)}")
                logger.debug(f"Claude response: {response_text[:500]}...")
                return response_text
            else:
                logger.error("Empty response from Claude")
                return "{}"
                
        except Exception as e:
            logger.error(f"Claude API error: {str(e)}")
            raise

    def _parse_claude_response(self, response_text: str) -> Dict[str, Any]:
        """
        Parse and validate Claude's response with improved parsing.
        """
        try:
            # clean response
            cleaned = response_text.strip()
            
            # try to find JSON in the response
            # look for JSON object pattern
            json_patterns = [
                (cleaned.find('{'), cleaned.rfind('}') + 1),  # Raw JSON
                (cleaned.find('```json') + 7 if '```json' in cleaned else -1, 
                 cleaned.find('```', cleaned.find('```json') + 7) if '```json' in cleaned else -1),  # Markdown JSON
                (cleaned.find('```') + 3 if '```' in cleaned else -1,
                 cleaned.find('```', cleaned.find('```') + 3) if '```' in cleaned else -1),  # Generic markdown
            ]
            
            json_str = None
            for start, end in json_patterns:
                if start >= 0 and end > start:
                    potential_json = cleaned[start:end].strip()
                    try:
                        # try to parse it
                        test_parse = json.loads(potential_json)
                        json_str = potential_json
                        break
                    except:
                        continue
            
            if not json_str:
                json_str = cleaned
            
            # parse JSON
            data = json.loads(json_str)
            logger.info(f"Successfully parsed Claude response")
            
            # validate and structure response
            result = {
                "sentiment": self._validate_sentiment(data.get("sentiment", {})),
                "keywords": self._validate_keywords(data.get("keywords", [])),
                "emotions": self._validate_emotions(data.get("emotions", {})),
                "timestamp": int(time.time() * 1000)
            }
            
            # log the parsed sentiment for debugging
            logger.info(f"Parsed sentiment: {result['sentiment']}")
            logger.info(f"Parsed keywords: {result['keywords'][:3]}...")
            
            return result
            
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            logger.error(f"Failed to parse Claude response: {str(e)}")
            logger.error(f"Response text: {response_text[:500]}...")
            
            # try to extract some meaning even if JSON parsing fails
            response_lower = response_text.lower()
            
            # simple heuristic fallback
            sentiment_type = "neutral"
            sentiment_score = 0.0
            
            # check for positive indicators
            positive_words = ["thrilled", "excited", "happy", "great", "amazing", "wonderful", "excellent", "fantastic", "love", "incredible"]
            negative_words = ["sad", "angry", "frustrated", "terrible", "awful", "hate", "horrible", "bad", "disappointed"]
            
            positive_count = sum(1 for word in positive_words if word in response_lower)
            negative_count = sum(1 for word in negative_words if word in response_lower)
            
            if positive_count > negative_count:
                sentiment_type = "positive"
                sentiment_score = min(1.0, positive_count * 0.3)
            elif negative_count > positive_count:
                sentiment_type = "negative"
                sentiment_score = max(-1.0, -negative_count * 0.3)
            
            # extract keywords from the original text
            import re
            words = re.findall(r'\b[A-Za-z]+\b', text[:100] if 'text' in locals() else response_text[:100])
            keywords = [w for w in words if len(w) > 4][:5]
            
            return {
                "sentiment": {
                    "type": sentiment_type,
                    "score": sentiment_score,
                    "intensity": abs(sentiment_score)
                },
                "keywords": keywords,
                "emotions": {
                    "joy": max(0, sentiment_score) if sentiment_score > 0 else 0.0,
                    "sadness": abs(sentiment_score) if sentiment_score < 0 else 0.0,
                    "anger": 0.0,
                    "fear": 0.0,
                    "surprise": 0.1,
                    "disgust": 0.0
                },
                "timestamp": int(time.time() * 1000),
                "is_fallback": True
            }

    def _validate_sentiment(self, sentiment_data: Dict) -> Dict[str, Any]:
        """Validate and normalize sentiment data from Claude."""
        valid_types = ["positive", "negative", "neutral", "mixed"]
        sentiment_type = sentiment_data.get("type", "neutral")
        
        if sentiment_type not in valid_types:
            sentiment_type = "neutral"
        
        score = sentiment_data.get("score", 0.0)
        try:
            score = float(score)
        except (TypeError, ValueError):
            score = 0.0
        
        intensity = sentiment_data.get("intensity", abs(score))
        try:
            intensity = float(intensity)
        except (TypeError, ValueError):
            intensity = 0.5
            
        return {
            "type": sentiment_type,
            "score": max(-1.0, min(1.0, score)),
            "intensity": max(0.0, min(1.0, intensity))
        }

    def _validate_keywords(self, keywords: Any) -> list:
        """Validate and limit keywords from Claude."""
        if not keywords:
            return []
            
        if not isinstance(keywords, list):
            # Try to convert string to list
            if isinstance(keywords, str):
                keywords = keywords.split(',')
            else:
                return []
        
        # clean and limit to 10 keywords
        cleaned = []
        for keyword in keywords[:10]:
            if isinstance(keyword, str) and keyword.strip():
                # remove any quotes or special characters
                clean_keyword = keyword.strip().strip('"\'').strip()
                if clean_keyword and len(clean_keyword) > 1:
                    cleaned.append(clean_keyword)
        
        return cleaned

    def _validate_emotions(self, emotions_data: Any) -> Dict[str, float]:
        """Validate emotion scores from Claude."""
        default_emotions = {
            "joy": 0.0,
            "sadness": 0.0,
            "anger": 0.0,
            "fear": 0.0,
            "surprise": 0.0,
            "disgust": 0.0
        }
        
        if not isinstance(emotions_data, dict):
            return default_emotions
        
        # validate each emotion score
        for emotion in default_emotions.keys():
            if emotion in emotions_data:
                try:
                    value = float(emotions_data[emotion])
                    default_emotions[emotion] = max(0.0, min(1.0, value))
                except (TypeError, ValueError):
                    pass  # keep default 0.0
        
        return default_emotions

    def _get_fallback_response(self) -> Dict[str, Any]:
        """
        Fallback response for error cases.
        Ensures frontend always receives valid data structure.
        Critical for graceful degradation when Claude API fails.
        """
        return {
            "sentiment": {
                "type": "neutral",
                "score": 0.0,
                "intensity": 0.5
            },
            "keywords": ["analysis", "pending"],
            "emotions": {
                "joy": 0.0,
                "sadness": 0.0,
                "anger": 0.0,
                "fear": 0.0,
                "surprise": 0.0,
                "disgust": 0.0
            },
            "timestamp": int(time.time() * 1000),
            "processing_time_ms": 0,
            "is_fallback": True
        }

# singleton instance
_claude_service_instance: Optional[ClaudeService] = None

def get_claude_service() -> ClaudeService:
    """Get or create Claude service singleton."""
    global _claude_service_instance
    if _claude_service_instance is None:
        _claude_service_instance = ClaudeService()
    return _claude_service_instance