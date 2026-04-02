# SafeSphere — Smart Tourist Safety Monitoring System

A full-stack blockchain-powered tourist identity and real-time safety monitoring platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, GSAP, Leaflet |
| Backend | Node.js, Express 5, Mongoose |
| Database | MongoDB Atlas |
| Blockchain | Ethers.js (wallet generation) |
| Auth | Blockchain ID (wallet address) |

## Features

- **Blockchain Registration** — Generates a unique Ethereum wallet address as the tourist's immutable identity
- **QR Code Issuance** — Public blockchain ID QR + private wallet QR on registration
- **Real Login** — Authenticate using your blockchain wallet address against MongoDB
- **Live GPS Tracking** — Real-time location with high-accuracy geolocation API
- **Geo-fencing** — Dynamic safe/danger zones with automatic status updates
- **AI Safety Assessment** — Live status badge (SAFE / ALERT) based on zone proximity
- **SOS Emergency Broadcast** — One-tap emergency alert with GPS coordinates
- **Profile Dashboard** — Verified user card with blockchain badge and travel details

## Project Structure

```
DT/
├── backend/
│   ├── models/Tourist.js     # Mongoose schema
│   ├── server.js             # Express API (register + login)
│   └── .env                  # MongoDB URI
└── src/
    ├── components/Map.jsx    # Leaflet geo-fencing map
    ├── App.jsx               # Auth state management
    ├── Auth.jsx              # Login + Registration UI
    ├── Dashboard.jsx         # Main safety dashboard
    └── style.css             # Global styles
```

## Getting Started

### 1. Backend

```bash
cd backend
npm install
npm start
# Server runs on http://localhost:5000
```

### 2. Frontend

```bash
# From project root
npm install
npm run dev
# App runs on http://localhost:5173
```

## API Reference

### `POST /api/register-tourist`

Registers a new tourist, generates a blockchain wallet, saves to MongoDB, returns QR codes.

**Body:** Tourist form data (name, passport, nationality, phone, email, travel dates, emergency contacts, etc.)

**Response:**
```json
{
  "success": true,
  "blockchainId": "0x...",
  "blockchainQR": "data:image/png;base64,...",
  "walletQR": "data:image/png;base64,..."
}
```

### `POST /api/login`

Authenticates a tourist by their blockchain wallet address.

**Body:** `{ "blockchainId": "0x..." }`

**Response:**
```json
{
  "success": true,
  "user": { "name": "...", "blockchainId": "0x...", ... }
}
```

## Security Notes

- Private keys are **never stored** in the database
- Only the public wallet address (`blockchainId`) is persisted
- Users must save their private key QR code — it cannot be recovered

## Environment Variables

```env
# backend/.env
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/smartTourism
PORT=5000
```
