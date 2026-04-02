import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import gsap from 'gsap';

function MapFocus({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom(), { animate: true, duration: 1.5 });
  }, [position, map]);
  return null;
}

// Fetch cell towers + telecom infrastructure from Overpass API around a point
async function fetchTowers(lat, lng, radiusM = 2000) {
  const query = `
    [out:json][timeout:15];
    (
      node["tower:type"="communication"](around:${radiusM},${lat},${lng});
      node["man_made"="tower"](around:${radiusM},${lat},${lng});
      node["man_made"="mast"](around:${radiusM},${lat},${lng});
      node["communication:mobile_phone"="yes"](around:${radiusM},${lat},${lng});
      node["telecom"="exchange"](around:${radiusM},${lat},${lng});
    );
    out body;
  `;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  const data = await res.json();
  return data.elements || [];
}

// Heatmap layer component — renders inside MapContainer
function TowerHeatmap({ towers }) {
  const map = useMap();
  const heatRef = useRef(null);

  useEffect(() => {
    if (!towers.length) return;

    // Build heatmap points: [lat, lng, intensity]
    const points = towers.map(t => [t.lat, t.lon, 1.0]);

    if (heatRef.current) {
      map.removeLayer(heatRef.current);
    }

    heatRef.current = L.heatLayer(points, {
      radius: 35,
      blur: 25,
      maxZoom: 17,
      max: 1.0,
      gradient: {
        0.0: '#1e3a5f',   // deep blue — no signal
        0.3: '#1d4ed8',   // blue — weak
        0.5: '#16a34a',   // green — moderate
        0.7: '#ca8a04',   // yellow — good
        1.0: '#dc2626'    // red — dense towers / strong coverage
      }
    }).addTo(map);

    return () => {
      if (heatRef.current) map.removeLayer(heatRef.current);
    };
  }, [towers, map]);

  return null;
}

const pulseIcon = L.divIcon({
  className: 'user-marker-container',
  html: `<div class="location-pulse map-element" id="user-pulse"></div>
         <div class="location-marker map-element" id="user-location"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function GeoMap({ position, accuracy, safeZone, dangerZone }) {
  const [towers, setTowers] = useState([]);
  const [towerStatus, setTowerStatus] = useState('idle'); // idle | loading | done | error
  const lastFetchPos = useRef(null);

  useEffect(() => {
    gsap.fromTo('.location-pulse',
      { scale: 1, opacity: 0.8 },
      { scale: 3.5, opacity: 0, duration: 1.5, repeat: -1, ease: 'power2.out' }
    );
  }, []);

  // Fetch towers only when user moves >300m from last fetch point
  useEffect(() => {
    if (!position || !navigator.onLine) return;

    const [lat, lng] = position;
    if (lastFetchPos.current) {
      const [plat, plng] = lastFetchPos.current;
      const R = 6371e3;
      const dLat = (lat - plat) * Math.PI / 180;
      const dLon = (lng - plng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(plat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (dist < 300) return; // skip if moved less than 300m
    }

    lastFetchPos.current = position;
    setTowerStatus('loading');

    fetchTowers(lat, lng, 2000)
      .then(data => {
        setTowers(data);
        setTowerStatus('done');
      })
      .catch(() => setTowerStatus('error'));
  }, [position]);

  if (!position) return null;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>

      {/* Heatmap legend */}
      <div style={{
        position: 'absolute', bottom: 24, left: 16, zIndex: 1000,
        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
        padding: '10px 14px', minWidth: 160
      }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', marginBottom: 8 }}>
          📡 Cell Tower Coverage
        </div>
        {[
          { color: '#dc2626', label: 'Dense — Excellent call' },
          { color: '#ca8a04', label: 'Good coverage' },
          { color: '#16a34a', label: 'Moderate signal' },
          { color: '#1d4ed8', label: 'Weak signal' },
          { color: '#1e3a5f', label: 'No towers nearby' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: '0.68rem', color: '#cbd5e1' }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: 8, fontSize: '0.62rem', color: '#475569' }}>
          {towerStatus === 'loading' && '⏳ Scanning towers...'}
          {towerStatus === 'done' && `✓ ${towers.length} tower${towers.length !== 1 ? 's' : ''} found`}
          {towerStatus === 'error' && '⚠ Could not fetch towers'}
          {towerStatus === 'idle' && 'Waiting for GPS...'}
        </div>
      </div>

      <MapContainer
        center={position}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapFocus position={position} />

        {/* Cell Tower Heatmap */}
        {towers.length > 0 && <TowerHeatmap towers={towers} />}

        {/* Accuracy Circle */}
        {accuracy && (
          <Circle center={position} radius={accuracy} pathOptions={{
            color: 'rgba(59,130,246,0.6)', fillColor: 'rgba(59,130,246,0.1)',
            fillOpacity: 0.1, weight: 1, interactive: false
          }} />
        )}

        {/* Safe Zone */}
        {safeZone && (
          <Circle center={safeZone.center} radius={safeZone.radius} pathOptions={{
            color: 'rgba(16,185,129,0.5)', fillColor: 'rgba(16,185,129,0.15)',
            fillOpacity: 0.2, dashArray: '5, 5', weight: 1.5
          }} />
        )}

        {/* Danger Zone */}
        {dangerZone && (
          <Circle center={dangerZone.center} radius={dangerZone.radius} pathOptions={{
            color: 'rgba(239,68,68,0.5)', fillColor: 'rgba(239,68,68,0.15)',
            fillOpacity: 0.2, dashArray: '5, 5', weight: 1.5
          }} />
        )}

        {/* User Marker */}
        <Marker position={position} icon={pulseIcon} zIndexOffset={1000} />
      </MapContainer>
    </div>
  );
}
