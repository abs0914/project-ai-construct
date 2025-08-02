#!/usr/bin/env node

/**
 * SiteGuard Camera Simulator for Testing
 * Simulates ONVIF cameras for testing purposes when no physical hardware is available
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://api.aiconstructpro.com';
const ONVIF_SERVER_URL = `${API_BASE_URL}:3002`;

class CameraSimulator {
  constructor() {
    this.simulatedCameras = [
      {
        name: 'Test Camera 1',
        location: 'Main Entrance',
        ip_address: '192.168.1.100',
        username: 'admin',
        onvif_port: 80,
        status: 'online',
        is_recording: false
      },
      {
        name: 'Test Camera 2', 
        location: 'Parking Area',
        ip_address: '192.168.1.101',
        username: 'admin',
        onvif_port: 80,
        status: 'online',
        is_recording: false
      },
      {
        name: 'Test Camera 3',
        location: 'Storage Room',
        ip_address: '192.168.1.102', 
        username: 'admin',
        onvif_port: 80,
        status: 'offline',
        is_recording: false
      }
    ];
  }

  async runSimulation() {
    console.log('🎬 SiteGuard Camera Simulator');
    console.log('=============================');
    console.log('This simulator will add test cameras to your SiteGuard system for testing purposes.\n');

    try {
      // Test connection to ONVIF server
      await this.testConnection();
      
      // Add simulated cameras
      await this.addSimulatedCameras();
      
      // Test camera discovery
      await this.testDiscovery();
      
      // Test streaming endpoints
      await this.testStreaming();
      
      console.log('\n🎉 Camera simulation completed!');
      console.log('You can now test the SiteGuard interface with simulated cameras.');
      
    } catch (error) {
      console.error('❌ Simulation failed:', error.message);
      process.exit(1);
    }
  }

  async testConnection() {
    console.log('🔌 Testing connection to ONVIF server...');
    
    try {
      const response = await fetch(`${ONVIF_SERVER_URL}/health`, { timeout: 5000 });
      if (response.ok) {
        console.log('  ✅ ONVIF server is responding');
      } else {
        throw new Error(`ONVIF server returned status: ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Cannot connect to ONVIF server: ${error.message}`);
    }
  }

  async addSimulatedCameras() {
    console.log('📹 Adding simulated cameras...');
    
    for (const camera of this.simulatedCameras) {
      try {
        console.log(`  📷 Adding ${camera.name} (${camera.ip_address})`);
        
        const response = await fetch(`${ONVIF_SERVER_URL}/cameras`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(camera),
          timeout: 10000
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`    ✅ Added successfully (ID: ${result.id || 'N/A'})`);
        } else if (response.status === 409) {
          console.log(`    ⚠️  Camera already exists`);
        } else {
          console.log(`    ❌ Failed to add: Status ${response.status}`);
        }
      } catch (error) {
        console.log(`    ❌ Error adding camera: ${error.message}`);
      }
    }
  }

  async testDiscovery() {
    console.log('\n🔍 Testing camera discovery...');
    
    try {
      const response = await fetch(`${ONVIF_SERVER_URL}/discover`, {
        timeout: 15000
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ Discovery completed: Found ${data.discovered || 0} cameras`);
        
        if (data.cameras && data.cameras.length > 0) {
          data.cameras.forEach((camera, index) => {
            console.log(`    📷 Camera ${index + 1}: ${camera.name || camera.ip}`);
          });
        }
      } else {
        console.log(`  ❌ Discovery failed: Status ${response.status}`);
      }
    } catch (error) {
      console.log(`  ❌ Discovery error: ${error.message}`);
    }
  }

  async testStreaming() {
    console.log('\n🎥 Testing streaming endpoints...');
    
    try {
      // Test streams endpoint
      const streamsResponse = await fetch(`${API_BASE_URL}:3001/streams`, {
        timeout: 5000
      });
      
      if (streamsResponse.ok) {
        console.log('  ✅ Streaming service is accessible');
      } else {
        console.log(`  ⚠️  Streaming service status: ${streamsResponse.status}`);
      }
      
      // Test HLS endpoint for first camera
      const testCameraId = 'test-camera-001';
      const hlsUrl = `${API_BASE_URL}/api/media/stream/${testCameraId}/index.m3u8`;
      console.log(`  📺 HLS URL format: ${hlsUrl}`);
      
      // Test WebRTC endpoint
      const webrtcUrl = `${API_BASE_URL}/api/media/webrtc/${testCameraId}`;
      console.log(`  🌐 WebRTC URL format: ${webrtcUrl}`);
      
    } catch (error) {
      console.log(`  ❌ Streaming test error: ${error.message}`);
    }
  }

  async cleanupSimulation() {
    console.log('\n🧹 Cleaning up simulated cameras...');
    
    try {
      // Get current cameras
      const response = await fetch(`${ONVIF_SERVER_URL}/cameras`, {
        timeout: 5000
      });
      
      if (response.ok) {
        const cameras = await response.json();
        
        // Remove test cameras
        for (const camera of cameras) {
          if (camera.name && camera.name.startsWith('Test Camera')) {
            try {
              const deleteResponse = await fetch(`${ONVIF_SERVER_URL}/cameras/${camera.id}`, {
                method: 'DELETE',
                timeout: 5000
              });
              
              if (deleteResponse.ok) {
                console.log(`  ✅ Removed ${camera.name}`);
              } else {
                console.log(`  ❌ Failed to remove ${camera.name}: Status ${deleteResponse.status}`);
              }
            } catch (error) {
              console.log(`  ❌ Error removing ${camera.name}: ${error.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ Cleanup error: ${error.message}`);
    }
  }

  printUsageInstructions() {
    console.log('\n📋 Next Steps:');
    console.log('1. Open your SiteGuard web interface');
    console.log('2. Navigate to the Camera section');
    console.log('3. You should see the simulated cameras listed');
    console.log('4. Test live feed functionality (will show placeholder)');
    console.log('5. Test recording and alert features');
    console.log('\n🔧 To remove simulated cameras:');
    console.log('   node test-camera-simulator.js --cleanup');
  }
}

// Command line handling
async function main() {
  const simulator = new CameraSimulator();
  
  if (process.argv.includes('--cleanup')) {
    console.log('🧹 Running cleanup mode...');
    await simulator.cleanupSimulation();
    console.log('✅ Cleanup completed');
    return;
  }
  
  if (process.argv.includes('--help')) {
    console.log('SiteGuard Camera Simulator');
    console.log('Usage:');
    console.log('  node test-camera-simulator.js          # Add simulated cameras');
    console.log('  node test-camera-simulator.js --cleanup # Remove simulated cameras');
    console.log('  node test-camera-simulator.js --help    # Show this help');
    return;
  }
  
  await simulator.runSimulation();
  simulator.printUsageInstructions();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CameraSimulator;
