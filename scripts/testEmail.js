require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { sendVerificationEmail } = require('../services/emailService');

const testEmail = async () => {
    try {
        console.log('Sending test email...');
        await sendVerificationEmail(process.env.EMAIL_USER, 'TEST_TOKEN_123');
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testEmail();
