const axios = require('axios');

async function testForgotPassword() {
    const API_URL = 'http://localhost:3000/api/auth';
    const testEmail = 'bashirahmed439@gmail.com'; // Adjust to an existing user if needed

    try {
        console.log('--- Testing Forgot Password ---');
        const forgotRes = await axios.post(`${API_URL}/forgot-password`, { email: testEmail });
        console.log('Forgot Password Response:', forgotRes.data.message);

        // In a real test, we'd need to get the OTP from the database or console
        // Since this script runs outside the server process, we'll assume the OTP generation worked
        // If the server is running, check the console for the OTP!

        console.log('\n--- IMPORTANT ---');
        console.log('Please check the server console for the 6-digit OTP.');
        console.log('To complete the test manually, use Swagger or Postman with /reset-password');
        console.log('Fields: email, otp, newPassword');

    } catch (error) {
        console.error('Test Failed:', error.response?.data?.message || error.message);
    }
}

testForgotPassword();
