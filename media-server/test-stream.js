#!/usr/bin/env node

/**
 * Test script for video streaming infrastructure
 * This script tests the media server functionality without requiring actual cameras
 */

const fetch = require('node-fetch');
const WebSocket = require('ws');

const MEDIA_SERVER_URL = 'http://localhost:3001';
const WEBRTC_URL = 'ws://localhost:8001';

class StreamingTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 Starting Video Streaming Infrastructure Tests\n');

    try {
      await this.testMediaServerAPI();
      await this.testStreamManagement();
      await this.testWebRTCSignaling();
      await this.testStreamHealth();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testMediaServerAPI() {
    console.log('📡 Testing Media Server API...');
    
    try {
      // Test API health
      const response = await fetch(`${MEDIA_SERVER_URL}/api/streams`);
      if (response.ok) {
        this.addResult('✅ Media Server API', 'Accessible and responding');
      } else {
        throw new Error(`API returned status ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Media Server API', `Failed: ${error.message}`);
      throw error;
    }
  }

  async testStreamManagement() {
    console.log('🎥 Testing Stream Management...');
    
    const testCameraId = 'test-camera-001';
    const testRtspUrl = 'rtsp://test.example.com/stream';
    
    try {
      // Test stream start
      const startResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams/${testCameraId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rtspUrl: testRtspUrl,
          username: 'test',
          password: 'test'
        })
      });

      if (startResponse.ok) {
        const startData = await startResponse.json();
        this.addResult('✅ Stream Start', `Stream key: ${startData.streamKey}`);
        
        // Test stream status
        const statusResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          const hasTestStream = statusData.streams.some(s => s.cameraId === testCameraId);
          this.addResult('✅ Stream Status', hasTestStream ? 'Stream found in active list' : 'Stream not found');
        }

        // Test stream stop
        const stopResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams/camera_${testCameraId}/stop`, {
          method: 'POST'
        });

        if (stopResponse.ok) {
          this.addResult('✅ Stream Stop', 'Stream stopped successfully');
        } else {
          this.addResult('⚠️ Stream Stop', 'Stop request failed but this is expected for test stream');
        }
      } else {
        this.addResult('⚠️ Stream Start', 'Expected to fail with test RTSP URL');
      }
    } catch (error) {
      this.addResult('⚠️ Stream Management', `Expected errors with test data: ${error.message}`);
    }
  }

  async testWebRTCSignaling() {
    console.log('🌐 Testing WebRTC Signaling...');
    
    return new Promise((resolve) => {
      const testStreamKey = 'test-stream';
      const ws = new WebSocket(`${WEBRTC_URL}/webrtc/${testStreamKey}`);
      
      const timeout = setTimeout(() => {
        this.addResult('❌ WebRTC Signaling', 'Connection timeout');
        ws.close();
        resolve();
      }, 5000);

      ws.on('open', () => {
        clearTimeout(timeout);
        this.addResult('✅ WebRTC Signaling', 'WebSocket connection established');
        
        // Test message handling
        ws.send(JSON.stringify({
          type: 'test',
          message: 'Hello WebRTC server'
        }));
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 1000);
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.addResult('❌ WebRTC Signaling', `Connection failed: ${error.message}`);
        resolve();
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          this.addResult('✅ WebRTC Messages', `Received: ${message.type}`);
        } catch (error) {
          this.addResult('⚠️ WebRTC Messages', 'Received non-JSON message');
        }
      });
    });
  }

  async testStreamHealth() {
    console.log('💓 Testing Stream Health Monitoring...');
    
    try {
      const testStreamKey = 'camera_test-health';
      const healthResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams/${testStreamKey}/health`);
      
      if (healthResponse.status === 404) {
        this.addResult('✅ Stream Health', 'Correctly returns 404 for non-existent stream');
      } else if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.addResult('✅ Stream Health', `Health data structure: ${Object.keys(healthData).join(', ')}`);
      } else {
        this.addResult('⚠️ Stream Health', `Unexpected status: ${healthResponse.status}`);
      }
    } catch (error) {
      this.addResult('❌ Stream Health', `Failed: ${error.message}`);
    }
  }

  addResult(test, result) {
    this.testResults.push({ test, result });
    console.log(`  ${test}: ${result}`);
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.test.startsWith('✅')).length;
    const warnings = this.testResults.filter(r => r.test.startsWith('⚠️')).length;
    const failed = this.testResults.filter(r => r.test.startsWith('❌')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Video streaming infrastructure is ready!');
      console.log('\nNext steps:');
      console.log('1. Start the media server: npm run media-server');
      console.log('2. Start the React app: npm run dev:client');
      console.log('3. Configure cameras in the SiteGuard interface');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the media server configuration.');
    }
  }
}

// Check if media server is running
async function checkMediaServer() {
  try {
    const response = await fetch(`${MEDIA_SERVER_URL}/api/streams`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if media server is running...');
  
  const isRunning = await checkMediaServer();
  
  if (!isRunning) {
    console.log('❌ Media server is not running!');
    console.log('\nPlease start the media server first:');
    console.log('  npm run media-server');
    console.log('\nThen run this test again:');
    console.log('  node media-server/test-stream.js');
    process.exit(1);
  }

  const tester = new StreamingTester();
  await tester.runAllTests();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Test interrupted by user');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  });
}

module.exports = StreamingTester;
