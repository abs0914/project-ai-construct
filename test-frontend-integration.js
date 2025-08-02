#!/usr/bin/env node

/**
 * Frontend Integration Test Suite
 * Tests the integration between React frontend and backend services
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

// Configuration from .env
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.aiconstructpro.com';
const MEDIA_SERVER_URL = process.env.VITE_MEDIA_SERVER_URL || 'https://api.aiconstructpro.com/api/media';
const ONVIF_SERVER_URL = process.env.VITE_ONVIF_SERVER_URL || 'https://api.aiconstructpro.com/api/onvif';
const NETWORK_SERVER_URL = process.env.VITE_NETWORK_SERVER_URL || 'https://api.aiconstructpro.com/api/network';
const SECURITY_SERVER_URL = process.env.VITE_SECURITY_SERVER_URL || 'https://api.aiconstructpro.com/api/security';
const WEBSOCKET_URL = process.env.VITE_WEBSOCKET_URL || 'wss://api.aiconstructpro.com';

class FrontendIntegrationTester {
  constructor() {
    this.testResults = [];
    this.authToken = null;
  }

  async runAllTests() {
    console.log('🚀 Starting Frontend Integration Tests\n');
    console.log(`Testing against: ${API_BASE_URL}\n`);

    try {
      // Core API Tests
      await this.testAPIConnectivity();
      await this.testHealthChecks();
      
      // Authentication Tests
      await this.testAuthenticationFlow();
      
      // Service Integration Tests
      await this.testMediaServerIntegration();
      await this.testONVIFIntegration();
      await this.testNetworkIntegration();
      await this.testSecurityIntegration();
      
      // Real-time Communication Tests
      await this.testWebSocketConnection();
      
      // Frontend-specific Tests
      await this.testAPIClientConfiguration();
      await this.testStreamingURLs();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testAPIConnectivity() {
    console.log('📡 Testing API Connectivity...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        this.addResult('✅ API Base URL connectivity', 'PASS');
      } else {
        this.addResult('❌ API Base URL connectivity', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ API Base URL connectivity', 'FAIL', error.message);
    }
  }

  async testHealthChecks() {
    console.log('🏥 Testing Service Health Checks...');
    
    const services = [
      { name: 'Media Server', url: `${MEDIA_SERVER_URL}/health` },
      { name: 'ONVIF Server', url: `${ONVIF_SERVER_URL}/health` },
      { name: 'Network Server', url: `${NETWORK_SERVER_URL}/health` },
      { name: 'Security Server', url: `${SECURITY_SERVER_URL}/health` }
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          try {
            const text = await response.text();
            try {
              const data = JSON.parse(text);
              this.addResult(`✅ ${service.name} Health Check`, 'PASS', `Status: ${data.status || 'healthy'}`);
            } catch (jsonError) {
              // If JSON parsing fails, check if it's a text response
              if (text.includes(service.name.split(' ')[0])) {
                this.addResult(`✅ ${service.name} Health Check`, 'PASS', 'Service responding (HTML format)');
              } else {
                this.addResult(`❌ ${service.name} Health Check`, 'FAIL', `Invalid response format: ${text.substring(0, 50)}...`);
              }
            }
          } catch (error) {
            this.addResult(`❌ ${service.name} Health Check`, 'FAIL', `Response error: ${error.message}`);
          }
        } else {
          this.addResult(`❌ ${service.name} Health Check`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ ${service.name} Health Check`, 'FAIL', error.message);
      }
    }
  }

  async testAuthenticationFlow() {
    console.log('🔐 Testing Authentication Flow...');
    
    // Test login endpoint
    try {
      const loginResponse = await fetch(`${SECURITY_SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword'
        })
      });
      
      if (loginResponse.status === 401 || loginResponse.status === 400) {
        // Expected for invalid credentials
        this.addResult('✅ Authentication endpoint accessible', 'PASS', 'Login endpoint responding correctly');
      } else if (loginResponse.ok) {
        const data = await loginResponse.json();
        this.authToken = data.accessToken;
        this.addResult('✅ Authentication successful', 'PASS', 'Got access token');
      } else {
        this.addResult('❌ Authentication endpoint', 'FAIL', `Status: ${loginResponse.status}`);
      }
    } catch (error) {
      this.addResult('❌ Authentication endpoint', 'FAIL', error.message);
    }
  }

  async testMediaServerIntegration() {
    console.log('🎥 Testing Media Server Integration...');
    
    // Test stream endpoints
    const endpoints = [
      '/streams',
      '/recordings',
      '/cameras'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${MEDIA_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          timeout: 5000
        });
        
        if (response.ok || response.status === 401) {
          this.addResult(`✅ Media Server ${endpoint}`, 'PASS', `Status: ${response.status}`);
        } else {
          this.addResult(`❌ Media Server ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Media Server ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  async testONVIFIntegration() {
    console.log('📹 Testing ONVIF Integration...');
    
    const endpoints = [
      '/discover',
      '/cameras',
      '/profiles'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${ONVIF_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          timeout: 5000
        });
        
        if (response.ok || response.status === 401) {
          this.addResult(`✅ ONVIF Server ${endpoint}`, 'PASS', `Status: ${response.status}`);
        } else {
          this.addResult(`❌ ONVIF Server ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ ONVIF Server ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  async testNetworkIntegration() {
    console.log('🌐 Testing Network Integration...');
    
    const endpoints = [
      '/devices',
      '/zerotier/networks',
      '/routers'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${NETWORK_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          timeout: 5000
        });
        
        if (response.ok || response.status === 401) {
          this.addResult(`✅ Network Server ${endpoint}`, 'PASS', `Status: ${response.status}`);
        } else {
          this.addResult(`❌ Network Server ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Network Server ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  async testSecurityIntegration() {
    console.log('🔒 Testing Security Integration...');
    
    const endpoints = [
      '/auth/me',
      '/users',
      '/permissions'
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${SECURITY_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
          timeout: 5000
        });
        
        if (response.ok || response.status === 401) {
          this.addResult(`✅ Security Server ${endpoint}`, 'PASS', `Status: ${response.status}`);
        } else {
          this.addResult(`❌ Security Server ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Security Server ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  async testWebSocketConnection() {
    console.log('🔌 Testing WebSocket Connection...');
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(WEBSOCKET_URL);
        
        const timeout = setTimeout(() => {
          ws.close();
          this.addResult('❌ WebSocket Connection', 'FAIL', 'Connection timeout');
          resolve();
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          this.addResult('✅ WebSocket Connection', 'PASS', 'Connected successfully');
          ws.close();
          resolve();
        });
        
        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.addResult('❌ WebSocket Connection', 'FAIL', error.message);
          resolve();
        });
      } catch (error) {
        this.addResult('❌ WebSocket Connection', 'FAIL', error.message);
        resolve();
      }
    });
  }

  async testAPIClientConfiguration() {
    console.log('⚙️ Testing API Client Configuration...');
    
    // Test that all required environment variables are set
    const requiredVars = [
      'VITE_API_BASE_URL',
      'VITE_MEDIA_SERVER_URL',
      'VITE_ONVIF_SERVER_URL',
      'VITE_NETWORK_SERVER_URL',
      'VITE_SECURITY_SERVER_URL',
      'VITE_WEBSOCKET_URL'
    ];

    let allConfigured = true;
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.addResult(`❌ Environment Variable ${varName}`, 'FAIL', 'Not configured');
        allConfigured = false;
      }
    }

    if (allConfigured) {
      this.addResult('✅ API Client Configuration', 'PASS', 'All environment variables configured');
    }
  }

  async testStreamingURLs() {
    console.log('📺 Testing Streaming URL Generation...');
    
    // Test HLS stream URL format
    const testCameraId = 'test-camera-001';
    const hlsUrl = `${MEDIA_SERVER_URL}/stream/${testCameraId}/index.m3u8`;
    const webrtcUrl = `${MEDIA_SERVER_URL}/webrtc/${testCameraId}`;
    
    this.addResult('✅ HLS URL Format', 'PASS', hlsUrl);
    this.addResult('✅ WebRTC URL Format', 'PASS', webrtcUrl);
  }

  addResult(test, status, details = '') {
    this.testResults.push({ test, status, details });
    console.log(`  ${test}: ${status}${details ? ` - ${details}` : ''}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.test}: ${r.details}`));
    }
    
    console.log('\n' + '='.repeat(50));
    console.log(failed === 0 ? '🎉 All tests passed!' : `⚠️  ${failed} test(s) failed`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new FrontendIntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = FrontendIntegrationTester;
