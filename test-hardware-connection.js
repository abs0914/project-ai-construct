#!/usr/bin/env node

/**
 * SiteGuard Hardware Connection Testing Script
 * Tests camera connectivity, ONVIF discovery, and streaming functionality
 */

const fetch = require('node-fetch');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Configuration
const API_BASE_URL = 'http://api.aiconstructpro.com';
const ONVIF_SERVER_URL = `${API_BASE_URL}:3002`;
const MEDIA_SERVER_URL = `${API_BASE_URL}:3001`;

class HardwareConnectionTester {
  constructor() {
    this.testResults = [];
    this.discoveredCameras = [];
  }

  async runAllTests() {
    console.log('🔧 SiteGuard Hardware Connection Testing');
    console.log('==========================================');
    console.log(`Testing against: ${API_BASE_URL}\n`);

    try {
      // Test network connectivity
      await this.testNetworkConnectivity();
      
      // Test ONVIF discovery
      await this.testONVIFDiscovery();
      
      // Test camera connectivity
      await this.testCameraConnectivity();
      
      // Test streaming capabilities
      await this.testStreamingCapabilities();
      
      // Test manual camera addition
      await this.testManualCameraAddition();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Hardware testing failed:', error.message);
      process.exit(1);
    }
  }

  async testNetworkConnectivity() {
    console.log('🌐 Testing Network Connectivity...');
    
    const services = [
      { name: 'Media Server', url: `${MEDIA_SERVER_URL}/health` },
      { name: 'ONVIF Server', url: `${ONVIF_SERVER_URL}/health` },
    ];

    for (const service of services) {
      try {
        const response = await fetch(service.url, { timeout: 5000 });
        if (response.ok) {
          this.addResult(`✅ ${service.name}`, 'PASS', 'Service responding');
        } else {
          this.addResult(`❌ ${service.name}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ ${service.name}`, 'FAIL', error.message);
      }
    }
  }

  async testONVIFDiscovery() {
    console.log('📹 Testing ONVIF Discovery...');
    
    try {
      console.log('  🔍 Scanning for ONVIF cameras (30 second timeout)...');
      const response = await fetch(`${ONVIF_SERVER_URL}/discover`, {
        method: 'GET',
        timeout: 30000
      });
      
      if (response.ok) {
        const data = await response.json();
        this.discoveredCameras = data.cameras || [];
        
        if (this.discoveredCameras.length > 0) {
          this.addResult('✅ ONVIF Discovery', 'PASS', 
            `Found ${this.discoveredCameras.length} camera(s)`);
          
          // Log discovered cameras
          this.discoveredCameras.forEach((camera, index) => {
            console.log(`    📷 Camera ${index + 1}: ${camera.name || camera.ip} (${camera.ip})`);
          });
        } else {
          this.addResult('⚠️  ONVIF Discovery', 'WARNING', 
            'No cameras found - ensure cameras are powered and connected');
        }
      } else {
        this.addResult('❌ ONVIF Discovery', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ ONVIF Discovery', 'FAIL', error.message);
    }
  }

  async testCameraConnectivity() {
    console.log('📡 Testing Camera Connectivity...');
    
    if (this.discoveredCameras.length === 0) {
      console.log('  ⚠️  No cameras discovered, skipping connectivity tests');
      return;
    }

    for (const camera of this.discoveredCameras) {
      try {
        // Test ONVIF service endpoint
        const onvifUrl = `http://${camera.ip}/onvif/device_service`;
        console.log(`  🔍 Testing ONVIF service: ${camera.ip}`);
        
        const response = await fetch(onvifUrl, { 
          timeout: 5000,
          method: 'GET'
        });
        
        if (response.status === 200 || response.status === 405) {
          // 405 Method Not Allowed is expected for ONVIF SOAP service
          this.addResult(`✅ Camera ${camera.ip}`, 'PASS', 'ONVIF service accessible');
        } else {
          this.addResult(`❌ Camera ${camera.ip}`, 'FAIL', `ONVIF Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Camera ${camera.ip}`, 'FAIL', `Connection error: ${error.message}`);
      }
    }
  }

  async testStreamingCapabilities() {
    console.log('🎥 Testing Streaming Capabilities...');
    
    if (this.discoveredCameras.length === 0) {
      console.log('  ⚠️  No cameras available for streaming tests');
      return;
    }

    // Test streaming endpoints
    try {
      const response = await fetch(`${MEDIA_SERVER_URL}/streams`, { timeout: 5000 });
      if (response.ok) {
        this.addResult('✅ Streaming Service', 'PASS', 'Media server streaming ready');
      } else {
        this.addResult('❌ Streaming Service', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Streaming Service', 'FAIL', error.message);
    }
  }

  async testManualCameraAddition() {
    console.log('➕ Testing Manual Camera Addition...');
    
    // Test the camera addition endpoint
    try {
      const response = await fetch(`${ONVIF_SERVER_URL}/cameras`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const cameras = await response.json();
        this.addResult('✅ Camera Management', 'PASS', 
          `Camera API accessible, ${cameras.length || 0} configured cameras`);
      } else {
        this.addResult('❌ Camera Management', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Camera Management', 'FAIL', error.message);
    }
  }

  addResult(test, status, details = '') {
    this.testResults.push({ test, status, details });
    const statusIcon = status === 'PASS' ? '✅' : status === 'WARNING' ? '⚠️' : '❌';
    console.log(`  ${statusIcon} ${test}: ${status}${details ? ` - ${details}` : ''}`);
  }

  printResults() {
    console.log('\n==========================================');
    console.log('🧪 Hardware Connection Test Results');
    console.log('==========================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const warnings = this.testResults.filter(r => r.status === 'WARNING').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
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
      console.log('\n⚠️  Warnings:');
      this.testResults
        .filter(r => r.status === 'WARNING')
        .forEach(r => console.log(`  - ${r.test}: ${r.details}`));
    }

    console.log('\n==========================================');
    
    if (this.discoveredCameras.length > 0) {
      console.log('🎉 Cameras detected! You can now:');
      console.log('  1. View live feeds in the SiteGuard web interface');
      console.log('  2. Configure recording settings');
      console.log('  3. Set up motion detection alerts');
    } else {
      console.log('📋 Next Steps:');
      console.log('  1. Connect ONVIF cameras to your network');
      console.log('  2. Ensure cameras have static IP addresses');
      console.log('  3. Enable ONVIF in camera settings');
      console.log('  4. Run this test again');
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new HardwareConnectionTester();
  tester.runAllTests().catch(console.error);
}

module.exports = HardwareConnectionTester;
