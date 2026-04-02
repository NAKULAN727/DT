require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { ethers } = require('ethers');
const QRCode = require('qrcode');

const Tourist = require('./models/Tourist');
const LocationVote = require('./models/LocationVote');

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

// Get all location votes (sorted by total votes)
app.get('/api/votes', async (req, res) => {
  try {
    const locations = await LocationVote.find().sort({ createdAt: -1 });
    res.json({ success: true, locations });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Submit a vote for a location
app.post('/api/votes', async (req, res) => {
  try {
    const { locationName, lat, lng, voteType, blockchainId, comment } = req.body;
    if (!locationName || !voteType || !blockchainId)
      return res.status(400).json({ success: false, error: 'Missing required fields' });

    // Upsert location document
    let location = await LocationVote.findOne({ locationName });
    if (!location) {
      location = await LocationVote.create({
        locationName,
        lat: lat || 0,
        lng: lng || 0,
        upvotes: 0,
        downvotes: 0,
        votes: []
      });
    }

    // Check if user already voted
    const existingVote = location.votes.find(v => v.blockchainId === blockchainId);
    if (existingVote) {
      if (existingVote.type !== voteType) {
        if (existingVote.type === 'up') { location.upvotes--; location.downvotes++; }
        else { location.downvotes--; location.upvotes++; }
        existingVote.type = voteType;
        existingVote.comment = comment || '';
        existingVote.timestamp = new Date();
      } else {
        return res.status(400).json({ success: false, error: 'Already voted for this location' });
      }
    } else {
      if (voteType === 'up') location.upvotes++;
      else location.downvotes++;
      location.votes.push({ blockchainId, type: voteType, comment: comment || '' });
    }

    await location.save();
    res.json({ success: true, location });
  } catch (error) {
    console.error('Vote Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// SOS Sync Route — receives queued offline SOS alerts
app.post('/api/sos-sync', async (req, res) => {
  try {
    const { alerts } = req.body;
    if (!alerts || !alerts.length)
      return res.status(400).json({ success: false, error: 'No alerts provided' });

    // Update each tourist's last SOS timestamp in DB
    for (const alert of alerts) {
      if (alert.blockchainId) {
        await Tourist.findOneAndUpdate(
          { blockchainId: alert.blockchainId },
          { $push: { sosHistory: { location: alert.location, timestamp: alert.timestamp, networkType: alert.networkType } } }
        );
      }
    }
    res.json({ success: true, synced: alerts.length });
  } catch (error) {
    console.error('SOS Sync Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Smart Tourism Backend running on port ${PORT}`);
});
