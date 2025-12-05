// Simple test script to verify endpoints
import fetch from 'node-fetch';

const BASE_URL = 'https://diary-investor-api.vercel.app';

async function testEndpoints() {
  const endpoints = [
    '/api/health',
    '/api/articles',
    '/api/pages/hero',
    '/newsletter/subscribers'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing ${endpoint}...`);
      const response = await fetch(`${BASE_URL}${endpoint}`);
      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));
      } else {
        console.log('Error:', response.statusText);
      }
      console.log('---');
    } catch (error) {
      console.error(`Error testing ${endpoint}:`, error.message);
    }
  }
}

testEndpoints();