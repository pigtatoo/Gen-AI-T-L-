const axios = require('axios');
require('dotenv').config();

async function testDeepSeek() {
  console.log('Testing DeepSeek API...\n');
  
  const apiKey = process.env.DEEPSEEK_KEY;
  console.log('API Key present:', !!apiKey);
  if (!apiKey) {
    console.error('ERROR: DEEPSEEK_KEY not found in .env');
    return;
  }

  try {
    console.log('Sending request to https://api.deepseek.com/chat/completions');
    console.log('Model: deepseek-chat');
    console.log('Timeout: 30000ms\n');

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: 'Write a brief hello world example'
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✓ SUCCESS! Response received:');
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
  } catch (err) {
    console.error('✗ ERROR:');
    console.error('Message:', err.message);
    console.error('Status:', err.response?.status);
    console.error('Status Text:', err.response?.statusText);
    console.error('Error Response:', err.response?.data);
    if (err.response?.data?.error) {
      console.error('\nAPI Error Details:');
      console.error(JSON.stringify(err.response.data.error, null, 2));
    }
  }
}

testDeepSeek();
