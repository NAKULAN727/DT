require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ethers } = require('ethers');
const QRCode = require('qrcode');

const Tourist = require('./models/Tourist');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/smartTourism";
mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Connected to smartTourism'))
  .catch(err => console.error('MongoDB connection error:', err));

// Register Route
app.post('/api/register-tourist', async (req, res) => {
  try {
    const formData = req.body;

    // 1. Generate Wallet
    const wallet = ethers.Wallet.createRandom();
    const blockchainId = wallet.address;
    const privateKey = wallet.privateKey; // NEVER SAVED TO DB

    // 2. Map and Save to MongoDB
    const newTourist = new Tourist({
      name: formData.name,
      gender: formData.gender,
      age: formData.age,
      dob: formData.dob,
      nationality: formData.nationality,
      passport: formData.passport,
      govId: formData.govId,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,

      travelStart: formData.travelStart,
      travelEnd: formData.travelEnd,
      hotel: formData.hotel,
      accommodation: formData.accommodation,
      transport: formData.transport,
      insurance: formData.insurance,
      itinerary: formData.itinerary,

      emergencyContacts: formData.emergencyContacts,
      healthDetails: formData.healthDetails,
      familyMembers: formData.familyMembers,

      blockchainId: blockchainId
    });
    
    await newTourist.save();

    // 3. Generate QR Codes
    const blockchainQR = await QRCode.toDataURL(blockchainId);
    
    const walletQRData = JSON.stringify({ address: blockchainId, privateKey });
    const walletQR = await QRCode.toDataURL(walletQRData);

    const txHash = "0x" + Math.random().toString(16).slice(2) + "faek...simulatedTx";

    res.json({
      success: true,
      blockchainId,
      txHash,
      blockchainQR,
      walletQR
    });
  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { blockchainId } = req.body;
    
    if (!blockchainId) {
      return res.status(400).json({ success: false, error: 'Blockchain ID required' });
    }

    const user = await Tourist.findOne({ blockchainId });

    if (user) {
      res.json({ success: true, user });
    } else {
      res.status(404).json({ success: false, error: 'User not found in smartTourism network' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, error: 'Server error during login' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Tourism Backend running on port ${PORT}`);
});
