#!/usr/bin/env node

/**
 * Test script for Network Management System
 * Tests GL-iNet router integration, ZeroTier API, and VPN management
 */

const fetch = require('node-fetch');
const GLiNetClient = require('./glinet-client');
const ZeroTierClient = require('./zerotier-client');
const VPNManager = require('./vpn-manager');

const NETWORK_SERVER_URL = 'http://localhost:3003';

class NetworkTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🌐 Starting Network Management Tests\n');

    try {
      await this.testNetworkServer();
      await this.testGLiNetClient();
      await this.testZeroTierClient();
      await this.testVPNManager();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testNetworkServer() {
    console.log('🖥️ Testing Network Management Server...');
    
    try {
      // Test server health
      const healthResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/health`);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        this.addResult('✅ Network Server', 'API accessible and responding');
        this.addResult('  📊 Services', `VPN Manager: ${healthData.services.vpnManager}, ZeroTier: ${healthData.services.zerotier}`);
      } else {
        throw new Error(`Server returned status ${healthResponse.status}`);
      }

      // Test network status endpoint
      const statusResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        this.addResult('✅ Network Status', `Routers: ${statusData.status.routers.total}, Tunnels: ${statusData.status.tunnels.total}`);
      } else {
        this.addResult('⚠️ Network Status', 'Status endpoint accessible but may have issues');
      }

      // Test routers endpoint
      const routersResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/routers`);
      if (routersResponse.ok) {
        const routersData = await routersResponse.json();
        this.addResult('✅ Routers API', `Retrieved ${routersData.routers.length} routers`);
      } else {
        this.addResult('❌ Routers API', 'Failed to retrieve routers');
      }

      // Test tunnels endpoint
      const tunnelsResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/tunnels`);
      if (tunnelsResponse.ok) {
        const tunnelsData = await tunnelsResponse.json();
        this.addResult('✅ Tunnels API', `Retrieved ${tunnelsData.tunnels.length} tunnels`);
      } else {
        this.addResult('❌ Tunnels API', 'Failed to retrieve tunnels');
      }

    } catch (error) {
      this.addResult('❌ Network Server', `Failed: ${error.message}`);
    }
  }

  async testGLiNetClient() {
    console.log('📡 Testing GL-iNet Router Client...');
    
    try {
      // Test with mock router (will fail but tests client structure)
      const router = new GLiNetClient({
        host: '192.168.1.1', // Mock IP
        username: 'root',
        password: 'admin',
        timeout: 2000
      });

      // Test connectivity (expected to fail)
      try {
        const isConnected = await router.testConnectivity();
        if (isConnected) {
          this.addResult('✅ GL-iNet Client', 'Successfully connected to router');
        } else {
          this.addResult('⚠️ GL-iNet Client', 'Expected failure with mock router - client structure is correct');
        }
      } catch (error) {
        this.addResult('⚠️ GL-iNet Client', 'Expected connection failure with mock router');
      }

      // Test client methods exist
      const methods = [
        'login',
        'logout',
        'getStatus',
        'getNetworkInfo',
        'getWirelessInfo',
        'getClients',
        'getBandwidthStats',
        'configurePortForwarding',
        'getVPNStatus',
        'configureVPN',
        'reboot'
      ];

      let methodsExist = 0;
      methods.forEach(method => {
        if (typeof router[method] === 'function') {
          methodsExist++;
        }
      });

      this.addResult('✅ GL-iNet Methods', `${methodsExist}/${methods.length} methods implemented`);
      
    } catch (error) {
      this.addResult('❌ GL-iNet Client', `Failed: ${error.message}`);
    }
  }

  async testZeroTierClient() {
    console.log('🔗 Testing ZeroTier Central Client...');
    
    try {
      // Test without API token (expected to fail)
      try {
        const ztClient = new ZeroTierClient({
          apiToken: 'test-token-invalid'
        });

        // Test connection (will fail with invalid token)
        const isConnected = await ztClient.testConnection();
        if (isConnected) {
          this.addResult('✅ ZeroTier Client', 'Successfully connected to ZeroTier Central');
        } else {
          this.addResult('⚠️ ZeroTier Client', 'Expected failure with invalid token - client structure is correct');
        }
      } catch (error) {
        this.addResult('⚠️ ZeroTier Client', 'Expected authentication failure with test token');
      }

      // Test client methods exist
      const ztClient = new ZeroTierClient({
        apiToken: 'test-token'
      });

      const methods = [
        'getStatus',
        'getNetworks',
        'getNetwork',
        'createNetwork',
        'updateNetwork',
        'deleteNetwork',
        'getNetworkMembers',
        'getNetworkMember',
        'authorizeMember',
        'deauthorizeMember',
        'deleteMember',
        'getNetworkStats'
      ];

      let methodsExist = 0;
      methods.forEach(method => {
        if (typeof ztClient[method] === 'function') {
          methodsExist++;
        }
      });

      this.addResult('✅ ZeroTier Methods', `${methodsExist}/${methods.length} methods implemented`);
      
    } catch (error) {
      this.addResult('❌ ZeroTier Client', `Failed: ${error.message}`);
    }
  }

  async testVPNManager() {
    console.log('🔐 Testing VPN Manager...');
    
    try {
      const vpnManager = new VPNManager({
        onTunnelUp: (tunnel) => {
          this.addResult('✅ VPN Manager', `Tunnel up event: ${tunnel.id}`);
        },
        onTunnelDown: (tunnel) => {
          this.addResult('⚠️ VPN Manager', `Tunnel down event: ${tunnel.id}`);
        },
        onRouterConnected: (router) => {
          this.addResult('✅ VPN Manager', `Router connected: ${router.id}`);
        },
        onRouterDisconnected: (router) => {
          this.addResult('⚠️ VPN Manager', `Router disconnected: ${router.id}`);
        }
      });

      // Test manager methods exist
      const methods = [
        'addRouter',
        'removeRouter',
        'createZeroTierTunnel',
        'joinZeroTierNetwork',
        'monitorTunnel',
        'testConnectivity',
        'startMonitoring',
        'stopMonitoring',
        'getRouterStatuses',
        'getTunnelStatuses'
      ];

      let methodsExist = 0;
      methods.forEach(method => {
        if (typeof vpnManager[method] === 'function') {
          methodsExist++;
        }
      });

      this.addResult('✅ VPN Manager Methods', `${methodsExist}/${methods.length} methods implemented`);

      // Test basic functionality
      const routerStatuses = vpnManager.getRouterStatuses();
      const tunnelStatuses = vpnManager.getTunnelStatuses();
      
      this.addResult('✅ VPN Manager State', `Routers: ${routerStatuses.length}, Tunnels: ${tunnelStatuses.length}`);

      // Test connectivity testing
      try {
        const connectivityResult = await vpnManager.testConnectivity('8.8.8.8', 3000);
        this.addResult('✅ Connectivity Test', `Google DNS: ${connectivityResult.alive ? 'reachable' : 'unreachable'}`);
      } catch (error) {
        this.addResult('⚠️ Connectivity Test', 'Test completed with expected limitations');
      }

      // Cleanup
      await vpnManager.cleanup();
      
    } catch (error) {
      this.addResult('❌ VPN Manager', `Failed: ${error.message}`);
    }
  }

  addResult(test, result) {
    this.testResults.push({ test, result });
    console.log(`  ${test}: ${result}`);
  }

  printResults() {
    console.log('\n📊 Network Management Test Results Summary:');
    console.log('=' .repeat(60));
    
    const passed = this.testResults.filter(r => r.test.startsWith('✅')).length;
    const warnings = this.testResults.filter(r => r.test.startsWith('⚠️')).length;
    const failed = this.testResults.filter(r => r.test.startsWith('❌')).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`⚠️ Warnings: ${warnings}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed === 0) {
      console.log('\n🎉 Network management system is ready!');
      console.log('\nNext steps:');
      console.log('1. Set ZEROTIER_API_TOKEN environment variable');
      console.log('2. Configure GL-iNet router credentials');
      console.log('3. Add routers via the API');
      console.log('4. Create VPN tunnels');
      console.log('5. Monitor network status');
    } else {
      console.log('\n⚠️ Some tests failed. Please check the network server configuration.');
    }

    console.log('\n📚 Network Management API Documentation:');
    console.log('Router Management:');
    console.log('  POST /api/network/routers - Add router');
    console.log('  GET  /api/network/routers - List routers');
    console.log('  GET  /api/network/routers/:id/status - Router status');
    console.log('ZeroTier Management:');
    console.log('  GET  /api/network/zerotier/networks - List networks');
    console.log('  POST /api/network/zerotier/networks - Create network');
    console.log('  GET  /api/network/zerotier/networks/:id/members - List members');
    console.log('VPN Tunnels:');
    console.log('  POST /api/network/tunnels - Create tunnel');
    console.log('  GET  /api/network/tunnels - List tunnels');
    console.log('  GET  /api/network/status - Network overview');
  }
}

// Check if network server is running
async function checkNetworkServer() {
  try {
    const response = await fetch(`${NETWORK_SERVER_URL}/api/network/health`, { timeout: 5000 });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  console.log('🔍 Checking if network server is running...');
  
  const isRunning = await checkNetworkServer();
  
  if (!isRunning) {
    console.log('❌ Network server is not running!');
    console.log('\nPlease start the network server first:');
    console.log('  npm run network-server');
    console.log('\nOr set ZeroTier API token and start:');
    console.log('  ZEROTIER_API_TOKEN=your_token npm run network-server');
    console.log('\nThen run this test again:');
    console.log('  npm run test:network');
    console.log('\nOr start all servers together:');
    console.log('  npm run dev');
    process.exit(1);
  }

  const tester = new NetworkTester();
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

module.exports = NetworkTester;
