const soap = require('soap');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * ONVIF SOAP Client for camera communication
 * Implements ONVIF Profile S, T, and G specifications
 */
class ONVIFClient {
  constructor(options = {}) {
    this.host = options.host;
    this.port = options.port || 80;
    this.username = options.username;
    this.password = options.password;
    this.timeout = options.timeout || 10000;
    
    // Service clients
    this.deviceClient = null;
    this.mediaClient = null;
    this.ptzClient = null;
    this.imagingClient = null;
    this.eventsClient = null;
    this.analyticsClient = null;
    
    // Device information
    this.deviceInfo = null;
    this.capabilities = null;
    this.profiles = [];
    
    // Base URLs
    this.baseUrl = `http://${this.host}:${this.port}`;
    this.serviceUrls = {};
  }

  /**
   * Initialize ONVIF client and discover services
   */
  async initialize() {
    try {
      console.log(`Initializing ONVIF client for ${this.host}:${this.port}`);
      
      // Connect to device service first
      await this.connectDeviceService();
      
      // Get device information
      this.deviceInfo = await this.getDeviceInformation();
      
      // Get device capabilities
      this.capabilities = await this.getCapabilities();
      
      // Connect to other services based on capabilities
      await this.connectServices();
      
      // Get media profiles
      if (this.mediaClient) {
        this.profiles = await this.getProfiles();
      }
      
      console.log(`ONVIF client initialized for ${this.deviceInfo?.Manufacturer} ${this.deviceInfo?.Model}`);
      return true;
      
    } catch (error) {
      console.error('Failed to initialize ONVIF client:', error);
      throw error;
    }
  }

  /**
   * Connect to ONVIF device service
   */
  async connectDeviceService() {
    const deviceUrl = `${this.baseUrl}/onvif/device_service`;
    
    try {
      this.deviceClient = await soap.createClientAsync(deviceUrl, {
        wsdl_options: { timeout: this.timeout },
        endpoint: deviceUrl
      });
      
      this.addSecurity(this.deviceClient);
      console.log('Connected to ONVIF device service');
      
    } catch (error) {
      // Try alternative URLs
      const alternativeUrls = [
        `${this.baseUrl}/onvif/Device`,
        `${this.baseUrl}/device_service`,
        `${this.baseUrl}/Device`
      ];
      
      for (const url of alternativeUrls) {
        try {
          this.deviceClient = await soap.createClientAsync(url, {
            wsdl_options: { timeout: this.timeout },
            endpoint: url
          });
          
          this.addSecurity(this.deviceClient);
          console.log(`Connected to ONVIF device service at ${url}`);
          return;
          
        } catch (altError) {
          continue;
        }
      }
      
      throw new Error(`Failed to connect to device service: ${error.message}`);
    }
  }

  /**
   * Add WS-Security authentication to SOAP client
   */
  addSecurity(client) {
    if (this.username && this.password) {
      const timestamp = new Date().toISOString();
      const nonce = crypto.randomBytes(16).toString('base64');
      const created = timestamp;
      
      // Create password digest
      const nonceBuffer = Buffer.from(nonce, 'base64');
      const createdBuffer = Buffer.from(created, 'utf8');
      const passwordBuffer = Buffer.from(this.password, 'utf8');
      
      const digest = crypto.createHash('sha1')
        .update(Buffer.concat([nonceBuffer, createdBuffer, passwordBuffer]))
        .digest('base64');

      const security = {
        UsernameToken: {
          Username: this.username,
          Password: {
            _: digest,
            $: { Type: 'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-username-token-profile-1.0#PasswordDigest' }
          },
          Nonce: nonce,
          Created: created
        }
      };

      client.setSecurity(new soap.WSSecurity(this.username, this.password, {
        passwordType: 'PasswordDigest',
        hasTimeStamp: true,
        hasTokenCreated: true,
        hasNonce: true
      }));
    }
  }

  /**
   * Get device information
   */
  async getDeviceInformation() {
    try {
      const result = await this.deviceClient.GetDeviceInformationAsync({});
      return result[0];
    } catch (error) {
      console.error('Failed to get device information:', error);
      return null;
    }
  }

  /**
   * Get device capabilities
   */
  async getCapabilities() {
    try {
      const result = await this.deviceClient.GetCapabilitiesAsync({
        Category: ['All']
      });
      
      const capabilities = result[0]?.Capabilities;
      
      // Store service URLs
      if (capabilities?.Media?.XAddr) {
        this.serviceUrls.media = capabilities.Media.XAddr;
      }
      if (capabilities?.PTZ?.XAddr) {
        this.serviceUrls.ptz = capabilities.PTZ.XAddr;
      }
      if (capabilities?.Imaging?.XAddr) {
        this.serviceUrls.imaging = capabilities.Imaging.XAddr;
      }
      if (capabilities?.Events?.XAddr) {
        this.serviceUrls.events = capabilities.Events.XAddr;
      }
      if (capabilities?.Analytics?.XAddr) {
        this.serviceUrls.analytics = capabilities.Analytics.XAddr;
      }
      
      return capabilities;
      
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      return null;
    }
  }

