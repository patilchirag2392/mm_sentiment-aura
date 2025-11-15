export interface DeepgramConfig {
  apiKey?: string; 
  backendUrl?: string; 
}

export interface TranscriptResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
  timestamp: number;
}

export class DeepgramService extends EventTarget {
  private ws: WebSocket | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;
  private reconnectDelay: number = 1000;
  private backendUrl: string;

  constructor(config: DeepgramConfig = {}) {
    super();
    this.backendUrl = config.backendUrl || 'ws://localhost:8000/api/ws/transcribe';
  }

  private emit(eventName: string, data?: any) {
    this.dispatchEvent(new CustomEvent(eventName, { detail: data }));
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(' Connecting to backend WebSocket proxy...');
        console.log(' URL:', this.backendUrl);
        
        this.ws = new WebSocket(this.backendUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log(' Connected to backend WebSocket proxy!');
          console.log('   Backend will handle Deepgram connection with proper auth');
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            console.log(' Message from backend:', data.type);
            
            switch (data.type) {
              case 'connected':
                console.log(' Backend successfully connected to Deepgram!');
                this.isConnected = true;
                this.reconnectAttempts = 0;
                this.emit('connected');
                resolve();
                break;
              
              case 'transcript':
                const result: TranscriptResult = {
                  transcript: data.transcript,
                  isFinal: data.is_final || false,
                  confidence: data.confidence || 0,
                  timestamp: Date.now(),
                };
                console.log(' Transcript:', result.transcript, '| Final:', result.isFinal);
                this.emit('transcript', result);
                break;
              
              case 'speechstarted':
                console.log(' Speech started');
                this.emit('speechStarted');
                break;
              
              case 'speechended':
                console.log(' Speech ended');
                this.emit('speechEnded');
                break;
              
              case 'error':
                console.error(' Backend error:', data.message);
                this.emit('error', new Error(data.message));
                reject(new Error(data.message));
                break;
              
              default:
                console.log(' Unknown message type:', data.type);
            }

          } catch (error) {
            console.error(' Error parsing message from backend:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error(' Backend WebSocket error:', error);
          console.error('   Make sure your backend is running on http://localhost:8000');
          console.error('   Start backend with: cd backend && python main.py');
          this.isConnected = false;
          this.emit('error', error);
          reject(new Error('Failed to connect to backend'));
        };

        this.ws.onclose = (event) => {
          console.log(' Backend WebSocket closed');
          console.log('   Code:', event.code);
          console.log('   Reason:', event.reason || 'No reason provided');
          this.isConnected = false;
          this.emit('disconnected');
          
          if (event.code === 1006) {
            console.error(' Connection closed abnormally');
            console.error('   Possible causes:');
            console.error('   1. Backend server not running (cd backend && python main.py)');
            console.error('   2. Backend failed to connect to Deepgram');
            console.error('   3. Network issues');
            console.error('   4. Deepgram API key invalid or missing in backend/.env');
          } else if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        };

      } catch (error) {
        console.error(' Failed to create WebSocket:', error);
        reject(error);
      }
    });
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(` Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error(' Reconnection failed:', error);
      });
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  sendAudio(audioData: ArrayBuffer): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(audioData);
    } else {
      console.warn(' WebSocket not ready. State:', this.ws?.readyState);
      if (!this.ws) {
        console.warn('   WebSocket is null - connection not established');
      } else {
        const states = {
          0: 'CONNECTING',
          1: 'OPEN',
          2: 'CLOSING',
          3: 'CLOSED'
        };
        console.warn('   Current state:', states[this.ws.readyState as keyof typeof states]);
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      console.log(' Closing backend connection...');
      this.isConnected = false;
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}