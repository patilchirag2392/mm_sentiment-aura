from fastapi import WebSocket, WebSocketDisconnect
import asyncio
import websockets
import json
import logging
import os

logger = logging.getLogger(__name__)

DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")


async def websocket_transcribe_handler(websocket: WebSocket):
    """
    WebSocket proxy endpoint for Deepgram transcription.
    Frontend connects here, and we proxy to Deepgram with proper authentication.
    """
    await websocket.accept()
    logger.info("🔌 Frontend WebSocket connected")
    
    if not DEEPGRAM_API_KEY:
        logger.error("Deepgram API key not configured")
        await websocket.send_json({
            "type": "error",
            "message": "Deepgram API key not configured on backend"
        })
        await websocket.close()
        return

    deepgram_url = (
        "wss://api.deepgram.com/v1/listen"
        "?model=nova-2"
        "&language=en-US"
        "&punctuate=true"
        "&interim_results=true"
        "&endpointing=300"
        "&vad_events=true"
        "&smart_format=true"
        "&encoding=linear16"
        "&sample_rate=16000"
        "&channels=1"
    )
    
    headers = {
        "Authorization": f"Token {DEEPGRAM_API_KEY}"
    }
    
    logger.info("Connecting to Deepgram...")
    logger.info(f"   Using API key: {DEEPGRAM_API_KEY[:10]}...")
    
    try:
        async with websockets.connect(
            deepgram_url,
            extra_headers=headers
        ) as deepgram_ws:
            logger.info(" Connected to Deepgram successfully!")
            
            await websocket.send_json({
                "type": "connected",
                "message": "Deepgram connection established"
            })
            
            async def forward_audio_to_deepgram():
                """Forward audio from frontend to Deepgram"""
                audio_chunk_count = 0
                total_bytes = 0
                try:
                    while True:
                        audio_data = await websocket.receive_bytes()
                        audio_chunk_count += 1
                        total_bytes += len(audio_data)
                        
                        if audio_chunk_count == 1:
                            logger.info(f" First audio chunk: {len(audio_data)} bytes")
                            logger.info(f"   Expected: 8192 bytes for 16kHz PCM")
                            if len(audio_data) < 1000:
                                logger.warning(f"  Chunk size is very small! Audio might not be formatted correctly.")
                        
                        if audio_chunk_count % 20 == 0:
                            avg_bytes = total_bytes / audio_chunk_count
                            logger.info(f" Audio chunk #{audio_chunk_count} ({len(audio_data)} bytes, avg: {avg_bytes:.0f} bytes)")
                        
                        await deepgram_ws.send(audio_data)
                except WebSocketDisconnect:
                    logger.info(f" Frontend disconnected (sent {audio_chunk_count} chunks, {total_bytes} bytes total)")
                except Exception as e:
                    logger.error(f" Error forwarding audio: {e}")
            
            async def forward_transcripts_to_frontend():
                """Forward transcripts from Deepgram to frontend"""
                try:
                    async for message in deepgram_ws:
                        try:
                            data = json.loads(message)
                            
                            if not hasattr(forward_transcripts_to_frontend, 'logged_structure'):
                                logger.info(f" Deepgram response structure: {list(data.keys())}")
                                forward_transcripts_to_frontend.logged_structure = True
                            
                            if "channel" in data and isinstance(data["channel"], dict):
                                alternatives = data["channel"].get("alternatives", [])
                                if alternatives and len(alternatives) > 0:
                                    first_alternative = alternatives[0]
                                    if isinstance(first_alternative, dict) and first_alternative.get("transcript"):
                                        transcript_text = first_alternative["transcript"]
                                        if transcript_text.strip():
                                            transcript_data = {
                                                "type": "transcript",
                                                "transcript": transcript_text,
                                                "is_final": data.get("is_final", False),
                                                "confidence": first_alternative.get("confidence", 0)
                                            }
                                            await websocket.send_json(transcript_data)
                                            
                                            emoji = "✅" if transcript_data['is_final'] else "💭"
                                            logger.info(f"{emoji} Transcript: '{transcript_text[:50]}{'...' if len(transcript_text) > 50 else ''}' (final: {transcript_data['is_final']})")
                            
                            elif data.get("type") in ["SpeechStarted", "SpeechEnded"]:
                                await websocket.send_json({
                                    "type": data["type"].lower(),
                                    "message": data["type"]
                                })
                                logger.info(f"  {data['type']}")
                            
                            elif data.get("type") == "Metadata":
                                logger.info("ℹ  Metadata received from Deepgram")
                            
                            elif data.get("type") == "UtteranceEnd":
                                logger.info(" UtteranceEnd received")
                            
                            else:
                                logger.debug(f"  Unexpected message type: {data.get('type', 'unknown')}")
                                
                        except json.JSONDecodeError as e:
                            logger.error(f" Failed to parse JSON from Deepgram: {e}")
                        except Exception as e:
                            logger.error(f" Error processing Deepgram message: {e}")
                            if 'data' in locals():
                                logger.error(f"   Message keys: {list(data.keys()) if isinstance(data, dict) else 'not a dict'}")
                            
                except Exception as e:
                    logger.error(f" Error in message loop: {e}")
            
            await asyncio.gather(
                forward_audio_to_deepgram(),
                forward_transcripts_to_frontend()
            )
            
    except websockets.exceptions.WebSocketException as e:
        error_message = f"Failed to connect to Deepgram: {str(e)}"
        logger.error(f" {error_message}")
        await websocket.send_json({
            "type": "error",
            "message": error_message
        })
        await websocket.close()
    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        logger.error(f" {error_message}")
        await websocket.send_json({
            "type": "error",
            "message": error_message
        })
        await websocket.close()