  /**
   * Connect to additional ONVIF services
   */
  async connectServices() {
    // Connect to Media service
    if (this.serviceUrls.media) {
      try {
        this.mediaClient = await soap.createClientAsync(this.serviceUrls.media, {
          wsdl_options: { timeout: this.timeout }
        });
        this.addSecurity(this.mediaClient);
        console.log('Connected to ONVIF media service');
      } catch (error) {
        console.warn('Failed to connect to media service:', error.message);
      }
    }

    // Connect to PTZ service
    if (this.serviceUrls.ptz) {
      try {
        this.ptzClient = await soap.createClientAsync(this.serviceUrls.ptz, {
          wsdl_options: { timeout: this.timeout }
        });
        this.addSecurity(this.ptzClient);
        console.log('Connected to ONVIF PTZ service');
      } catch (error) {
        console.warn('Failed to connect to PTZ service:', error.message);
      }
    }

    // Connect to Imaging service
    if (this.serviceUrls.imaging) {
      try {
        this.imagingClient = await soap.createClientAsync(this.serviceUrls.imaging, {
          wsdl_options: { timeout: this.timeout }
        });
        this.addSecurity(this.imagingClient);
        console.log('Connected to ONVIF imaging service');
      } catch (error) {
        console.warn('Failed to connect to imaging service:', error.message);
      }
    }

    // Connect to Events service
    if (this.serviceUrls.events) {
      try {
        this.eventsClient = await soap.createClientAsync(this.serviceUrls.events, {
          wsdl_options: { timeout: this.timeout }
        });
        this.addSecurity(this.eventsClient);
        console.log('Connected to ONVIF events service');
      } catch (error) {
        console.warn('Failed to connect to events service:', error.message);
      }
    }
  }

  /**
   * Get media profiles
   */
  async getProfiles() {
    if (!this.mediaClient) return [];

    try {
      const result = await this.mediaClient.GetProfilesAsync({});
      const profiles = result[0]?.Profiles || [];
      
      console.log(`Found ${profiles.length} media profiles`);
      return Array.isArray(profiles) ? profiles : [profiles];
      
    } catch (error) {
      console.error('Failed to get profiles:', error);
      return [];
    }
  }

  /**
   * Get stream URI for a profile
   */
  async getStreamUri(profileToken, protocol = 'RTSP') {
    if (!this.mediaClient) throw new Error('Media client not available');

    try {
      const result = await this.mediaClient.GetStreamUriAsync({
        StreamSetup: {
          Stream: 'RTP-Unicast',
          Transport: {
            Protocol: protocol
          }
        },
        ProfileToken: profileToken
      });

      return result[0]?.MediaUri?.Uri;
      
    } catch (error) {
      console.error('Failed to get stream URI:', error);
      throw error;
    }
  }

  /**
   * Get snapshot URI
   */
  async getSnapshotUri(profileToken) {
    if (!this.mediaClient) throw new Error('Media client not available');

    try {
      const result = await this.mediaClient.GetSnapshotUriAsync({
        ProfileToken: profileToken
      });

      return result[0]?.MediaUri?.Uri;
      
    } catch (error) {
      console.error('Failed to get snapshot URI:', error);
      throw error;
    }
  }

  /**
   * PTZ Control - Continuous Move
   */
  async ptzContinuousMove(profileToken, velocity) {
    if (!this.ptzClient) throw new Error('PTZ client not available');

    try {
      await this.ptzClient.ContinuousMoveAsync({
        ProfileToken: profileToken,
        Velocity: velocity
      });
      
    } catch (error) {
      console.error('PTZ continuous move failed:', error);
      throw error;
    }
  }

  /**
   * PTZ Control - Stop
   */
  async ptzStop(profileToken) {
    if (!this.ptzClient) throw new Error('PTZ client not available');

    try {
      await this.ptzClient.StopAsync({
        ProfileToken: profileToken,
        PanTilt: true,
        Zoom: true
      });
      
    } catch (error) {
      console.error('PTZ stop failed:', error);
      throw error;
    }
  }

  /**
   * Get PTZ status
   */
  async getPtzStatus(profileToken) {
    if (!this.ptzClient) throw new Error('PTZ client not available');

    try {
      const result = await this.ptzClient.GetStatusAsync({
        ProfileToken: profileToken
      });

      return result[0]?.PTZStatus;
      
    } catch (error) {
      console.error('Failed to get PTZ status:', error);
      throw error;
    }
  }

  /**
   * Set imaging settings
   */
  async setImagingSettings(videoSourceToken, settings) {
    if (!this.imagingClient) throw new Error('Imaging client not available');

    try {
      await this.imagingClient.SetImagingSettingsAsync({
        VideoSourceToken: videoSourceToken,
        ImagingSettings: settings
      });
      
    } catch (error) {
      console.error('Failed to set imaging settings:', error);
      throw error;
    }
  }

  /**
   * Get system date and time
   */
  async getSystemDateAndTime() {
    try {
      const result = await this.deviceClient.GetSystemDateAndTimeAsync({});
      return result[0]?.SystemDateAndTime;
    } catch (error) {
      console.error('Failed to get system date and time:', error);
      return null;
    }
  }

  /**
   * Reboot device
   */
  async rebootDevice() {
    try {
      await this.deviceClient.SystemRebootAsync({});
      return true;
    } catch (error) {
      console.error('Failed to reboot device:', error);
      throw error;
    }
  }

  /**
   * Get device summary information
   */
  getDeviceSummary() {
    return {
      deviceInfo: this.deviceInfo,
      capabilities: {
        media: !!this.mediaClient,
        ptz: !!this.ptzClient,
        imaging: !!this.imagingClient,
        events: !!this.eventsClient,
        analytics: !!this.analyticsClient
      },
      profiles: this.profiles.map(profile => ({
        token: profile.$.token || profile.token,
        name: profile.Name,
        videoEncoder: profile.VideoEncoderConfiguration,
        audioEncoder: profile.AudioEncoderConfiguration,
        ptz: profile.PTZConfiguration
      })),
      serviceUrls: this.serviceUrls
    };
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    this.deviceClient = null;
    this.mediaClient = null;
    this.ptzClient = null;
    this.imagingClient = null;
    this.eventsClient = null;
    this.analyticsClient = null;
  }
}

module.exports = ONVIFClient;
