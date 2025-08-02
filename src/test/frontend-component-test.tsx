/**
 * Frontend Component Integration Test
 * Tests React components and their integration with backend services
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { API_CONFIG } from '@/lib/api-config';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export const FrontendComponentTest: React.FC = () => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>('');

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        existing.status = status;
        existing.message = message;
        existing.details = details;
        return [...prev];
      } else {
        return [...prev, { name, status, message, details }];
      }
    });
  };

  const runTests = async () => {
    setIsRunning(true);
    setTests([]);

    try {
      // Test 1: API Configuration
      setCurrentTest('API Configuration');
      updateTest('API Configuration', 'pending', 'Checking API configuration...');
      
      const configTest = {
        baseURL: API_CONFIG.baseURL,
        mediaServer: API_CONFIG.mediaServer,
        onvifServer: API_CONFIG.onvifServer,
        networkServer: API_CONFIG.networkServer,
        securityServer: API_CONFIG.securityServer,
        websocketURL: API_CONFIG.websocketURL
      };
      
      const missingConfigs = Object.entries(configTest).filter(([_, value]) => !value);
      if (missingConfigs.length > 0) {
        updateTest('API Configuration', 'error', `Missing configurations: ${missingConfigs.map(([key]) => key).join(', ')}`);
      } else {
        updateTest('API Configuration', 'success', 'All API endpoints configured', configTest);
      }

      // Test 2: Health Check
      setCurrentTest('Health Check');
      updateTest('Health Check', 'pending', 'Checking service health...');
      
      try {
        const healthResult = await apiClient.healthCheck();
        const healthyServices = Object.entries(healthResult).filter(([_, status]) => status.status === 'healthy').length;
        const totalServices = Object.keys(healthResult).length;
        
        if (healthyServices === totalServices) {
          updateTest('Health Check', 'success', `All ${totalServices} services healthy`, healthResult);
        } else {
          updateTest('Health Check', 'warning', `${healthyServices}/${totalServices} services healthy`, healthResult);
        }
      } catch (error) {
        updateTest('Health Check', 'error', `Health check failed: ${error.message}`);
      }

      // Test 3: Authentication Test
      setCurrentTest('Authentication');
      updateTest('Authentication', 'pending', 'Testing authentication endpoints...');
      
      try {
        // Test if auth endpoints are accessible (expect 401 for invalid credentials)
        const authResponse = await fetch(`${API_CONFIG.securityServer}/auth/me`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (authResponse.status === 401) {
          updateTest('Authentication', 'success', 'Authentication endpoint accessible (401 expected)');
        } else if (authResponse.ok) {
          updateTest('Authentication', 'success', 'Authentication endpoint accessible and authenticated');
        } else {
          updateTest('Authentication', 'error', `Unexpected status: ${authResponse.status}`);
        }
      } catch (error) {
        updateTest('Authentication', 'error', `Authentication test failed: ${error.message}`);
      }

      // Test 4: Media Server Integration
      setCurrentTest('Media Server');
      updateTest('Media Server', 'pending', 'Testing media server integration...');
      
      try {
        const mediaResponse = await fetch(`${API_CONFIG.mediaServer}/health`);
        if (mediaResponse.ok) {
          updateTest('Media Server', 'success', 'Media server accessible');
        } else {
          updateTest('Media Server', 'error', `Media server error: ${mediaResponse.status}`);
        }
      } catch (error) {
        updateTest('Media Server', 'error', `Media server connection failed: ${error.message}`);
      }

      // Test 5: ONVIF Server Integration
      setCurrentTest('ONVIF Server');
      updateTest('ONVIF Server', 'pending', 'Testing ONVIF server integration...');
      
      try {
        const onvifResponse = await fetch(`${API_CONFIG.onvifServer}/health`);
        if (onvifResponse.ok) {
          updateTest('ONVIF Server', 'success', 'ONVIF server accessible');
        } else {
          updateTest('ONVIF Server', 'error', `ONVIF server error: ${onvifResponse.status}`);
        }
      } catch (error) {
        updateTest('ONVIF Server', 'error', `ONVIF server connection failed: ${error.message}`);
      }

      // Test 6: Network Server Integration
      setCurrentTest('Network Server');
      updateTest('Network Server', 'pending', 'Testing network server integration...');
      
      try {
        const networkResponse = await fetch(`${API_CONFIG.networkServer}/health`);
        if (networkResponse.ok) {
          updateTest('Network Server', 'success', 'Network server accessible');
        } else {
          updateTest('Network Server', 'error', `Network server error: ${networkResponse.status}`);
        }
      } catch (error) {
        updateTest('Network Server', 'error', `Network server connection failed: ${error.message}`);
      }

      // Test 7: WebSocket Connection
      setCurrentTest('WebSocket');
      updateTest('WebSocket', 'pending', 'Testing WebSocket connection...');
      
      try {
        const ws = new WebSocket(API_CONFIG.websocketURL);
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            ws.close();
            reject(new Error('WebSocket connection timeout'));
          }, 5000);
          
          ws.onopen = () => {
            clearTimeout(timeout);
            updateTest('WebSocket', 'success', 'WebSocket connection established');
            ws.close();
            resolve(true);
          };
          
          ws.onerror = (error) => {
            clearTimeout(timeout);
            reject(error);
          };
        });
      } catch (error) {
        updateTest('WebSocket', 'error', `WebSocket connection failed: ${error.message}`);
      }

      // Test 8: Stream URL Generation
      setCurrentTest('Stream URLs');
      updateTest('Stream URLs', 'pending', 'Testing stream URL generation...');
      
      const testCameraId = 'test-camera-001';
      const hlsUrl = `${API_CONFIG.mediaServer}/stream/${testCameraId}/index.m3u8`;
      const webrtcUrl = `${API_CONFIG.mediaServer}/webrtc/${testCameraId}`;
      
      updateTest('Stream URLs', 'success', 'Stream URLs generated successfully', {
        hls: hlsUrl,
        webrtc: webrtcUrl
      });

    } catch (error) {
      updateTest('Test Suite', 'error', `Test suite failed: ${error.message}`);
    } finally {
      setIsRunning(false);
      setCurrentTest('');
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      pending: 'secondary',
      success: 'default',
      error: 'destructive',
      warning: 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[status]} className="ml-2">
        {status.toUpperCase()}
      </Badge>
    );
  };

  const successCount = tests.filter(t => t.status === 'success').length;
  const errorCount = tests.filter(t => t.status === 'error').length;
  const warningCount = tests.filter(t => t.status === 'warning').length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Frontend Integration Test</CardTitle>
          <CardDescription>
            Test the integration between React frontend and SiteGuard backend services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button 
                onClick={runTests} 
                disabled={isRunning}
                className="w-full sm:w-auto"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Tests...
                  </>
                ) : (
                  'Run Integration Tests'
                )}
              </Button>
              
              {tests.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="text-green-600">✓ {successCount}</span>
                  <span className="text-yellow-600">⚠ {warningCount}</span>
                  <span className="text-red-600">✗ {errorCount}</span>
                </div>
              )}
            </div>

            {isRunning && currentTest && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Currently running: {currentTest}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              {tests.map((test, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {getStatusIcon(test.status)}
                      <span className="ml-2 font-medium">{test.name}</span>
                      {getStatusBadge(test.status)}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{test.message}</p>
                  {test.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-500 cursor-pointer">
                        View Details
                      </summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(test.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FrontendComponentTest;
