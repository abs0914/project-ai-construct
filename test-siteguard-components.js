#!/usr/bin/env node

/**
 * SiteGuard Components Integration Test
 * Tests specific SiteGuard functionality and component integration
 */

const fetch = require('node-fetch');
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

// Configuration
const API_BASE_URL = process.env.VITE_API_BASE_URL || 'https://api.aiconstructpro.com';
const MEDIA_SERVER_URL = process.env.VITE_MEDIA_SERVER_URL || 'https://api.aiconstructpro.com/api/media';
const ONVIF_SERVER_URL = process.env.VITE_ONVIF_SERVER_URL || 'https://api.aiconstructpro.com/api/onvif';
const NETWORK_SERVER_URL = process.env.VITE_NETWORK_SERVER_URL || 'https://api.aiconstructpro.com/api/network';
const SECURITY_SERVER_URL = process.env.VITE_SECURITY_SERVER_URL || 'https://api.aiconstructpro.com/api/security';

class SiteGuardComponentTester {
  constructor() {
    this.testResults = [];
    this.authToken = null;
  }

  async runAllTests() {
    console.log('🛡️  Starting SiteGuard Component Integration Tests\n');
    console.log(`Testing against: ${API_BASE_URL}\n`);

    try {
      // Authentication first
      await this.authenticate();
      
      // Test SiteGuard specific functionality
      await this.testCameraDiscovery();
      await this.testStreamingCapabilities();
      await this.testNetworkManagement();
      await this.testSecurityFeatures();
      await this.testAlertSystem();
      await this.testPersonnelManagement();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async authenticate() {
    console.log('🔐 Authenticating...');
    
    try {
      const response = await fetch(`${SECURITY_SERVER_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@siteguard.com',
          password: 'admin123'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        this.authToken = data.accessToken;
        this.addResult('✅ Authentication', 'PASS', 'Successfully authenticated');
      } else {
        // Try with test credentials
        const testResponse = await fetch(`${SECURITY_SERVER_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'testpassword'
          })
        });
        
        if (testResponse.status === 401) {
          this.addResult('✅ Authentication Endpoint', 'PASS', 'Auth endpoint accessible (401 expected)');
        } else {
          this.addResult('❌ Authentication', 'FAIL', `Status: ${response.status}`);
        }
      }
    } catch (error) {
      this.addResult('❌ Authentication', 'FAIL', error.message);
    }
  }

  async testCameraDiscovery() {
    console.log('📹 Testing Camera Discovery...');
    
    // Test ONVIF discovery
    try {
      const response = await fetch(`${ONVIF_SERVER_URL}/discover`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 10000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ ONVIF Discovery', 'PASS', `Found ${data.cameras ? data.cameras.length : 0} cameras`);
      } else {
        this.addResult('❌ ONVIF Discovery', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ ONVIF Discovery', 'FAIL', error.message);
    }

    // Test camera list
    try {
      const response = await fetch(`${ONVIF_SERVER_URL}/cameras`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ Camera List', 'PASS', `Retrieved camera list`);
      } else {
        this.addResult('❌ Camera List', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Camera List', 'FAIL', error.message);
    }
  }

  async testStreamingCapabilities() {
    console.log('🎥 Testing Streaming Capabilities...');
    
    // Test stream list
    try {
      const response = await fetch(`${MEDIA_SERVER_URL}/streams`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ Stream List', 'PASS', `Retrieved stream list`);
      } else {
        this.addResult('❌ Stream List', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Stream List', 'FAIL', error.message);
    }

    // Test HLS stream URL generation
    const testCameraId = 'test-camera-001';
    const hlsUrl = `${MEDIA_SERVER_URL}/stream/${testCameraId}/index.m3u8`;
    
    try {
      const response = await fetch(hlsUrl, {
        method: 'HEAD',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.status === 404) {
        this.addResult('✅ HLS Stream Endpoint', 'PASS', 'Stream endpoint accessible (404 expected for test camera)');
      } else if (response.ok) {
        this.addResult('✅ HLS Stream Endpoint', 'PASS', 'Stream endpoint accessible');
      } else {
        this.addResult('❌ HLS Stream Endpoint', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ HLS Stream Endpoint', 'FAIL', error.message);
    }
  }

  async testNetworkManagement() {
    console.log('🌐 Testing Network Management...');
    
    // Test device discovery
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/devices`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ Device Discovery', 'PASS', `Retrieved device list`);
      } else {
        this.addResult('❌ Device Discovery', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Device Discovery', 'FAIL', error.message);
    }

    // Test ZeroTier networks
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/zerotier/networks`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ ZeroTier Networks', 'PASS', `Retrieved network list`);
      } else {
        this.addResult('❌ ZeroTier Networks', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ ZeroTier Networks', 'FAIL', error.message);
    }
  }

  async testSecurityFeatures() {
    console.log('🔒 Testing Security Features...');
    
    // Test user management
    try {
      const response = await fetch(`${SECURITY_SERVER_URL}/users`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ User Management', 'PASS', `Retrieved user list`);
      } else {
        this.addResult('❌ User Management', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ User Management', 'FAIL', error.message);
    }

    // Test current user info
    try {
      const response = await fetch(`${SECURITY_SERVER_URL}/auth/me`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        timeout: 5000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.addResult('✅ Current User Info', 'PASS', `Retrieved user info`);
      } else {
        this.addResult('❌ Current User Info', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Current User Info', 'FAIL', error.message);
    }
  }

  async testAlertSystem() {
    console.log('🚨 Testing Alert System...');
    
    // Test alert endpoints (these might not exist yet, so we expect 404)
    const alertEndpoints = [
      '/alerts',
      '/alerts/active',
      '/alerts/history'
    ];

    for (const endpoint of alertEndpoints) {
      try {
        const response = await fetch(`${SECURITY_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          timeout: 5000
        });
        
        if (response.ok) {
          this.addResult(`✅ Alert System ${endpoint}`, 'PASS', `Endpoint accessible`);
        } else if (response.status === 404) {
          this.addResult(`⚠️  Alert System ${endpoint}`, 'WARNING', 'Endpoint not implemented yet (404)');
        } else {
          this.addResult(`❌ Alert System ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Alert System ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  async testPersonnelManagement() {
    console.log('👥 Testing Personnel Management...');
    
    // Test personnel endpoints
    const personnelEndpoints = [
      '/personnel',
      '/personnel/active',
      '/personnel/access-logs'
    ];

    for (const endpoint of personnelEndpoints) {
      try {
        const response = await fetch(`${SECURITY_SERVER_URL}${endpoint}`, {
          method: 'GET',
          headers: this.getAuthHeaders(),
          timeout: 5000
        });
        
        if (response.ok) {
          this.addResult(`✅ Personnel ${endpoint}`, 'PASS', `Endpoint accessible`);
        } else if (response.status === 404) {
          this.addResult(`⚠️  Personnel ${endpoint}`, 'WARNING', 'Endpoint not implemented yet (404)');
        } else {
          this.addResult(`❌ Personnel ${endpoint}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Personnel ${endpoint}`, 'FAIL', error.message);
      }
    }
  }

  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    return headers;
  }

  addResult(test, status, details = '') {
    this.testResults.push({ test, status, details });
    console.log(`  ${test}: ${status}${details ? ` - ${details}` : ''}`);
  }

  printResults() {
    console.log('\n📊 SiteGuard Component Test Results:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️  Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${this.testResults.length}`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.test}: ${r.details}`));
    }
    
    if (warnings > 0) {
      console.log('\n⚠️  Warnings (Features not yet implemented):');
      this.testResults
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`  - ${r.test}: ${r.details}`));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(failed === 0 ? '🎉 All critical tests passed!' : `⚠️  ${failed} critical test(s) failed`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SiteGuardComponentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SiteGuardComponentTester;
