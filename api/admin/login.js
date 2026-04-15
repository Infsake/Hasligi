const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { connectDB, hasMongoURI } = require('../db');
const { Admin } = require('../models');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Şifre gereklidir' });
    }

    let authSuccess = false;

    if (hasMongoURI) {
      try {
        await connectDB();
        const admin = await Admin.findOne({ username: 'admin' });
        if (admin && await bcrypt.compare(password, admin.password)) {
          authSuccess = true;
        }
      } catch (dbError) {
        console.log('MongoDB admin kontrolü başarısız:', dbError.message);
      }
    }

    if (!authSuccess) {
      const adminConfigPath = path.join(process.cwd(), 'db', 'admin.json');
      try {
        if (fs.existsSync(adminConfigPath)) {
          const adminConfig = JSON.parse(fs.readFileSync(adminConfigPath, 'utf8'));
          if (adminConfig.password && password === adminConfig.password) {
            authSuccess = true;
          }
        }
      } catch (fileError) {
        console.error('File read error:', fileError);
        return res.status(500).json({ error: 'Dosya okuma hatası' });
      }
    }

    if (authSuccess) {
      return res.json({ success: true });
    }

    res.status(401).json({ error: 'Yanlış şifre' });
  } catch (err) {
    console.error('Admin login error:', err);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};