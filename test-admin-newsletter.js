import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testAdminNewsletter() {
  try {
    // First, get an admin token
    console.log('1. Getting admin token...');
    const authResponse = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123'
      })
    });

    if (!authResponse.ok) {
      console.error('Auth failed:', await authResponse.text());
      return;
    }

    const { token } = await authResponse.json();
    console.log('✓ Got admin token');

    // Test the admin newsletter endpoint
    console.log('2. Testing admin newsletter endpoint...');
    const newsletterResponse = await fetch(`${API_BASE}/api/admin/newsletter`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    console.log('Response status:', newsletterResponse.status);
    
    if (newsletterResponse.ok) {
      const newsletters = await newsletterResponse.json();
      console.log('✓ Admin newsletter endpoint working');
      console.log('Newsletters found:', newsletters.length);
    } else {
      const error = await newsletterResponse.text();
      console.error('✗ Admin newsletter endpoint failed:', error);
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAdminNewsletter();