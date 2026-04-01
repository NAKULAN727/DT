import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import gsap from 'gsap';

// A component to auto-center the map when the user position changes
function MapFocus({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom(), {
        animate: true,
        duration: 1.5
      });
    }
  }, [position, map]);
  return null;
}

// Custom pulsing icon for user location
const pulseIcon = L.divIcon({
  className: 'user-marker-container',
  html: `<div class="location-pulse map-element" id="user-pulse"></div>
         <div class="location-marker map-element" id="user-location"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

export default function GeoMap({ position, accuracy, safeZone, dangerZone }) {
  const mapRef = useRef(null);

  useEffect(() => {
    // Pulse animation logic
    gsap.fromTo('.location-pulse', 
      { scale: 1, opacity: 0.8 },
      { scale: 3.5, opacity: 0, duration: 1.5, repeat: -1, ease: 'power2.out' }
    );
  }, []); // Run once on mount

  if (!position) return null;

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }} className="gsap-map-container">
      <MapContainer 
        center={position} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapFocus position={position} />

        {/* Accuracy Circle */}
        {accuracy && (
          <Circle
            center={position}
            radius={accuracy}
            pathOptions={{
              color: 'var(--accent-blue)',
              fillColor: 'var(--accent-blue)',
              fillOpacity: 0.1,
              weight: 1,
              interactive: false
            }}
          />
        )}

        {/* Safe Zone */}
        {safeZone && (
          <Circle 
            center={safeZone.center} 
            radius={safeZone.radius} 
            pathOptions={{ 
              color: 'rgba(16, 185, 129, 0.5)', 
              fillColor: 'rgba(16, 185, 129, 0.15)', 
              fillOpacity: 0.2, 
              dashArray: '5, 5', 
              weight: 1.5 
            }} 
          />
        )}

        {/* Danger Zone */}
        {dangerZone && (
          <Circle 
            center={dangerZone.center} 
            radius={dangerZone.radius} 
            pathOptions={{ 
              color: 'rgba(239, 68, 68, 0.5)', 
              fillColor: 'rgba(239, 68, 68, 0.15)', 
              fillOpacity: 0.2, 
              dashArray: '5, 5', 
              weight: 1.5 
            }} 
          />
        )}

        {/* User Marker */}
        <Marker position={position} icon={pulseIcon} zIndexOffset={1000} />
      </MapContainer>
    </div>
  );
}
