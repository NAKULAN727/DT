import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import {
  ThumbsUp, ThumbsDown, MapPin, ArrowLeft, RefreshCw,
  ShieldCheck, ShieldAlert, MessageSquare, Clock, TrendingUp
} from 'lucide-react';

function getScoreColor(up, down) {
  const total = up + down;
  if (total === 0) return '#94a3b8';
  const ratio = up / total;
  if (ratio >= 0.7) return '#10b981';
  if (ratio >= 0.4) return '#f59e0b';
  return '#ef4444';
}

function SafetyBar({ upvotes, downvotes }) {
  const total = upvotes + downvotes || 1;
  const upPct = Math.round((upvotes / total) * 100);
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 6, overflow: 'hidden', background: 'rgba(255,255,255,0.05)', marginTop: 8 }}>
      <div style={{ width: `${upPct}%`, background: '#10b981', transition: 'width 0.6s ease' }} />
      <div style={{ flex: 1, background: '#ef4444' }} />
    </div>
  );
}

export default function SafetyVoting({ onBack, position }) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [comment, setComment] = useState('');
  const [activeVote, setActiveVote] = useState(null); // 'up' | 'down'
  const [userVotes, setUserVotes] = useState({}); // locationName -> 'up'|'down'
  const [toast, setToast] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'safe' | 'unsafe'
  const pageRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('safeSphereUser') || '{}');

  useEffect(() => {
    gsap.fromTo(pageRef.current, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power3.out' });
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/votes');
      const data = await res.json();
      if (data.success) {
        setLocations(data.locations);
        // Build userVotes map
        const map = {};
        data.locations.forEach(loc => {
          const v = loc.votes.find(v => v.blockchainId === user.blockchainId);
          if (v) map[loc.locationName] = v.type;
        });
        setUserVotes(map);
      }
    } catch {
      showToast('Failed to load votes', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleVote = async (voteType, existingLocation = null) => {
    const name = existingLocation ? existingLocation.locationName : locationName.trim();
    if (!name) return showToast('Enter a location name', 'error');
    if (!user.blockchainId) return showToast('Login required', 'error');

    setSubmitting(true);
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationName: name,
          lat: existingLocation ? existingLocation.lat : (position?.[0] || 0),
          lng: existingLocation ? existingLocation.lng : (position?.[1] || 0),
          voteType,
          blockchainId: user.blockchainId,
          comment: existingLocation ? '' : comment.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(voteType === 'up' ? '✓ Marked as Safe!' : '⚠ Marked as Unsafe!', 'success');
        setLocationName('');
        setComment('');
        setActiveVote(null);
        fetchLocations();
      } else {
        showToast(data.error, 'error');
      }
    } catch {
      showToast('Server error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = locations.filter(loc => {
    if (filter === 'safe') return loc.upvotes > loc.downvotes;
    if (filter === 'unsafe') return loc.downvotes >= loc.upvotes;
    return true;
  });

  return (
    <div ref={pageRef} style={{
      minHeight: '100vh', background: 'var(--bg-darker)',
      color: 'var(--text-primary)', fontFamily: 'var(--font-main)',
      display: 'flex', flexDirection: 'column'
    }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          zIndex: 9999, padding: '10px 24px', borderRadius: 30, fontWeight: 700,
          fontSize: '0.85rem', whiteSpace: 'nowrap',
          background: toast.type === 'error' ? 'rgba(239,68,68,0.95)' : 'rgba(16,185,129,0.95)',
          color: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          animation: 'fadeInUp 0.3s ease'
        }}>{toast.msg}</div>
      )}

      {/* Header */}
      <div style={{
        padding: '20px 32px', borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', gap: 16, position: 'sticky', top: 0, zIndex: 100
      }}>
        <button onClick={onBack} style={{
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '8px 12px', color: 'var(--text-secondary)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
        }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
            Community Safety Votes
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Rate locations to help fellow tourists stay safe
          </p>
        </div>
        <button onClick={fetchLocations} style={{
          marginLeft: 'auto', background: 'transparent', border: 'none',
          color: 'var(--text-secondary)', cursor: 'pointer', padding: 8, borderRadius: 8
        }}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ flex: 1, maxWidth: 900, width: '100%', margin: '0 auto', padding: '32px 24px' }}>

        {/* ── SUBMIT NEW VOTE ── */}
        <div style={{
          background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 24, padding: 28, marginBottom: 32
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Rate a Location
          </div>

          {/* Location name input */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ position: 'relative' }}>
              <MapPin size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                placeholder="Location name (e.g. Marina Beach, Old Town Market...)"
                style={{
                  width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '12px 16px 12px 38px', color: 'white',
                  fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-main)'
                }}
              />
            </div>
          </div>

          {/* Comment input */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ position: 'relative' }}>
              <MessageSquare size={14} style={{ position: 'absolute', left: 14, top: 14, color: '#64748b' }} />
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Optional: Add a comment (e.g. 'Crowded at night', 'Well lit area')"
                rows={2}
                style={{
                  width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 14, padding: '12px 16px 12px 38px', color: 'white',
                  fontSize: '0.85rem', outline: 'none', resize: 'none', boxSizing: 'border-box',
                  fontFamily: 'var(--font-main)'
                }}
              />
            </div>
          </div>

          {/* GPS tag */}
          {position && (
            <div style={{ fontSize: '0.7rem', color: '#475569', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <MapPin size={11} /> GPS auto-tagged: {position[0].toFixed(4)}, {position[1].toFixed(4)}
            </div>
          )}

          {/* Vote buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => handleVote('up')}
              disabled={submitting || !locationName.trim()}
              style={{
                flex: 1, padding: '14px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'rgba(16,185,129,0.15)', color: '#10b981',
                border: '1px solid rgba(16,185,129,0.3)', fontWeight: 800,
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'all 0.2s', opacity: submitting ? 0.6 : 1
              }}
            >
              <ThumbsUp size={18} /> Mark as SAFE
            </button>
            <button
              onClick={() => handleVote('down')}
              disabled={submitting || !locationName.trim()}
              style={{
                flex: 1, padding: '14px 20px', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: 'rgba(239,68,68,0.15)', color: '#ef4444',
                border: '1px solid rgba(239,68,68,0.3)', fontWeight: 800,
                fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, transition: 'all 0.2s', opacity: submitting ? 0.6 : 1
              }}
            >
              <ThumbsDown size={18} /> Mark as UNSAFE
            </button>
          </div>
        </div>

        {/* ── FILTER TABS ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {[
            { key: 'all', label: `All (${locations.length})` },
            { key: 'safe', label: `✓ Safe (${locations.filter(l => l.upvotes > l.downvotes).length})` },
            { key: 'unsafe', label: `⚠ Unsafe (${locations.filter(l => l.downvotes >= l.upvotes && (l.upvotes + l.downvotes) > 0).length})` }
          ].map(tab => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} style={{
              padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.2s',
              background: filter === tab.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.04)',
              color: filter === tab.key ? '#60a5fa' : 'var(--text-secondary)',
              border: filter === tab.key ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(255,255,255,0.06)'
            }}>{tab.label}</button>
          ))}
        </div>

        {/* ── LOCATION CARDS ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary)' }}>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 16px', display: 'block' }} />
            Loading community votes...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 60, color: 'var(--text-secondary)',
            background: 'rgba(30,41,59,0.4)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <TrendingUp size={40} style={{ margin: '0 auto 16px', display: 'block', opacity: 0.3 }} />
            <p style={{ fontWeight: 600 }}>No votes yet</p>
            <p style={{ fontSize: '0.8rem', marginTop: 6 }}>Be the first to rate a location above</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filtered.map((loc, i) => {
              const total = loc.upvotes + loc.downvotes;
              const upPct = total ? Math.round((loc.upvotes / total) * 100) : 0;
              const isSafe = loc.upvotes > loc.downvotes;
              const scoreColor = getScoreColor(loc.upvotes, loc.downvotes);
              const myVote = userVotes[loc.locationName];
              const recentComments = loc.votes.filter(v => v.comment).slice(-3).reverse();

              return (
                <div key={loc._id} style={{
                  background: 'rgba(30,41,59,0.5)', border: `1px solid ${isSafe ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
                  borderRadius: 20, padding: 24, transition: 'transform 0.2s',
                  animation: `fadeInUp 0.4s ease ${i * 0.05}s both`
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        {isSafe
                          ? <ShieldCheck size={18} color="#10b981" />
                          : <ShieldAlert size={18} color="#ef4444" />
                        }
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>{loc.locationName}</h3>
                        {myVote && (
                          <span style={{
                            fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                            background: myVote === 'up' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                            color: myVote === 'up' ? '#10b981' : '#ef4444',
                            border: `1px solid ${myVote === 'up' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`
                          }}>
                            {myVote === 'up' ? 'You: Safe' : 'You: Unsafe'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: '#475569' }}>
                        <MapPin size={11} />
                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                        <span style={{ marginLeft: 8 }}>·</span>
                        <Clock size={11} />
                        {new Date(loc.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Score */}
                    <div style={{ textAlign: 'center', minWidth: 60 }}>
                      <div style={{ fontSize: '1.8rem', fontWeight: 900, color: scoreColor, lineHeight: 1 }}>{upPct}%</div>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: 2 }}>SAFE</div>
                    </div>
                  </div>

                  {/* Safety bar */}
                  <SafetyBar upvotes={loc.upvotes} downvotes={loc.downvotes} />

                  {/* Vote counts */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 14 }}>
                    <button
                      onClick={() => handleVote('up', loc)}
                      disabled={submitting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.82rem', transition: 'all 0.2s',
                        background: myVote === 'up' ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)',
                        color: '#10b981', border: `1px solid ${myVote === 'up' ? 'rgba(16,185,129,0.5)' : 'rgba(16,185,129,0.2)'}`
                      }}
                    >
                      <ThumbsUp size={14} /> {loc.upvotes} Safe
                    </button>
                    <button
                      onClick={() => handleVote('down', loc)}
                      disabled={submitting}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.82rem', transition: 'all 0.2s',
                        background: myVote === 'down' ? 'rgba(239,68,68,0.25)' : 'rgba(239,68,68,0.08)',
                        color: '#ef4444', border: `1px solid ${myVote === 'down' ? 'rgba(239,68,68,0.5)' : 'rgba(239,68,68,0.2)'}`
                      }}
                    >
                      <ThumbsDown size={14} /> {loc.downvotes} Unsafe
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#475569', alignSelf: 'center' }}>
                      {total} vote{total !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Recent comments */}
                  {recentComments.length > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      {recentComments.map((v, ci) => (
                        <div key={ci} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                            background: v.type === 'up' ? '#10b981' : '#ef4444'
                          }} />
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{v.comment}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
