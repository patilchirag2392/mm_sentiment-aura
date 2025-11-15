export interface DeepgramConfig {
  apiKey: string;
  model?: string;
  language?: string;
  punctuate?: boolean;
  interimResults?: boolean;
  endpointing?: boolean;
}

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export class DeepgramService extends EventTarget {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(config: DeepgramConfig) {
    super();
    this.apiKey = config.apiKey;
  }

  private emit(eventName: string, data?: any) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const params = new URLSearchParams({
          model: 'nova-2',
          language: 'en-US',
          punctuate: 'true',
          interim_results: 'true',
          endpointing: '300',
          vad_events: 'true',
          smart_format: 'true',
        });

        const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
        
        this.ws = new WebSocket(wsUrl, {
          headers: {
            Authorization: `Token ${this.apiKey}`,
          },
        } as any);

        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('Deepgram WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.channel && data.channel.alternatives) {
              const alternative = data.channel.alternatives[0];
              if (alternative.transcript && alternative.transcript.trim() !== '') {
                const result: TranscriptResult = {
                  transcript: alternative.transcript,
                  isFinal: data.is_final || false,
                  confidence: alternative.confidence || 0,
                  timestamp: Date.now(),
                };
                
                this.emit('transcript', result);
                
                if (process.env.REACT_APP_DEBUG === 'true') {
                  console.log('Transcript:', result.transcript, 'Final:', result.isFinal);
                }
              }
            }

            if (data.type === 'SpeechStarted') {
              this.emit('speechStarted');
            } else if (data.type === 'SpeechEnded') {
              this.emit('speechEnded');
            }

          } catch (error) {
            console.error('Error parsing Deepgram message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('Deepgram WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('Deepgram WebSocket closed:', event.code, event.reason);
          this.isConnected = false;
          this.emit('disconnected');
          
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

      } catch (error) {
        console.error('Failed to connect to Deepgram:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    } else {
      console.warn('WebSocket not ready for audio data');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}