const dgram = require('dgram');
const { v4: uuidv4 } = require('uuid');
const xml2js = require('xml2js');

/**
 * WS-Discovery implementation for ONVIF device discovery
 * Implements the Web Services Dynamic Discovery (WS-Discovery) protocol
 * to automatically find ONVIF cameras on the network
 */
class WSDiscovery {
  constructor(options = {}) {
    this.multicastAddress = '239.255.255.250';
    this.multicastPort = 3702;
    this.timeout = options.timeout || 5000;
    this.socket = null;
    this.discoveredDevices = new Map();
    this.messageId = 0;
    
    // Event callbacks
    this.onDeviceFound = options.onDeviceFound || (() => {});
    this.onError = options.onError || console.error;
    this.onDiscoveryComplete = options.onDiscoveryComplete || (() => {});
  }

  /**
   * Start WS-Discovery probe to find ONVIF devices
   */
  async discover() {
    return new Promise((resolve, reject) => {
      try {
        this.discoveredDevices.clear();
        this.setupSocket();
        this.sendProbe();
        
        // Set timeout for discovery
        setTimeout(() => {
          this.stop();
          const devices = Array.from(this.discoveredDevices.values());
          this.onDiscoveryComplete(devices);
          resolve(devices);
        }, this.timeout);
        
      } catch (error) {
        this.onError('Discovery failed:', error);
        reject(error);
      }
    });
  }

  /**
   * Setup UDP multicast socket for WS-Discovery
   */
  setupSocket() {
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    this.socket.on('message', (message, rinfo) => {
      this.handleMessage(message, rinfo);
    });

    this.socket.on('error', (error) => {
      this.onError('Socket error:', error);
    });

    this.socket.bind(this.multicastPort, () => {
      try {
        this.socket.addMembership(this.multicastAddress);
        this.socket.setMulticastTTL(1);
        console.log(`WS-Discovery listening on ${this.multicastAddress}:${this.multicastPort}`);
      } catch (error) {
        this.onError('Failed to setup multicast:', error);
      }
    });
  }

  /**
   * Send WS-Discovery probe message
   */
  sendProbe() {
    const messageId = `urn:uuid:${uuidv4()}`;
    this.messageId++;

    const probeMessage = this.createProbeMessage(messageId);
    const buffer = Buffer.from(probeMessage, 'utf8');

    this.socket.send(buffer, 0, buffer.length, this.multicastPort, this.multicastAddress, (error) => {
      if (error) {
        this.onError('Failed to send probe:', error);
      } else {
        console.log('WS-Discovery probe sent');
      }
    });
  }

  /**
   * Create WS-Discovery probe message XML
   */
  createProbeMessage(messageId) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope 
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope" 
    xmlns:wsa="http://schemas.xmlsoap.org/ws/2004/08/addressing" 
    xmlns:wsd="http://schemas.xmlsoap.org/ws/2005/04/discovery" 
    xmlns:tns="http://www.onvif.org/ver10/network/wsdl">
  <soap:Header>
    <wsa:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</wsa:Action>
    <wsa:MessageID>${messageId}</wsa:MessageID>
    <wsa:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</wsa:To>
  </soap:Header>
  <soap:Body>
    <wsd:Probe>
      <wsd:Types>tns:NetworkVideoTransmitter</wsd:Types>
    </wsd:Probe>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Handle incoming WS-Discovery messages
   */
  async handleMessage(message, rinfo) {
    try {
      const messageStr = message.toString('utf8');
      
      // Parse XML message
      const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: false });
      const result = await parser.parseStringPromise(messageStr);
      
