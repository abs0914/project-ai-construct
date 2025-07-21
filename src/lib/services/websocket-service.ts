import { API_CONFIG } from '../api-config';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface WebSocketEventHandlers {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onCameraStatus?: (data: any) => void;
  onRecordingUpdate?: (data: any) => void;
  onNetworkUpdate?: (data: any) => void;
  onSecurityAlert?: (data: any) => void;
}

/**
 * WebSocket service for real-time communication with backend
 * Handles live updates for cameras, recordings, network status, and security alerts
 */
class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: WebSocketEventHandlers = {};
  private isConnecting = false;

  /**
   * Connect to WebSocket server
   */
  connect(handlers: WebSocketEventHandlers = {}) {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.handlers = handlers;
    this.isConnecting = true;

    try {
      const token = localStorage.getItem('auth_token');
      const wsUrl = `${API_CONFIG.websocketURL}${token ? `?token=${token}` : ''}`;
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.handlers.onConnect?.();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.handlers.onDisconnect?.();
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.handlers.onError?.(error);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Send message to server
   */
  send(type: string, data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  /**
   * Subscribe to camera updates
   */
  subscribeToCameraUpdates(cameraId?: string) {
    this.send('subscribe', {
      type: 'camera_updates',
      cameraId,
    });
  }

  /**
   * Subscribe to recording updates
   */
  subscribeToRecordingUpdates() {
    this.send('subscribe', {
      type: 'recording_updates',
    });
  }

  /**
   * Subscribe to network updates
   */
  subscribeToNetworkUpdates() {
    this.send('subscribe', {
      type: 'network_updates',
    });
  }

  /**
   * Subscribe to security alerts
   */
  subscribeToSecurityAlerts() {
    this.send('subscribe', {
      type: 'security_alerts',
    });
  }

  /**
   * Get connection status
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: WebSocketMessage) {
    // Call general message handler
    this.handlers.onMessage?.(message);

    // Call specific handlers based on message type
    switch (message.type) {
      case 'camera_status':
        this.handlers.onCameraStatus?.(message.data);
        break;
      case 'recording_update':
        this.handlers.onRecordingUpdate?.(message.data);
        break;
      case 'network_update':
        this.handlers.onNetworkUpdate?.(message.data);
        break;
      case 'security_alert':
        this.handlers.onSecurityAlert?.(message.data);
        break;
      default:
        console.log('Unhandled WebSocket message type:', message.type);
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (this.reconnectAttempts <= this.maxReconnectAttempts) {
        this.connect(this.handlers);
      }
    }, delay);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;
