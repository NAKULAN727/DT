const mongoose = require('mongoose');

const LocationVoteSchema = new mongoose.Schema({
  locationName: { type: String, required: true },
  lat: { type: Number, default: 0 },
  lng: { type: Number, default: 0 },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 },
  votes: [{
    blockchainId: String,
    type: { type: String, enum: ['up', 'down'] },
    comment: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LocationVote', LocationVoteSchema);
