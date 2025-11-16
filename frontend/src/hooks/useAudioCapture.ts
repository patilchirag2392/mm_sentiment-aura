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
  const workletNodeRef = useRef<AudioWorkletNode | MediaRecorder | null>(null);
  const streamCallbackRef = useRef<((data: ArrayBuffer) => void) | null>(null);
  const isStreamingRef = useRef<boolean>(false);

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
      console.log(' Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        }
      });

      console.log(' Microphone access granted');

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000
      });

      console.log(` AudioContext created at ${audioContext.sampleRate}Hz`);

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

      console.log(' Audio initialized successfully');

      return stream;
    } catch (error) {
      console.error(' Audio initialization error:', error);
      setAudioState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Microphone access denied',
        isInitialized: false,
      }));
      throw error;
    }
  }, []);

  const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  };

  const startAudioStreamingWithWorklet = useCallback(async (callback: (audioData: ArrayBuffer) => void) => {
    if (!audioContextRef.current || !sourceRef.current) {
      console.error(' Audio not initialized');
      return false;
    }

    try {
      streamCallbackRef.current = callback;
      isStreamingRef.current = true;

      const processorName = `audio-processor-${Date.now()}`;

      const workletCode = `
        class AudioProcessor extends AudioWorkletProcessor {
          process(inputs, outputs, parameters) {
            const input = inputs[0];
            if (input.length > 0) {
              const channelData = input[0];
              
              // Convert Float32Array to Int16Array
              const int16Data = new Int16Array(channelData.length);
              for (let i = 0; i < channelData.length; i++) {
                const s = Math.max(-1, Math.min(1, channelData[i]));
                int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              
              // Send to main thread
              this.port.postMessage(int16Data.buffer, [int16Data.buffer]);
            }
            return true;
          }
        }
        registerProcessor('audio-processor', AudioProcessor);
      `;

      const blob = new Blob([workletCode], { type: 'application/javascript' });
      const workletUrl = URL.createObjectURL(blob);

      await audioContextRef.current.audioWorklet.addModule(workletUrl);
      
      const workletNode = new AudioWorkletNode(audioContextRef.current, 'audio-processor');
      
      let chunkCount = 0;
      workletNode.port.onmessage = (event) => {
        if (streamCallbackRef.current && isStreamingRef.current) {
          chunkCount++;
          
          if (chunkCount % 20 === 0) {
            console.log(` Audio chunk #${chunkCount}: ${event.data.byteLength} bytes`);
          }
          
          streamCallbackRef.current(event.data);
        }
      };

      sourceRef.current.connect(workletNode);
      workletNode.connect(audioContextRef.current.destination);
      
      workletNodeRef.current = workletNode;
      
      console.log('🎵 Audio streaming started (AudioWorklet)');
      console.log(`   Sample rate: ${audioContextRef.current.sampleRate}Hz`);
      console.log(`   Format: PCM 16-bit linear`);
      
      URL.revokeObjectURL(workletUrl);
      return true;

    } catch (error) {
      console.warn('  AudioWorklet not supported, will use fallback');
      return false;
    }
  }, []);

  const startAudioStreamingWithMediaRecorder = useCallback((callback: (audioData: ArrayBuffer) => void) => {
    if (!mediaStreamRef.current) {
      console.error(' Audio not initialized');
      return;
    }

    streamCallbackRef.current = callback;
    isStreamingRef.current = true;

    const mediaRecorder = new MediaRecorder(mediaStreamRef.current, {
      mimeType: 'audio/webm;codecs=opus',
      audioBitsPerSecond: 16000
    });

    let chunkCount = 0;
    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0 && streamCallbackRef.current && isStreamingRef.current) {
        chunkCount++;
        
        const arrayBuffer = await event.data.arrayBuffer();
        
        if (chunkCount % 20 === 0) {
          console.log(` Audio chunk #${chunkCount}: ${arrayBuffer.byteLength} bytes`);
        }
        
        streamCallbackRef.current(arrayBuffer);
      }
    };

    mediaRecorder.start(250);
    workletNodeRef.current = mediaRecorder as any; 

    console.log('🎵 Audio streaming started (MediaRecorder fallback)');
    console.log(`   Format: WebM/Opus`);
    console.log(`   Note: Using fallback method, may not be optimal for Deepgram`);
  }, []);

  const startAudioStreaming = useCallback(async (callback: (audioData: ArrayBuffer) => void) => {
    const workletSuccess = await startAudioStreamingWithWorklet(callback);
    
    if (!workletSuccess) {
      startAudioStreamingWithMediaRecorder(callback);
    }
  }, [startAudioStreamingWithWorklet, startAudioStreamingWithMediaRecorder]);

  const stopAudioStreaming = useCallback(() => {
    isStreamingRef.current = false;
    
    if (workletNodeRef.current) {
      if (workletNodeRef.current instanceof AudioWorkletNode) {
        workletNodeRef.current.disconnect();
      } else if (workletNodeRef.current instanceof MediaRecorder) {
        (workletNodeRef.current as MediaRecorder).stop();
      }
      workletNodeRef.current = null;
    }
    
    streamCallbackRef.current = null;
    console.log(' Audio streaming stopped');
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
        console.log('  AudioContext resumed');
      }

      setAudioState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
      }));

      monitorAudioLevel();
      
      console.log(' Recording started');
    } catch (error) {
      console.error(' Start recording error:', error);
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
    
    console.log(' Recording stopped');
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