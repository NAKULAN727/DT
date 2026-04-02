import { useState, useEffect, useCallback } from 'react';
import { getSOSQueue, clearSOSQueue } from '../utils/offlineDB';

// OpenCelliD / opencellid compatible free API via Mozilla Location Service
const TOWER_API = 'https://location.services.mozilla.com/v1/geolocate?key=test';

function getSignalInfo() {
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!conn) return { type: 'UNKNOWN', downlink: null, rtt: null, label: '?' };
  const type = (conn.effectiveType || '').toUpperCase(); // 4G, 3G, 2G, SLOW-2G
  return {
    type: type || 'UNKNOWN',
    downlink: conn.downlink,
    rtt: conn.rtt,
    label: type === '4G' ? '4G' : type === '3G' ? '3G' : type === '2G' ? '2G' : type === 'SLOW-2G' ? 'EDGE' : '?'
  };
}

async function syncSOSQueue() {
  try {
    const queue = await getSOSQueue();
    if (!queue.length) return 0;
    const res = await fetch('/api/sos-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alerts: queue })
    });
    if (res.ok) {
      await clearSOSQueue();
      return queue.length;
    }
    return 0;
  } catch {
    return 0;
  }
}

async function fetchNearestTower(lat, lng) {
  try {
    const res = await fetch(TOWER_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: false, wifiAccessPoints: [], cellTowers: [] })
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.location) {
      const R = 6371e3;
      const dLat = (data.location.lat - lat) * Math.PI / 180;
      const dLon = (data.location.lng - lng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * Math.PI / 180) * Math.cos(data.location.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { lat: data.location.lat, lng: data.location.lng, distanceM: Math.round(dist) };
    }
    return null;
  } catch {
    return null;
  }
}

export default function useNetwork(position) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [signal, setSignal] = useState(getSignalInfo());
  const [lastOnlineType, setLastOnlineType] = useState(null);
  const [nearestTower, setNearestTower] = useState(null);
  const [syncedCount, setSyncedCount] = useState(0);

  // Online / offline events
  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      setSignal(getSignalInfo());
      const count = await syncSOSQueue();
      if (count > 0) setSyncedCount(count);
    };
    const goOffline = () => {
      setLastOnlineType(signal.label);
      setIsOnline(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [signal.label]);

  // Live signal quality updates
  useEffect(() => {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return;
    const update = () => setSignal(getSignalInfo());
    conn.addEventListener('change', update);
    return () => conn.removeEventListener('change', update);
  }, []);

  // Nearest tower lookup when GPS available and online
  useEffect(() => {
    if (!position || !isOnline) return;
    fetchNearestTower(position[0], position[1]).then(setNearestTower);
  }, [position?.[0], position?.[1], isOnline]);

  // Clear synced notification after 4s
  useEffect(() => {
    if (!syncedCount) return;
    const t = setTimeout(() => setSyncedCount(0), 4000);
    return () => clearTimeout(t);
  }, [syncedCount]);

  return { isOnline, signal, lastOnlineType, nearestTower, syncedCount };
}
