const mongoose = require('mongoose');

const TouristSchema = new mongoose.Schema({
  // Section 1: IDENTITY
  name: { type: String, required: true },
  gender: { type: String },
  age: { type: Number },
  dob: { type: Date },
  nationality: { type: String },
  passport: { type: String },
  govId: { type: String },
  phone: { type: String },
  email: { type: String },
  address: { type: String },

  // Section 2: TRIP
  travelStart: { type: Date },
  travelEnd: { type: Date },
  hotel: { type: String },
  accommodation: { type: String },
  transport: { type: String },
  insurance: { type: String },
  itinerary: { type: String },

  // Section 3: EMERGENCY
  emergencyContacts: {
    localName: String,
    localPhone: String,
    familyName: String,
    familyPhone: String,
    medicalName: String,
    medicalPhone: String
  },

  // Section 4: HEALTH
  healthDetails: {
    bloodGroup: String,
    specialAssistance: String,
    medicalConditions: String
  },

  // Section 5: FAMILY
  familyMembers: [{
    name: String,
    passport: String,
    nationality: String,
    age: Number
  }],

  blockchainId: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tourist', TouristSchema);
