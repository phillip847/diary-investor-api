import axios from 'axios';

const API_URL = 'https://diary-investor-api.vercel.app';

async function testSubscription() {
  try {
    console.log('🧪 Testing Newsletter Subscription\n');
    
    const response = await axios.post(`${API_URL}/api/newsletter/subscribe`, {
      email: 'test@example.com',
      name: 'Test User'
    });
    
    console.log('✅ Subscription successful!');
    console.log('📧 Welcome email sent to:', response.data.subscriber.email);
    console.log('Response:', response.data.message);
    
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error === 'Email already subscribed') {
      console.log('ℹ️  Email already subscribed (this is expected if testing multiple times)');
    } else {
      console.error('❌ Test failed:', error.response?.data || error.message);
    }
  }
}

testSubscription();
