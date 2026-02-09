require('dotenv').config();
const mongoose = require('mongoose');
const Country = require('./models/Country');
const City = require('./models/City');

const seedLocations = async () => {
    try {
        const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/signology';
        console.log('Connecting to MongoDB for seeding locations at:', mongoUri);

        await mongoose.connect(mongoUri);
        console.log('✅ Connected to MongoDB');

        // Asian Countries Data
        const countriesData = [
            { name: 'Pakistan', code: 'PK', phoneCode: '+92', nidName: 'CNIC', nidLength: 13, cities: ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta'] },
            { name: 'India', code: 'IN', phoneCode: '+91', nidName: 'Aadhaar Number', nidLength: 12, cities: ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat'] },
            { name: 'China', code: 'CN', phoneCode: '+86', nidName: 'Resident ID', nidLength: 18, cities: ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Tianjin', 'Wuhan', 'Dongguan'] },
            { name: 'Japan', code: 'JP', phoneCode: '+81', nidName: 'My Number', nidLength: 12, cities: ['Tokyo', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Fukuoka', 'Kobe', 'Kyoto'] },
            { name: 'Bangladesh', code: 'BD', phoneCode: '+880', nidName: 'National ID', nidLength: 13, cities: ['Dhaka', 'Chittagong', 'Khulna', 'Rajshahi', 'Barisal', 'Sylhet', 'Rangpur', 'Comilla'] },
            { name: 'Indonesia', code: 'ID', phoneCode: '+62', nidName: 'NIK', nidLength: 16, cities: ['Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang', 'Palembang', 'Makassar', 'Batam'] },
            { name: 'Saudi Arabia', code: 'SA', phoneCode: '+966', nidName: 'National ID', nidLength: 10, cities: ['Riyadh', 'Jeddah', 'Mecca', 'Medina', 'Dammam', 'Taif', 'Tabuk', 'Buraydah'] },
            { name: 'Turkey', code: 'TR', phoneCode: '+90', nidName: 'TC Kimlik', nidLength: 11, cities: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Adana', 'Gaziantep', 'Antalya', 'Konya'] },
            { name: 'Iran', code: 'IR', phoneCode: '+98', nidName: 'National Code', nidLength: 10, cities: ['Tehran', 'Mashhad', 'Isfahan', 'Karaj', 'Shiraz', 'Tabriz', 'Qom', 'Ahvaz'] },
            { name: 'Thailand', code: 'TH', phoneCode: '+66', nidName: 'ID Card Number', nidLength: 13, cities: ['Bangkok', 'Nonthaburi', 'Nakhon Ratchasima', 'Chiang Mai', 'Hat Yai', 'Udon Thani', 'Pak Kret', 'Khon Kaen'] },
            { name: 'Vietnam', code: 'VN', phoneCode: '+84', nidName: 'Citizen ID', nidLength: 12, cities: ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Hai Phong', 'Bien Hoa', 'Can Tho', 'Nha Trang', 'Buon Ma Thuot'] },
            { name: 'Malaysia', code: 'MY', phoneCode: '+60', nidName: 'MyKad', nidLength: 12, cities: ['Kuala Lumpur', 'George Town', 'Ipoh', 'Shah Alam', 'Petaling Jaya', 'Johor Bahru', 'Malacca City', 'Kota Kinabalu'] },
            { name: 'Philippines', code: 'PH', phoneCode: '+63', nidName: 'PhilSys ID', nidLength: 12, cities: ['Quezon City', 'Manila', 'Davao City', 'Caloocan', 'Cebu City', 'Zamboanga City', 'Taguig', 'Antipolo'] },
            { name: 'South Korea', code: 'KR', phoneCode: '+82', nidName: 'RRN', nidLength: 13, cities: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju', 'Suwon', 'Ulsan'] },
            { name: 'United Arab Emirates', code: 'AE', phoneCode: '+971', nidName: 'Emirates ID', nidLength: 15, cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Al Ain', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain'] }
        ];

        let countriesAdded = 0;
        let citiesAdded = 0;

        for (const data of countriesData) {
            // Check if country exists
            let country = await Country.findOne({ code: data.code });
            if (!country) {
                country = new Country({
                    name: data.name,
                    code: data.code,
                    phoneCode: data.phoneCode,
                    nidName: data.nidName,
                    nidLength: data.nidLength
                });
                await country.save();
                countriesAdded++;
                console.log(`Added Country: ${data.name}`);
            } else {
                console.log(`Country exists: ${data.name}`);
                // Sync new fields
                let updated = false;
                if (country.phoneCode !== data.phoneCode) { country.phoneCode = data.phoneCode; updated = true; }
                if (country.nidName !== data.nidName) { country.nidName = data.nidName; updated = true; }
                if (country.nidLength !== data.nidLength) { country.nidLength = data.nidLength; updated = true; }

                if (updated) await country.save();
            }

            // Sync Cities
            for (const cityName of data.cities) {
                const existingCity = await City.findOne({ name: cityName, country: country._id });
                if (!existingCity) {
                    await new City({
                        name: cityName,
                        country: country._id
                    }).save();
                    citiesAdded++;
                }
            }
        }

        console.log(`✅ Seed Completed!`);
        console.log(`Countries Added: ${countriesAdded}`);
        console.log(`Cities Added: ${citiesAdded}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding Error:', error);
        process.exit(1);
    }
};

seedLocations();
