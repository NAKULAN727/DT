import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { MapPin, Bell, User, LogOut, Bot, ShieldAlert, Award, AlertTriangle, CheckCircle, NavigationOff } from 'lucide-react';
import GeoMap from './components/Map';

// Utility to calculate distance between two coordinates
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius of the earth in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return R * c; // Distance in meters
}

export default function Dashboard({ onLogout }) {
  const [position, setPosition] = useState(null); // [lat, lng]
  const [accuracy, setAccuracy] = useState(0); // in meters
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeView, setActiveView] = useState('map'); // 'map' or 'profile'
  const [user, setUser] = useState(null);
  
  const [status, setStatus] = useState('SAFE'); // SAFE or ALERT
  const [sosActive, setSosActive] = useState(false);
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'safe', title: 'System Online & GPS Secured', time: 'Just now' }
  ]);
  
  // Geo-fencing zones (will calculate offset from initial location)
  const [zones, setZones] = useState({ safe: null, danger: null });

  // Refs for animations
  const appRef = useRef(null);
  const rightPanelRef = useRef(null);
  const alertBadgeRef = useRef(null);
  const mapContainerRef = useRef(null);

  // Initial GUI animations setup
  useEffect(() => {
    const rawUser = localStorage.getItem('safeSphereUser');
    if (rawUser) setUser(JSON.parse(rawUser));

    gsap.fromTo(appRef.current, { opacity: 0 }, { opacity: 1, duration: 1, ease: 'power2.out' });
    gsap.fromTo('.sidebar', { x: -80 }, { x: 0, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo('.right-panel', { x: 400 }, { x: 0, duration: 0.8, ease: 'power3.out' });
    gsap.fromTo('.nav-item', { x: -20, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.1, delay: 0.4 });
    gsap.fromTo('.panel-card-anim', { y: 30, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.15, delay: 0.5, ease: 'back.out(1.2)' });
  }, []);

  // Map Fade-in Animation
  useEffect(() => {
    if (position && mapContainerRef.current) {
      gsap.fromTo(mapContainerRef.current, 
        { scale: 0.95, opacity: 0 },
        { scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }
      );
    }
  }, [position && !zones.safe]); // Animate only on first valid GPS fix

  // Geolocation Real-Time Tracking
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setErrorMsg("Unable to fetch location. Please enable GPS.");
      return;
    }

    const handleSuccess = (pos) => {
      const { latitude, longitude, accuracy: locAcc } = pos.coords;
      const newPos = [latitude, longitude];
      
      setErrorMsg(null);
      setPosition(newPos);
      setAccuracy(locAcc);

      // Initialize relative zones ONLY on the first successful GPS frame
      setZones(prevZones => {
        if (!prevZones.safe && !prevZones.danger) {
          return {
            // Safe zone near user (200m radius) - slightly offset or exactly at starting point
            safe: { center: newPos, radius: 200 }, 
            // Danger zone 300m radius, roughly ~400m away
            danger: { center: [latitude - 0.003, longitude + 0.003], radius: 300 } 
          }
        }
        return prevZones; // Keep existing zones
      });
    };

    const handleError = (error) => {
      console.error('Location error:', error);
      if (error.code === error.PERMISSION_DENIED || error.code === 1) {
        setErrorMsg("Location access required for safety monitoring");
      } else {
        setErrorMsg("Unable to fetch location. Please enable GPS.");
      }
    };

    // Fast initial pull
    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, timeout: 10000, maximumAge: 0
    });

    // Subscribed tracking
    const watchId = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true, maximumAge: 5000, timeout: 10000
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Recalculate AI Safety Status dynamically on movement
  useEffect(() => {
    if (position && zones.danger && zones.safe && !sosActive) {
      const distToDanger = getDistanceFromLatLonInM(position[0], position[1], zones.danger.center[0], zones.danger.center[1]);
      const distToSafe = getDistanceFromLatLonInM(position[0], position[1], zones.safe.center[0], zones.safe.center[1]);
      
      let newStatus = status; // Keep current unless threshold crossed

      if (distToDanger <= zones.danger.radius) {
        newStatus = 'ALERT';
      } else if (distToSafe <= zones.safe.radius) {
        newStatus = 'SAFE';
      }

      if (newStatus !== status) {
        setStatus(newStatus);
        
        // Status badge bounce
        if (alertBadgeRef.current) {
          gsap.fromTo(alertBadgeRef.current, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
        }

        // Drop new timeline alert
        if (newStatus === 'ALERT') {
          setAlerts(prev => [{ id: Date.now(), type: 'danger', title: 'Warning: Entering Danger Zone', time: 'Just now' }, ...prev]);
        } else {
          setAlerts(prev => [{ id: Date.now(), type: 'safe', title: 'Returned to Safe Zone', time: 'Just now' }, ...prev]);
        }
      }
    }
  }, [position, zones, status, sosActive]);

  const handleSOS = () => {
    if (sosActive) return;
    setSosActive(true);
    setStatus('ALERT');
    
    // Animate button
    gsap.to('#sos-btn-inner', { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
    
    // Add screen flash overlay
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.inset = 0;
    flash.style.backgroundColor = 'rgba(239, 68, 68, 0.35)';
    flash.style.zIndex = 9999;
    flash.style.pointerEvents = 'none';
    document.body.appendChild(flash);
    gsap.to(flash, { opacity: 0, duration: 0.4, repeat: 4, yoyo: true, onComplete: () => flash.remove() });

    // Format coordinates string if available
    let locStr = position ? `${position[0].toFixed(5)}, ${position[1].toFixed(5)}` : 'Unknown';
    setAlerts(prev => [{ id: Date.now(), type: 'danger', title: `Sending location [${locStr}] to emergency contacts...`, time: 'Just now' }, ...prev]);

    setTimeout(() => {
      setSosActive(false);
      // Wait to evaluate normal zone parameters
    }, 6000); 
  };

  const handleLogoutClick = () => {
    if(window.confirm('Securely log out of SafeSphere?')) {
      localStorage.removeItem('safeSphereUser');
      gsap.to(appRef.current, { opacity: 0, scale: 0.98, duration: 0.5, onComplete: onLogout });
    }
  };

  return (
    <div className="dashboard-layout" ref={appRef}>
      
      {/* Sidebar Navigation */}
      <div className="sidebar">
        <div className={`nav-item ${activeView === 'map' ? 'active' : ''}`} title="Dashboard" onClick={() => setActiveView('map')}>
          <MapPin size={24} />
        </div>
        <div className={`nav-item ${activeView === 'alerts' ? 'active' : ''}`} title="Alerts" onClick={() => setActiveView('map')}>
          <Bell size={24} />
        </div>
        <div className={`nav-item ${activeView === 'profile' ? 'active' : ''}`} title="Profile" onClick={() => setActiveView('profile')}>
          <User size={24} />
        </div>
        <div className="nav-item nav-item-bottom" title="Logout" onClick={handleLogoutClick}>
          <LogOut size={24} />
        </div>
      </div>

      {/* Main Map Content Workspace */}
      <div className="main-content map-section">
        {activeView === 'profile' ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 40, overflowY: 'auto', backgroundColor: 'var(--bg-darker)' }}>
            <div className="glass-panel" style={{ padding: 40, maxWidth: 600, width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 30 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', backgroundColor: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>{user?.name?.[0] || 'T'}</div>
                <div>
                  <h2 style={{ fontSize: '2rem', marginBottom: 5 }}>{user?.name || 'Jane Tourist'}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>{user?.nationality || 'Global Citizen'}</p>
                </div>
              </div>
              <div className="stats-grid" style={{ gap: 20 }}>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Passport ID</label>
                  <p>{user?.passport || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Duration</label>
                  <p>{user?.startDate?.substring(0,10)} to {user?.endDate?.substring(0,10)}</p>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Blockchain Address</label>
                  <p style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: 'var(--accent-blue)' }}>{user?.blockchainId || 'N/A'}</p>
                </div>
                <div>
                  <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Verification</label>
                  <p style={{ color: 'var(--accent-safe)' }}><CheckCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Blockchain Verified</p>
                </div>
              </div>
            </div>
          </div>
        ) : errorMsg ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--accent-danger)', backgroundColor: 'rgba(239, 68, 68, 0.05)', textAlign: 'center', padding: 40 }}>
            <NavigationOff size={64} style={{ marginBottom: 20 }} />
            <h2 style={{ marginBottom: 10, fontSize: '1.5rem', color: 'white' }}>{errorMsg}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>We cannot establish the safety protocol zones without your explicit GPS coordinates. Please allow location access in your browser.</p>
          </div>
        ) : position ? (
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}>
            <GeoMap position={position} accuracy={accuracy} safeZone={zones.safe} dangerZone={zones.danger} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <div className="location-pulse" style={{position: 'relative', top: 'auto', left: 'auto', marginBottom: 20, animation: 'pulse 1.5s infinite'}}></div>
            <i className="fa-solid fa-satellite-dish fa-spin fa-2x" style={{marginBottom: 15, color: 'var(--accent-blue)'}}></i> 
            <span style={{ fontSize: '1.2rem'}}>Acquiring High-Accuracy GPS Signal...</span>
          </div>
        )}
      </div>

      {/* Right Dashboard UI */}
      <div className="right-panel" ref={rightPanelRef}>
        
          <div className="id-card panel-card-anim">
          <CheckCircle className="id-verified" size={20} />
          <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>
            Blockchain User ID
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{user?.name || 'Tourist'}</div>
          <div className="id-number" style={{ wordBreak: 'break-all' }}>ID: {user?.blockchainId || '0x...'}</div>
        </div>

        <div className="glass-panel panel-card panel-card-anim">
          <div className="panel-header">
            <Bot size={18} /> AI Security Assessment
          </div>
          <div className="safety-score">
            <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Live GPS Status</span>
            <div 
              ref={alertBadgeRef}
              className={`score-badge ${status === 'SAFE' ? 'status-safe' : 'status-alert'}`}
            >
              {status}
            </div>
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

        <div className="alerts-section panel-card-anim" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <Bell size={18} /> Safety Activity Log
          </div>
          <div className="alert-list" style={{ overflowY: 'auto' }}>
            {alerts.map(al => (
              <div key={al.id} className={`alert-item alert-${al.type}`}>
                {al.type === 'danger' && <ShieldAlert size={18} color="var(--accent-danger)" style={{marginTop: 2, flexShrink: 0}} />}
                {al.type === 'safe' && <Award size={18} color="var(--accent-safe)" style={{marginTop: 2, flexShrink: 0}} />}
                {al.type === 'info' && <MapPin size={18} color="var(--accent-blue)" style={{marginTop: 2, flexShrink: 0}} />}
                <div className="alert-content">
                  <p>{al.title}</p>
                  <span>{al.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sos-container panel-card-anim">
          <button className="btn-sos" id="sos-btn-inner" onClick={handleSOS} disabled={sosActive || !position}>
            {sosActive ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fa-solid fa-spinner fa-spin"></i> BROADCASTING...
              </span>
            ) : (
              <>
                <AlertTriangle size={24} /> SOS EMERGENCY
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
