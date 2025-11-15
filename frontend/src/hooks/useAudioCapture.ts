import { useState, useCallback, useRef, useEffect } from 'react';

export interface AudioState {
  isRecording: boolean;
  isInitialized: boolean;
  audioLevel: number;
  error: string | null;
}

export const useAudioCapture = () => {
  const [audioState, setAudioState] = useState<AudioState>({
    isRecording: false,
    isInitialized: false,
    audioLevel: 0,
    error: null,
  });

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamCallbackRef = useRef<((data: ArrayBuffer) => void) | null>(null);

  const monitorAudioLevel = useCallback(() => {
    if (!analyzerRef.current || !audioState.isRecording) return;

    const analyzer = analyzerRef.current;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);

    let sum = 0;
    const relevantFrequencies = dataArray.slice(4, 40);
    relevantFrequencies.forEach((value) => {
      sum += value * value;
    });
    const rms = Math.sqrt(sum / relevantFrequencies.length);
    const normalizedLevel = Math.min(rms / 128, 1);

    setAudioState(prev => ({
      ...prev,
      audioLevel: prev.audioLevel * 0.7 + normalizedLevel * 0.3,
    }));

    animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
  }, [audioState.isRecording]);

  const initializeAudio = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, 
        }
      });

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.3;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyzer);

      mediaStreamRef.current = stream;
      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;
      sourceRef.current = source;

      setAudioState(prev => ({
        ...prev,
        isInitialized: true,
        error: null,
      }));

      return stream;
    } catch (error) {
      console.error('Audio initialization error:', error);
      setAudioState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Microphone access denied',
        isInitialized: false,
      }));
      throw error;
    }
  }, []);

  const startAudioStreaming = useCallback((callback: (audioData: ArrayBuffer) => void) => {
    if (!mediaStreamRef.current) {
      console.error('Audio not initialized');
      return;
    }

    streamCallbackRef.current = callback;

    const options = {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    };

    if (!MediaRecorder.isTypeSupported(options.mimeType)) {
      options.mimeType = 'audio/webm';
    }

    try {
      const mediaRecorder = new MediaRecorder(mediaStreamRef.current, options);
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && streamCallbackRef.current) {
          const arrayBuffer = await event.data.arrayBuffer();
          streamCallbackRef.current(arrayBuffer);
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };

      mediaRecorder.start(100); 
      mediaRecorderRef.current = mediaRecorder;
      
      console.log('Audio streaming started');
    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      
      startAlternativeStreaming(callback);
    }
  }, []);

  const startAlternativeStreaming = useCallback((callback: (audioData: ArrayBuffer) => void) => {
    if (!mediaStreamRef.current || !audioContextRef.current) {
      console.error('Audio not initialized for alternative streaming');
      return;
    }

    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(mediaStreamRef.current);
    
    const bufferSize = 2048;
    const dataArray = new Float32Array(bufferSize);
    
    const processAudio = () => {
      if (!analyzerRef.current || !audioState.isRecording) return;
      
      analyzerRef.current.getFloatTimeDomainData(dataArray);
      
      const int16Array = new Int16Array(bufferSize);
      for (let i = 0; i < dataArray.length; i++) {
        const s = Math.max(-1, Math.min(1, dataArray[i]));
        int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      callback(int16Array.buffer);
      
      if (audioState.isRecording) {
        setTimeout(processAudio, 100); 
      }
    };
    
    processAudio();
  }, [audioState.isRecording]);

  const stopAudioStreaming = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    streamCallbackRef.current = null;
    console.log('Audio streaming stopped');
  }, []);

  const startRecording = useCallback(async () => {
    if (audioState.isRecording) return;

    try {
      let stream = mediaStreamRef.current;
      
      if (!stream) {
        stream = await initializeAudio();
      }

      if (audioContextRef.current?.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      setAudioState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      monitorAudioLevel();
    } catch (error) {
      console.error('Start recording error:', error);
      setAudioState(prev => ({
        ...prev,
        error: 'Failed to start recording',
      }));
    }
  }, [audioState.isRecording, initializeAudio, monitorAudioLevel]);

  const stopRecording = useCallback(() => {
    if (!audioState.isRecording) return;

    stopAudioStreaming();

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    let fadeLevel = audioState.audioLevel;
    const fadeOut = () => {
      fadeLevel *= 0.9;
      if (fadeLevel > 0.01) {
        setAudioState(prev => ({ ...prev, audioLevel: fadeLevel }));
        requestAnimationFrame(fadeOut);
      } else {
        setAudioState(prev => ({
          ...prev,
          isRecording: false,
          audioLevel: 0,
        }));
      }
    };
    fadeOut();
  }, [audioState.isRecording, audioState.audioLevel, stopAudioStreaming]);

  useEffect(() => {
    return () => {
      stopAudioStreaming();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopAudioStreaming]);

  const getFrequencyData = useCallback((): Uint8Array => {
    if (!analyzerRef.current) return new Uint8Array(128);
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  const getWaveformData = useCallback((): Uint8Array => {
    if (!analyzerRef.current) return new Uint8Array(128);
    
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteTimeDomainData(dataArray);
    return dataArray;
  }, []);

  return {
    audioState,
    startRecording,
    stopRecording,
    getFrequencyData,
    getWaveformData,
    startAudioStreaming,
    stopAudioStreaming,
    mediaStream: mediaStreamRef.current,
  };
};