import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

const API_URL = 'http://localhost:3001';
let authToken = '';

// Test newsletter endpoints
async function testNewsletterEndpoints() {
  try {
    console.log('🧪 Testing Newsletter Endpoints\n');

    // 1. Subscribe to newsletter
    console.log('1️⃣ Testing newsletter subscription...');
    const subscribeRes = await axios.post(`${API_URL}/api/newsletter/subscribe`, {
      email: 'test@example.com',
      name: 'Test User'
    });
    console.log('✅ Subscription successful:', subscribeRes.data.message);

    // 2. Get auth token (replace with your admin credentials)
    console.log('\n2️⃣ Getting auth token...');
    const authRes = await axios.post(`${API_URL}/api/auth`, {
      username: 'admin',
      password: 'your-password'
    });
    authToken = authRes.data.token;
    console.log('✅ Auth token received');

    // 3. Upload newsletter (requires PDF file)
    // Uncomment if you have a test PDF file
    /*
    console.log('\n3️⃣ Uploading newsletter...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('./test-newsletter.pdf'));
    formData.append('title', 'Test Newsletter Issue');
    formData.append('description', 'This is a test newsletter');
    
    const uploadRes = await axios.post(`${API_URL}/api/newsletter/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('✅ Newsletter uploaded:', uploadRes.data.newsletter._id);
    */

    // 4. List newsletters
    console.log('\n4️⃣ Listing newsletters...');
    const listRes = await axios.get(`${API_URL}/api/newsletter/list`);
    console.log('✅ Found newsletters:', listRes.data.length);
    
    if (listRes.data.length > 0) {
      const newsletterId = listRes.data[0]._id;
      
      // 5. Get single newsletter
      console.log('\n5️⃣ Getting single newsletter...');
      const singleRes = await axios.get(`${API_URL}/api/newsletter/${newsletterId}`);
      console.log('✅ Newsletter retrieved:', singleRes.data.title);
    }

    // 6. Get subscribers (admin)
    console.log('\n6️⃣ Getting subscribers...');
    const subscribersRes = await axios.get(`${API_URL}/api/newsletter`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    console.log('✅ Total subscribers:', subscribersRes.data.length);

    console.log('\n✨ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testNewsletterEndpoints();
