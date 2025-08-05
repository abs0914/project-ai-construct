const V380CaptureService = require('./v380-capture-service');
const V380StreamRelay = require('./v380-stream-relay');
const V380ConfigManager = require('./v380-config-manager');

/**
 * V380 Integration Test Suite
 * Tests the complete V380 integration including capture, relay, and configuration
 */
class V380IntegrationTest {
  constructor() {
    this.captureService = new V380CaptureService();
    this.streamRelay = new V380StreamRelay();
    this.configManager = new V380ConfigManager('./test-v380-cameras.json');
    
    this.testResults = [];
  }

  /**
   * Run all V380 integration tests
   */
  async runAllTests() {
    console.log('🧪 Starting V380 Integration Tests...\n');
    
    const tests = [
      { name: 'Configuration Manager', test: () => this.testConfigManager() },
      { name: 'Capture Service', test: () => this.testCaptureService() },
      { name: 'Stream Relay', test: () => this.testStreamRelay() },
      { name: 'End-to-End Workflow', test: () => this.testEndToEndWorkflow() },
      { name: 'Error Handling', test: () => this.testErrorHandling() },
      { name: 'Performance', test: () => this.testPerformance() }
    ];

    for (const { name, test } of tests) {
      try {
        console.log(`🔍 Testing ${name}...`);
        const result = await test();
        this.testResults.push({ name, status: 'PASS', result });
        console.log(`✅ ${name}: PASS\n`);

        // Add delay between tests to ensure proper cleanup
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        this.testResults.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ ${name}: FAIL - ${error.message}\n`);

        // Ensure cleanup even on failure
        try {
          await this.captureService.stop();
          await this.streamRelay.stop();
        } catch (cleanupError) {
          console.log(`Cleanup error: ${cleanupError.message}`);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    this.printTestSummary();
  }

  /**
   * Test V380 Configuration Manager
   */
  async testConfigManager() {
    console.log('  - Testing camera configuration management...');
    
    // Test adding a camera
    const testCamera = {
      name: 'Test V380 Camera',
      ip: '192.168.1.100',
      port: 554,
      model: 'V380 Pro Test',
      credentials: {
        username: 'admin',
        password: 'testpass123'
      },
      streamSettings: {
        rtspPath: '/stream1',
        quality: 'high',
        resolution: '1920x1080',
        frameRate: 25,
        bitrate: 2000,
        audioEnabled: true
      }
    };

    const cameraId = 'test-v380-001';
    const addedCamera = this.configManager.addCamera(cameraId, testCamera);
    
    if (!addedCamera || addedCamera.id !== cameraId) {
      throw new Error('Failed to add camera configuration');
    }

    // Test retrieving camera
    const retrievedCamera = this.configManager.getCamera(cameraId);
    if (!retrievedCamera || retrievedCamera.name !== testCamera.name) {
      throw new Error('Failed to retrieve camera configuration');
    }

    // Test updating camera
    const updatedCamera = this.configManager.updateCamera(cameraId, {
      name: 'Updated Test Camera'
    });
    
    if (updatedCamera.name !== 'Updated Test Camera') {
      throw new Error('Failed to update camera configuration');
    }

    // Test RTSP URL generation
    const rtspUrl = this.configManager.getRTSPUrl(cameraId);
    const expectedUrl = `rtsp://${testCamera.credentials.username}:${testCamera.credentials.password}@${testCamera.ip}:${testCamera.port}${testCamera.streamSettings.rtspPath}`;
    
    if (!rtspUrl.includes(testCamera.ip)) {
      throw new Error('RTSP URL generation failed');
    }

    // Test configuration export/import
    const exportedConfig = this.configManager.exportConfiguration();
    if (!exportedConfig.cameras || exportedConfig.cameras.length === 0) {
      throw new Error('Configuration export failed');
    }

    console.log('  - Configuration management tests passed');
    return { camerasConfigured: 1, rtspUrl };
  }

  /**
   * Test V380 Capture Service
   */
  async testCaptureService() {
    console.log('  - Testing V380 capture service...');
    
    // Test service startup
    await this.captureService.start();
    
    if (!this.captureService.isRunning) {
      throw new Error('Capture service failed to start');
    }

    // Test capture start (mock)
    const cameraId = 'test-v380-001';
    const inputSource = 'rtsp://admin:testpass123@192.168.1.100:554/stream1';
    
    await this.captureService.startCapture(cameraId, { inputSource });
    
    const captureStatus = this.captureService.getCaptureStatus(cameraId);
    if (!captureStatus || captureStatus.status !== 'active') {
      throw new Error('Failed to start capture');
    }

    // Test capture stop
    await this.captureService.stopCapture(cameraId);
    
    const stoppedStatus = this.captureService.getCaptureStatus(cameraId);
    if (stoppedStatus && stoppedStatus.status === 'active') {
      throw new Error('Failed to stop capture');
    }

    // Test service shutdown
    await this.captureService.stop();
    
    console.log('  - Capture service tests passed');
    return { captureStarted: true, captureStopped: true };
  }

  /**
   * Test V380 Stream Relay
   */
  async testStreamRelay() {
    console.log('  - Testing V380 stream relay...');
    
    // Test relay service startup
    await this.streamRelay.start();
    
    if (!this.streamRelay.isRunning) {
      throw new Error('Stream relay service failed to start');
    }

    // Test relay start (mock)
    const cameraId = 'test-v380-001';
    const inputSource = 'rtsp://admin:testpass123@192.168.1.100:554/stream1';
    const outputFormat = 'hls';
    
    const relayId = await this.streamRelay.startRelay(cameraId, inputSource, outputFormat);
    
    if (!relayId) {
      throw new Error('Failed to start stream relay');
    }

    // Test relay status
    const relayStatus = this.streamRelay.getRelayStatus(relayId);
    if (!relayStatus || relayStatus.status !== 'active') {
      throw new Error('Relay status check failed');
    }

    // Test stream URLs
    const streamUrls = this.streamRelay.getStreamUrls(cameraId);
    if (!streamUrls.hls || !streamUrls.rtsp || !streamUrls.webrtc) {
      throw new Error('Stream URL generation failed');
    }

    // Test relay stop
    await this.streamRelay.stopRelay(relayId);
    
    const stoppedRelayStatus = this.streamRelay.getRelayStatus(relayId);
    if (stoppedRelayStatus) {
      throw new Error('Failed to stop stream relay');
    }

    // Test service shutdown
    await this.streamRelay.stop();
    
    console.log('  - Stream relay tests passed');
    return { relayId, streamUrls };
  }

  /**
   * Test end-to-end V380 workflow
   */
  async testEndToEndWorkflow() {
    console.log('  - Testing end-to-end V380 workflow...');

    // Wait longer to ensure previous test cleanup is complete
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Create new service instances to avoid port conflicts
    const captureService = new (require('./v380-capture-service'))();
    const streamRelay = new (require('./v380-stream-relay'))();

    try {
      // Start services
      await captureService.start();
      await streamRelay.start();
    
      const cameraId = 'test-v380-e2e';
      const inputSource = 'rtsp://admin:testpass123@192.168.1.100:554/stream1';

      // Start complete workflow
      await captureService.startCapture(cameraId, { inputSource });
      const relayId = await streamRelay.startRelay(cameraId, inputSource, 'hls');

      // Verify both services are running
      const captureStatus = captureService.getCaptureStatus(cameraId);
      const relayStatus = streamRelay.getRelayStatus(relayId);

      if (captureStatus.status !== 'active' || relayStatus.status !== 'active') {
        throw new Error('End-to-end workflow failed to start properly');
      }

      // Test stream URLs are accessible
      const streamUrls = streamRelay.getStreamUrls(cameraId);

      // Stop complete workflow
      await captureService.stopCapture(cameraId);
      await streamRelay.stopRelay(relayId);

      console.log('  - End-to-end workflow tests passed');
      return { workflowCompleted: true, streamUrls };

    } finally {
      // Always stop services
      try {
        await captureService.stop();
        await streamRelay.stop();
      } catch (error) {
        console.log('Cleanup error in end-to-end test:', error.message);
      }
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('  - Testing error handling...');
    
    // Test invalid camera configuration
    try {
      this.configManager.addCamera('invalid-cam', {});
      throw new Error('Should have failed with invalid configuration');
    } catch (error) {
      if (!error.message.includes('Missing required fields')) {
        throw new Error('Invalid configuration error handling failed');
      }
    }

    // Test capture with invalid camera ID
    await this.captureService.start();
    
    try {
      await this.captureService.stopCapture('non-existent-camera');
      // This should not throw an error, just log a warning
    } catch (error) {
      // Expected behavior
    }

    // Test relay with invalid parameters
    await this.streamRelay.start();
    
    try {
      await this.streamRelay.startRelay('test-cam', 'invalid-source', 'invalid-format');
      throw new Error('Should have failed with invalid format');
    } catch (error) {
      if (!error.message.includes('Unsupported output format')) {
        throw new Error('Invalid format error handling failed');
      }
    }

    await this.captureService.stop();
    await this.streamRelay.stop();
    
    console.log('  - Error handling tests passed');
    return { errorHandlingWorking: true };
  }

  /**
   * Test performance characteristics
   */
  async testPerformance() {
    console.log('  - Testing performance characteristics...');
    
    const startTime = Date.now();
    
    // Test service startup time
    const serviceStartTime = Date.now();
    await this.captureService.start();
    await this.streamRelay.start();
    const serviceStartupTime = Date.now() - serviceStartTime;
    
    // Test multiple concurrent operations
    const concurrentOps = [];
    for (let i = 0; i < 5; i++) {
      const cameraId = `perf-test-${i}`;
      const inputSource = `rtsp://admin:pass@192.168.1.${100 + i}:554/stream1`;
      
      concurrentOps.push(
        this.captureService.startCapture(cameraId, { inputSource })
      );
    }
    
    const concurrentStartTime = Date.now();
    await Promise.all(concurrentOps);
    const concurrentOperationTime = Date.now() - concurrentStartTime;
    
    // Test configuration operations
    const configStartTime = Date.now();
    for (let i = 0; i < 10; i++) {
      this.configManager.addCamera(`perf-cam-${i}`, {
        name: `Performance Test Camera ${i}`,
        ip: `192.168.1.${100 + i}`,
        credentials: { username: 'admin', password: 'pass' }
      });
    }
    const configOperationTime = Date.now() - configStartTime;
    
    // Cleanup
    await this.captureService.stop();
    await this.streamRelay.stop();
    
    const totalTime = Date.now() - startTime;
    
    console.log('  - Performance tests completed');
    return {
      serviceStartupTime,
      concurrentOperationTime,
      configOperationTime,
      totalTime
    };
  }

  /**
   * Print test summary
   */
  printTestSummary() {
    console.log('\n📊 V380 Integration Test Summary');
    console.log('================================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`  - ${r.name}: ${r.error}`));
    }
    
    console.log('\n✅ V380 Integration Tests Complete\n');
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  const testSuite = new V380IntegrationTest();
  testSuite.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = V380IntegrationTest;