      // Check if this is a ProbeMatch response
      if (this.isProbeMatch(result)) {
        const device = await this.parseProbeMatch(result, rinfo);
        if (device) {
          this.addDevice(device);
        }
      }
    } catch (error) {
      // Ignore parsing errors for non-ONVIF messages
      console.debug('Failed to parse message:', error.message);
    }
  }

  /**
   * Check if message is a ProbeMatch response
   */
  isProbeMatch(parsedXml) {
    try {
      const body = parsedXml['soap:Envelope']['soap:Body'] || parsedXml.Envelope?.Body;
      return !!(body?.ProbeMatches || body?.['wsd:ProbeMatches']);
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse ProbeMatch response to extract device information
   */
  async parseProbeMatch(parsedXml, rinfo) {
    try {
      const body = parsedXml['soap:Envelope']['soap:Body'] || parsedXml.Envelope?.Body;
      const probeMatches = body?.ProbeMatches || body?.['wsd:ProbeMatches'];
      const probeMatch = probeMatches?.ProbeMatch || probeMatches?.['wsd:ProbeMatch'];
      
      if (!probeMatch) return null;

      // Extract XAddrs (service URLs)
      const xaddrs = probeMatch.XAddrs || probeMatch['wsd:XAddrs'];
      if (!xaddrs) return null;

      const urls = xaddrs.split(' ').filter(url => url.trim());
      const deviceUrl = urls[0];
      
      if (!deviceUrl) return null;

      // Extract device information
      const device = {
        id: this.extractDeviceId(probeMatch),
        name: this.extractDeviceName(probeMatch),
        manufacturer: 'Unknown',
        model: 'Unknown',
        firmwareVersion: 'Unknown',
        serialNumber: 'Unknown',
        ip: rinfo.address,
        port: this.extractPortFromUrl(deviceUrl),
        serviceUrl: deviceUrl,
        xaddrs: urls,
        types: probeMatch.Types || probeMatch['wsd:Types'] || '',
        scopes: probeMatch.Scopes || probeMatch['wsd:Scopes'] || '',
        discoveredAt: new Date(),
        capabilities: {
          device: true,
          media: false,
          ptz: false,
          imaging: false,
          events: false,
          analytics: false
        }
      };

      // Parse scopes for additional information
      this.parseScopes(device);
      
      return device;
    } catch (error) {
      console.error('Error parsing ProbeMatch:', error);
      return null;
    }
  }

  /**
   * Extract device ID from ProbeMatch
   */
  extractDeviceId(probeMatch) {
    const endpointRef = probeMatch.EndpointReference || probeMatch['wsa:EndpointReference'];
    const address = endpointRef?.Address || endpointRef?.['wsa:Address'];
    
    if (address && address.includes('uuid:')) {
      return address.replace('urn:uuid:', '').replace('uuid:', '');
    }
    
    return uuidv4(); // Generate fallback ID
  }

  /**
   * Extract device name from scopes
   */
  extractDeviceName(probeMatch) {
    const scopes = probeMatch.Scopes || probeMatch['wsd:Scopes'] || '';
    const nameMatch = scopes.match(/name\/([^\/\s]+)/i);
    return nameMatch ? decodeURIComponent(nameMatch[1]) : 'ONVIF Camera';
  }

  /**
   * Extract port from service URL
   */
  extractPortFromUrl(url) {
    try {
      const urlObj = new URL(url);
      return parseInt(urlObj.port) || 80;
    } catch (error) {
      return 80;
    }
  }

  /**
   * Parse scopes to extract device information
   */
  parseScopes(device) {
    const scopes = device.scopes.toLowerCase();
    
    // Extract manufacturer
    const manufacturerMatch = scopes.match(/hardware\/([^\/\s]+)/);
    if (manufacturerMatch) {
      device.manufacturer = decodeURIComponent(manufacturerMatch[1]);
    }

    // Extract model
    const modelMatch = scopes.match(/model\/([^\/\s]+)/);
    if (modelMatch) {
      device.model = decodeURIComponent(modelMatch[1]);
    }

    // Extract location
    const locationMatch = scopes.match(/location\/([^\/\s]+)/);
    if (locationMatch) {
      device.location = decodeURIComponent(locationMatch[1]);
    }

    // Detect camera type based on manufacturer
    if (device.manufacturer.toLowerCase().includes('hikvision')) {
      device.type = 'hikvision';
    } else if (device.manufacturer.toLowerCase().includes('dahua')) {
      device.type = 'dahua';
    } else if (device.manufacturer.toLowerCase().includes('axis')) {
      device.type = 'axis';
    } else if (device.manufacturer.toLowerCase().includes('bosch')) {
      device.type = 'bosch';
    } else {
      device.type = 'onvif';
    }
  }

  /**
   * Add discovered device to the collection
   */
  addDevice(device) {
    const existingDevice = this.discoveredDevices.get(device.id);
    
    if (!existingDevice) {
      this.discoveredDevices.set(device.id, device);
      console.log(`Discovered ONVIF device: ${device.name} (${device.ip}:${device.port})`);
      this.onDeviceFound(device);
    } else {
      // Update existing device with new information
      Object.assign(existingDevice, device);
    }
  }

  /**
   * Stop discovery and cleanup
   */
  stop() {
    if (this.socket) {
      try {
        this.socket.dropMembership(this.multicastAddress);
        this.socket.close();
      } catch (error) {
        console.error('Error closing socket:', error);
      }
      this.socket = null;
    }
  }

  /**
   * Get all discovered devices
   */
  getDevices() {
    return Array.from(this.discoveredDevices.values());
  }

  /**
   * Get device by ID
   */
  getDevice(id) {
    return this.discoveredDevices.get(id);
  }
}

module.exports = WSDiscovery;
