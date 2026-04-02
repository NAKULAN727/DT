import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  MapPin, Bell, User, LogOut, Bot, ShieldAlert, Award,
  AlertTriangle, CheckCircle, NavigationOff, Wifi, WifiOff,
  Signal, RefreshCw, Radio, ThumbsUp
} from 'lucide-react';
import GeoMap from './components/Map';
import useNetwork from './hooks/useNetwork';
import { queueSOS, cacheSet, cacheGet } from './utils/offlineDB';
import SafetyVoting from './pages/SafetyVoting';

function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Signal badge config
const SIGNAL_CONFIG = {
  '4G':      { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', bars: 4 },
  '3G':      { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', bars: 3 },
  '2G':      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', bars: 2 },
  'EDGE':    { color: '#f97316', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', bars: 1 },
  'OFFLINE': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.3)',  bars: 0 },
  'UNKNOWN': { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', bars: 2 },
};

function SignalBars({ bars, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 16 }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: 4,
          height: 4 + i * 3,
          borderRadius: 2,
          background: i <= bars ? color : 'rgba(255,255,255,0.15)',
          transition: 'background 0.4s'
        }} />
      ))}
    </div>
  );
}

export default function Dashboard({ onLogout }) {
  const [position, setPosition] = useState(null);
  const [accuracy, setAccuracy] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeView, setActiveView] = useState('map'); // 'map' | 'profile' | 'voting'
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('SAFE');
  const [sosActive, setSosActive] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'safe', title: 'System Online & GPS Secured', time: 'Just now' }
  ]);
  const [zones, setZones] = useState({ safe: null, danger: null });

  const appRef = useRef(null);
  const rightPanelRef = useRef(null);
  const alertBadgeRef = useRef(null);
  const mapContainerRef = useRef(null);

  const { isOnline, signal, lastOnlineType, nearestTower, syncedCount } = useNetwork(position);
  const signalKey = isOnline ? (signal.label || 'UNKNOWN') : 'OFFLINE';
  const sigCfg = SIGNAL_CONFIG[signalKey] || SIGNAL_CONFIG['UNKNOWN'];

  // Load user + cache
  useEffect(() => {
    const rawUser = localStorage.getItem('safeSphereUser');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      setUser(u);
      cacheSet('user', u);
    } else {
      cacheGet('user').then(u => { if (u) setUser(u); });
    }

    gsap.fromTo(appRef.current, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' });
    gsap.fromTo('.sidebar', { x: -80 }, { x: 0, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo('.right-panel', { x: 400 }, { x: 0, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo('.nav-item', { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.1, delay: 0.4 });
    gsap.fromTo('.panel-card-anim', { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.15, delay: 0.5, ease: 'back.out(1.2)' });
  }, []);

  // Cache zones when set
  useEffect(() => {
    if (zones.safe && zones.danger) cacheSet('zones', zones);
  }, [zones]);

  // Map fade-in
  useEffect(() => {
    if (position && mapContainerRef.current) {
      gsap.fromTo(mapContainerRef.current,
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }
      );
    }
  }, [position && !zones.safe]);

  // GPS tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setErrorMsg('Unable to fetch location. Please enable GPS.');
      return;
    }
    const handleSuccess = (pos) => {
      const { latitude, longitude, accuracy: locAcc } = pos.coords;
      const newPos = [latitude, longitude];
      setErrorMsg(null);
      setPosition(newPos);
      setAccuracy(locAcc);
      setZones(prev => {
        if (!prev.safe && !prev.danger) {
          return {
            safe: { center: newPos, radius: 200 },
            danger: { center: [latitude - 0.003, longitude + 0.003], radius: 300 }
          };
        }
        return prev;
      });
    };
    const handleError = (err) => {
      setErrorMsg(err.code === 1
        ? 'Location access required for safety monitoring'
        : 'Unable to fetch location. Please enable GPS.'
      );
      // Try loading cached zones when GPS fails
      cacheGet('zones').then(z => { if (z) setZones(z); });
    };
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 0
    });
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 10000
    });
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // AI safety status
  useEffect(() => {
    if (!position || !zones.danger || !zones.safe || sosActive) return;
    const distToDanger = getDistanceFromLatLonInM(position[0], position[1], zones.danger.center[0], zones.danger.center[1]);
    const distToSafe = getDistanceFromLatLonInM(position[0], position[1], zones.safe.center[0], zones.safe.center[1]);
    let newStatus = status;
    if (distToDanger <= zones.danger.radius) newStatus = 'ALERT';
    else if (distToSafe <= zones.safe.radius) newStatus = 'SAFE';
    if (newStatus !== status) {
      setStatus(newStatus);
      if (alertBadgeRef.current)
        gsap.fromTo(alertBadgeRef.current, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      setAlerts(prev => [{
        id: Date.now(), type: newStatus === 'ALERT' ? 'danger' : 'safe',
        title: newStatus === 'ALERT' ? 'Warning: Entering Danger Zone' : 'Returned to Safe Zone',
        time: 'Just now'
      }, ...prev]);
    }
  }, [position, zones, status, sosActive]);

  // Show sync notification in alerts
  useEffect(() => {
    if (syncedCount > 0) {
      setAlerts(prev => [{
        id: Date.now(), type: 'info',
        title: `✓ ${syncedCount} offline SOS alert${syncedCount > 1 ? 's' : ''} synced to server`,
        time: 'Just now'
      }, ...prev]);
    }
  }, [syncedCount]);

  const handleSOS = async () => {
    if (sosActive) return;
    setSosActive(true);
    setStatus('ALERT');

    gsap.to('#sos-btn-inner', { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:rgba(239,68,68,0.35);z-index:9999;pointer-events:none';
    document.body.appendChild(flash);
    gsap.to(flash, { opacity: 0, duration: 0.4, repeat: 4, yoyo: true, onComplete: () => flash.remove() });

    const locStr = position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Unknown';
    const sosPayload = {
      blockchainId: user?.blockchainId,
      name: user?.name,
      location: locStr,
      timestamp: new Date().toISOString(),
      networkType: signalKey
    };

    if (isOnline) {
      try {
        await fetch('/api/sos-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ alerts: [sosPayload] })
        });
        setAlerts(prev => [{ id: Date.now(), type: 'danger', title: `🚨 SOS sent — Location [${locStr}]`, time: 'Just now' }, ...prev]);
      } catch {
        await queueSOS(sosPayload);
        setAlerts(prev => [{ id: Date.now(), type: 'danger', title: `⚠ SOS queued offline — will sync when online`, time: 'Just now' }, ...prev]);
      }
    } else {
      await queueSOS(sosPayload);
      setAlerts(prev => [{ id: Date.now(), type: 'danger', title: `📴 OFFLINE — SOS saved, will auto-send when network returns`, time: 'Just now' }, ...prev]);
    }

    setTimeout(() => setSosActive(false), 6000);
  };

  const handleLogoutClick = () => {
    if (window.confirm('Securely log out of SafeSphere?')) {
      localStorage.removeItem('safeSphereUser');
      gsap.to(appRef.current, { opacity: 0, scale: 0.98, duration: 0.5, onComplete: onLogout });
    }
  };

  return (
    <div className="dashboard-layout" ref={appRef}>

      {/* ── OFFLINE BANNER ── */}
      {!isOnline && (
        <div className="offline-banner">
          <WifiOff size={15} />
          <span>OFFLINE MODE</span>
          {lastOnlineType && <span style={{ opacity: 0.7 }}>— Last signal: {lastOnlineType}</span>}
          <span style={{ marginLeft: 'auto', opacity: 0.7, fontSize: '0.7rem' }}>GPS active · SOS queued locally</span>
        </div>
      )}

      {/* ── SYNC TOAST ── */}
      {syncedCount > 0 && (
        <div className="sync-toast">
          <RefreshCw size={13} />
          {syncedCount} offline SOS alert{syncedCount > 1 ? 's' : ''} synced
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className={`nav-item ${activeView === 'map' ? 'active' : ''}`} title="Dashboard" onClick={() => setActiveView('map')}>
          <MapPin size={24} />
        </div>
        <div className={`nav-item ${activeView === 'alerts' ? 'active' : ''}`} title="Alerts" onClick={() => setActiveView('map')}>
          <Bell size={24} />
        </div>
        <div className={`nav-item ${activeView === 'voting' ? 'active' : ''}`} title="Safety Votes" onClick={() => setActiveView('voting')}>
          <ThumbsUp size={24} />
        </div>
        <div className={`nav-item ${activeView === 'profile' ? 'active' : ''}`} title="Profile" onClick={() => setActiveView('profile')}>
          <User size={24} />
        </div>
        <div className="nav-item nav-item-bottom" title="Logout" onClick={handleLogoutClick}>
          <LogOut size={24} />
        </div>
      </div>

      {/* Main Map */}
      <div className="main-content map-section">
        {activeView === 'voting' ? (
          <SafetyVoting onBack={() => setActiveView('map')} position={position} />
        ) : activeView === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, overflowY: 'auto', backgroundColor: 'var(--bg-darker)' }}>
            <div className="glass-panel" style={{ padding: 40, maxWidth: 640, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, paddingBottom: 28, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, color: 'white', flexShrink: 0, boxShadow: '0 0 30px rgba(59,130,246,0.4)' }}>
                  {user?.name?.[0]?.toUpperCase() || 'T'}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 6, color: 'white' }}>{user?.name || 'Tourist'}</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 10 }}>{user?.nationality || 'Global Citizen'} &bull; {user?.email || ''}</p>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: '4px 12px' }}>
                    <CheckCircle size={13} color="var(--accent-safe)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-safe)', letterSpacing: 1, textTransform: 'uppercase' }}>Verified (Blockchain)</span>
                  </div>
                </div>
              </div>
              <div className="stats-grid" style={{ gap: 16, marginBottom: 24 }}>
                <div className="stat-box"><div className="stat-label">Passport ID</div><div className="stat-value" style={{ fontSize: '1rem' }}>{user?.passport || 'N/A'}</div></div>
                <div className="stat-box"><div className="stat-label">Phone</div><div className="stat-value" style={{ fontSize: '1rem' }}>{user?.phone || 'N/A'}</div></div>
                <div className="stat-box"><div className="stat-label">Travel Start</div><div className="stat-value" style={{ fontSize: '1rem' }}>{user?.travelStart ? new Date(user.travelStart).toLocaleDateString() : 'N/A'}</div></div>
                <div className="stat-box"><div className="stat-label">Travel End</div><div className="stat-value" style={{ fontSize: '1rem' }}>{user?.travelEnd ? new Date(user.travelEnd).toLocaleDateString() : 'N/A'}</div></div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 24 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Blockchain Address</div>
                <div style={{ fontFamily: 'Courier New, monospace', fontSize: '0.85rem', color: 'var(--accent-blue)', wordBreak: 'break-all', lineHeight: 1.6 }}>{user?.blockchainId || 'N/A'}</div>
              </div>
              {user?.emergencyContacts?.localName && (
                <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14, padding: '16px 20px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 600 }}>Emergency Contact</div>
                  <div style={{ fontWeight: 600 }}>{user.emergencyContacts.localName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.emergencyContacts.localPhone}</div>
                </div>
              )}
            </div>
          </div>
        ) : errorMsg ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', padding: 40 }}>
            <NavigationOff size={64} style={{ marginBottom: 20 }} />
            <h2 style={{ marginBottom: 10, fontSize: '1.5rem', color: 'white' }}>{errorMsg}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>GPS works without internet. Please allow location access in your browser.</p>
          </div>
        ) : position ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
            <GeoMap position={position} accuracy={accuracy} safeZone={zones.safe} dangerZone={zones.danger} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <div className="location-pulse" style={{ position: 'relative', top: 'auto', left: 'auto', marginBottom: 20 }} />
            <span style={{ fontSize: '1.2rem' }}>Acquiring GPS Signal...</span>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div className="right-panel" ref={rightPanelRef}>

        {/* ── SIGNAL BADGE ── */}
        <div className="signal-card panel-card-anim" style={{ background: sigCfg.bg, border: `1px solid ${sigCfg.border}`, borderRadius: 16, padding: '14px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-secondary)' }}>
              Network Signal
            </div>
            {isOnline ? <Wifi size={14} color={sigCfg.color} /> : <WifiOff size={14} color={sigCfg.color} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <SignalBars bars={sigCfg.bars} color={sigCfg.color} />
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: sigCfg.color, letterSpacing: 1 }}>{signalKey}</span>
            {signal.downlink && isOnline && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 'auto' }}>{signal.downlink} Mbps</span>
            )}
          </div>
          {signal.rtt && isOnline && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 6 }}>Ping: {signal.rtt}ms</div>
          )}
          {!isOnline && lastOnlineType && (
            <div style={{ fontSize: '0.7rem', color: sigCfg.color, marginTop: 6, fontWeight: 600 }}>
              Last signal: {lastOnlineType} · SOS queued locally
            </div>
          )}
        </div>

        {/* ── NEAREST TOWER ── */}
        {nearestTower && isOnline && (
          <div className="panel-card-anim" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Radio size={14} color="#818cf8" />
              <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, color: 'var(--text-secondary)' }}>Nearest Cell Tower</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#818cf8' }}>
              {nearestTower.distanceM < 1000
                ? `${nearestTower.distanceM} m away`
                : `${(nearestTower.distanceM / 1000).toFixed(1)} km away`}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              {nearestTower.lat.toFixed(4)}, {nearestTower.lng.toFixed(4)}
            </div>
          </div>
        )}

        {/* ID Card */}
        <div className="id-card panel-card-anim">
          <CheckCircle className="id-verified" size={20} />
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Blockchain User ID</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user?.name || 'Tourist'}</div>
          <div className="id-number" style={{ wordBreak: 'break-all' }}>ID: {user?.blockchainId || '0x...'}</div>
        </div>

        {/* AI Assessment */}
        <div className="glass-panel panel-card panel-card-anim">
          <div className="panel-header"><Bot size={18} /> AI Security Assessment</div>
          <div className="safety-score">
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Live GPS Status</span>
            <div ref={alertBadgeRef} className={`score-badge ${status === 'SAFE' ? 'status-safe' : 'status-alert'}`}>{status}</div>
          </div>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-label">Crowd Vol.</div>
              <div className="stat-value">{status === 'SAFE' ? 'Low (12%)' : 'High (85%)'}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Police Prox.</div>
              <div className="stat-value">{status === 'SAFE' ? '1.2 km' : '0.4 km'}</div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="alerts-section panel-card-anim" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header"><Bell size={18} /> Safety Activity Log</div>
          <div className="alert-list" style={{ overflowY: 'auto' }}>
            {alerts.map(al => (
              <div key={al.id} className={`alert-item alert-${al.type}`}>
                {al.type === 'danger' && <ShieldAlert size={18} color="var(--accent-danger)" style={{ marginTop: 2, flexShrink: 0 }} />}
                {al.type === 'safe' && <Award size={18} color="var(--accent-safe)" style={{ marginTop: 2, flexShrink: 0 }} />}
                {al.type === 'info' && <MapPin size={18} color="var(--accent-blue)" style={{ marginTop: 2, flexShrink: 0 }} />}
                <div className="alert-content"><p>{al.title}</p><span>{al.time}</span></div>
              </div>
            ))}
          </div>
        </div>

        {/* SOS */}
        <div className="sos-container panel-card-anim">
          {!isOnline && (
            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#f97316', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
              📴 OFFLINE — SOS will be queued &amp; auto-sent when online
            </div>
          )}
          <button className="btn-sos" id="sos-btn-inner" onClick={handleSOS} disabled={sosActive || !position}>
            {sosActive ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RefreshCw size={18} className="animate-spin" /> {isOnline ? 'BROADCASTING...' : 'QUEUING SOS...'}
              </span>
            ) : (
              <><AlertTriangle size={24} /> SOS EMERGENCY</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
