const axios = require('axios');

async function seedForex() {
    try {
        const response = await axios.post('http://localhost:3000/api/forex/seed');
        console.log('Seeding result:', response.data);
    } catch (error) {
        console.error('Seeding failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

seedForex();
