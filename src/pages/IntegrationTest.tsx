import React from 'react';
import FrontendComponentTest from '@/test/frontend-component-test';

const IntegrationTest: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Integration Test Suite</h1>
        <p className="text-gray-600 mt-2">
          Test the integration between the React frontend and SiteGuard backend services.
        </p>
      </div>
      
      <FrontendComponentTest />
    </div>
  );
};

export default IntegrationTest;
