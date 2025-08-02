#!/usr/bin/env node

/**
 * UI Components Test
 * Tests that the frontend UI components are accessible and loading correctly
 */

const fetch = require('node-fetch');

const FRONTEND_URL = 'http://localhost:5173';

class UIComponentTester {
  constructor() {
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🎨 Starting UI Components Test\n');
    console.log(`Testing frontend at: ${FRONTEND_URL}\n`);

    try {
      await this.testPageAccessibility();
      await this.testComponentLoading();
      
      this.printResults();
    } catch (error) {
      console.error('❌ UI test suite failed:', error.message);
      process.exit(1);
    }
  }

  async testPageAccessibility() {
    console.log('📄 Testing Page Accessibility...');
    
    const pages = [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'SiteGuard', path: '/siteguard' },
      { name: 'SiteGuard Settings', path: '/siteguard/settings' },
      { name: 'Integration Test', path: '/integration-test' },
      { name: 'Project Management', path: '/project-management' },
      { name: 'AI Chatbot', path: '/ai-chatbot' }
    ];

    for (const page of pages) {
      try {
        const response = await fetch(`${FRONTEND_URL}${page.path}`, {
          method: 'GET',
          timeout: 5000
        });
        
        if (response.ok) {
          const html = await response.text();
          if (html.includes('<!DOCTYPE html>') || html.includes('<html')) {
            this.addResult(`✅ ${page.name} Page`, 'PASS', 'Page loads successfully');
          } else {
            this.addResult(`❌ ${page.name} Page`, 'FAIL', 'Invalid HTML response');
          }
        } else {
          this.addResult(`❌ ${page.name} Page`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ ${page.name} Page`, 'FAIL', error.message);
      }
    }
  }

  async testComponentLoading() {
    console.log('🧩 Testing Component Loading...');
    
    // Test that the main app loads
    try {
      const response = await fetch(`${FRONTEND_URL}/`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        const html = await response.text();
        
        // Check for React app indicators
        const indicators = [
          { name: 'React Root', check: html.includes('id="root"') },
          { name: 'Vite Client', check: html.includes('/@vite/client') || html.includes('vite') },
          { name: 'App Title', check: html.includes('<title>') },
          { name: 'CSS Loading', check: html.includes('.css') || html.includes('style') }
        ];
        
        indicators.forEach(indicator => {
          if (indicator.check) {
            this.addResult(`✅ ${indicator.name}`, 'PASS', 'Component indicator found');
          } else {
            this.addResult(`⚠️  ${indicator.name}`, 'WARNING', 'Component indicator not found');
          }
        });
        
      } else {
        this.addResult('❌ Main App Loading', 'FAIL', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('❌ Main App Loading', 'FAIL', error.message);
    }

    // Test static assets
    const assets = [
      '/vite.svg',
      '/src/main.tsx'
    ];

    for (const asset of assets) {
      try {
        const response = await fetch(`${FRONTEND_URL}${asset}`, {
          method: 'HEAD',
          timeout: 3000
        });
        
        if (response.ok) {
          this.addResult(`✅ Asset ${asset}`, 'PASS', 'Asset accessible');
        } else if (response.status === 404) {
          this.addResult(`⚠️  Asset ${asset}`, 'WARNING', 'Asset not found (may be normal)');
        } else {
          this.addResult(`❌ Asset ${asset}`, 'FAIL', `Status: ${response.status}`);
        }
      } catch (error) {
        this.addResult(`❌ Asset ${asset}`, 'FAIL', error.message);
      }
    }
  }

  addResult(test, status, details = '') {
    this.testResults.push({ test, status, details });
    console.log(`  ${test}: ${status}${details ? ` - ${details}` : ''}`);
  }

  printResults() {
    console.log('\n📊 UI Components Test Results:');
    console.log('=' .repeat(50));
    
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
    
    console.log('\n' + '='.repeat(50));
    
    if (failed === 0) {
      console.log('🎉 All UI components are accessible!');
      console.log('\n📱 You can now test the frontend manually at:');
      console.log(`   ${FRONTEND_URL}/dashboard`);
      console.log(`   ${FRONTEND_URL}/siteguard`);
      console.log(`   ${FRONTEND_URL}/integration-test`);
    } else {
      console.log(`⚠️  ${failed} UI test(s) failed`);
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new UIComponentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = UIComponentTester;
