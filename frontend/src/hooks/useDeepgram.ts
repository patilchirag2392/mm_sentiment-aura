import { useState, useEffect, useCallback, useRef } from 'react';
import { DeepgramService, TranscriptResult } from '../services/deepgramService';

interface UseDeepgramReturn {
  isConnected: boolean;
  transcript: string;
  interimTranscript: string;
  fullTranscript: string[];
  error: string | null;
  connectDeepgram: () => Promise<void>;
  disconnectDeepgram: () => void;
  sendAudioToDeepgram: (audioData: ArrayBuffer) => void;
  clearTranscripts: () => void;
}

export const useDeepgram = (): UseDeepgramReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const deepgramRef = useRef<DeepgramService | null>(null);
  const currentSentence = useRef<string>('');

  const connectDeepgram = useCallback(async () => {
    try {
      const apiKey = process.env.REACT_APP_DEEPGRAM_API_KEY;
      
      if (!apiKey) {
        throw new Error('Deepgram API key not configured');
      }

      deepgramRef.current = new DeepgramService({ apiKey });

      const handleConnected = () => {
        setIsConnected(true);
        setError(null);
        console.log('Ready for transcription');
      };

      const handleTranscript = (event: CustomEvent<TranscriptResult>) => {
        const result = event.detail;
        if (result.isFinal) {
          const finalText = result.transcript.trim();
          if (finalText) {
            setTranscript(finalText);
            setFullTranscript(prev => [...prev, finalText]);
            setInterimTranscript('');
            currentSentence.current = '';
          }
        } else {
          setInterimTranscript(result.transcript);
          currentSentence.current = result.transcript;
        }
      };

      const handleSpeechStarted = () => {
        console.log('Speech detected');
      };

      const handleSpeechEnded = () => {
        console.log('Speech ended');
      };

      const handleError = (event: CustomEvent) => {
        console.error('Deepgram error:', event.detail);
        setError('Transcription service error');
      };

      const handleDisconnected = () => {
        setIsConnected(false);
      };

      deepgramRef.current.addEventListener('connected', handleConnected as EventListener);
      deepgramRef.current.addEventListener('transcript', handleTranscript as EventListener);
      deepgramRef.current.addEventListener('speechStarted', handleSpeechStarted as EventListener);
      deepgramRef.current.addEventListener('speechEnded', handleSpeechEnded as EventListener);
      deepgramRef.current.addEventListener('error', handleError as EventListener);
      deepgramRef.current.addEventListener('disconnected', handleDisconnected as EventListener);

      await deepgramRef.current.connect();
      
    } catch (error) {
      console.error('Failed to connect to Deepgram:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect to Deepgram');
      setIsConnected(false);
    }
  }, []);

  const disconnectDeepgram = useCallback(() => {
    if (deepgramRef.current) {
      deepgramRef.current.disconnect();
      deepgramRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendAudioToDeepgram = useCallback((audioData: ArrayBuffer) => {
    if (deepgramRef.current && isConnected) {
      deepgramRef.current.sendAudio(audioData);
    }
  }, [isConnected]);

  const clearTranscripts = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setFullTranscript([]);
    currentSentence.current = '';
  }, []);

  useEffect(() => {
    return () => {
      disconnectDeepgram();
    };
  }, [disconnectDeepgram]);

  return {
    isConnected,
    transcript,
    interimTranscript,
    fullTranscript,
    error,
    connectDeepgram,
    disconnectDeepgram,
    sendAudioToDeepgram,
    clearTranscripts,
  };
};