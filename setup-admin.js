require('dotenv').config();
const bcrypt = require('bcrypt');
const { connectDB } = require('./api/db');
const { Admin } = require('./api/models');

async function setupAdmin() {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    const adminPassword = '!HL!qy_yp&!2026i'; // Current password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = new Admin({
      username: 'admin',
      password: hashedPassword
    });

    await admin.save();
    console.log('Admin user created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up admin:', error);
    process.exit(1);
  }
}

setupAdmin();