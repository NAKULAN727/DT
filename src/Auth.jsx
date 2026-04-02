import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  ArrowRight, Lock, User, Map, Calendar, AlertTriangle, 
  ShieldCheck, Phone, Mail, Home, Plane, HeartPulse, 
  Users, Plus, Trash2, CheckCircle2, ChevronRight, Fingerprint, Copy
} from 'lucide-react';

const Field = ({ label, icon: Icon, type = "text", placeholder, value, onChange, options }) => (
  <div className="space-y-1.5 flex-1 min-w-[200px]">
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={14} />}
      {options ? (
        <select 
          value={value} 
          onChange={onChange}
          className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl py-2.5 px-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none appearance-none"
        >
          {options.map(opt => <option key={opt}>{opt}</option>)}
        </select>
      ) : (
        <input 
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl py-2.5 px-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none placeholder:text-slate-600"
        />
      )}
    </div>
  </div>
);

export default function Auth({ onLogin }) {
  const [view, setView] = useState('login'); // 'login' | 'register' | 'qrcodes'
  const [regData, setRegData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1); // For multi-step form if needed, but we'll stick to a smooth scroll view
  
  // Section-based Form State
  const [formData, setFormData] = useState({
    name: 'Nakulan', gender: 'Male', age: 17, dob: '2007-02-07', nationality: 'Indian', passport: 'A1234567', govId: '1234-5678-9012', phone: '+91 9876543210', email: 'nakulan@example.com', address: '123 Smart St, Tech City',
    travelStart: '2026-04-03', travelEnd: '2026-04-10', hotel: 'Grand Vista', accommodation: 'Room 404', transport: 'Flight', insurance: 'INS-8822', itinerary: 'Day 1: Sightseeing, Day 2: Beach visit',
    emergencyContacts: { localName: 'Local Hero', localPhone: '112', familyName: 'Guardian Name', familyPhone: '+91 0000000000', medicalName: 'Dr. Tech', medicalPhone: '911' },
    healthDetails: { bloodGroup: 'O+', specialAssistance: 'None', medicalConditions: 'Allergic to bugs' },
    familyMembers: []
  });

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: { ...prev[section], [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const addFamilyMember = () => {
    setFormData(prev => ({
      ...prev,
      familyMembers: [...prev.familyMembers, { name: '', passport: '', nationality: '', age: '' }]
    }));
  };

  const removeFamilyMember = (index) => {
    const members = [...formData.familyMembers];
    members.splice(index, 1);
    setFormData(prev => ({ ...prev, familyMembers: members }));
  };

  const handleFamilyChange = (index, field, value) => {
    const members = [...formData.familyMembers];
    members[index][field] = value;
    setFormData(prev => ({ ...prev, familyMembers: members }));
  };

  const containerRef = useRef(null);
  useEffect(() => {
    gsap.fromTo('.anim-container', { opacity: 0, scale: 0.98 }, { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' });
  }, [view]);

  const handleSwitchView = (newView) => {
    setCopied(false);
    gsap.to('.anim-container', { opacity: 0, y: 10, duration: 0.3, ease: 'power2.in', onComplete: () => {
      setView(newView);
      window.scrollTo(0,0);
    }});
  };

  const handleCopy = () => {
    if (regData?.blockchainId) {
      navigator.clipboard.writeText(regData.blockchainId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const blockchainId = e.target.blockchainId.value;
    
    try {
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockchainId })
      });
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('safeSphereUser', JSON.stringify(data.user));
        gsap.to('.anim-container', { opacity: 0, scale: 1.05, duration: 0.5, onComplete: () => onLogin() });
      } else {
        alert(data.error || 'Login failed');
      }
    } catch (err) {
      alert('Backend connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/register-tourist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        setRegData(data);
        handleSwitchView('qrcodes');
      } else {
        alert(data.error || 'Registration failed');
      }
    } catch (err) {
      alert('Backend connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0b0f1a] min-h-screen text-slate-200 selection:bg-blue-500/30 overflow-x-hidden" ref={containerRef}>
      {/* Abstract Background pattern */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12 flex items-center justify-center min-h-screen">
        <div className="anim-container w-full max-w-4xl">
          {view === 'login' ? (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-10 space-y-3">
                <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-2">
                  <Fingerprint className="text-blue-400" size={32} />
                </div>
                <h1 className="text-4xl font-black tracking-tight text-white italic">SAFESPHERE</h1>
                <p className="text-slate-500 font-medium">Digital Tourist Identity Gateway</p>
              </div>

              <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/5 rounded-[32px] p-8 shadow-2xl">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Blockchain Public ID</label>
                      <div className="relative group">
                        <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={14} />
                        <input name="blockchainId" type="text" required placeholder="0x..." className="w-full bg-slate-900/40 border border-slate-700/50 rounded-xl py-2.5 px-4 pl-9 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all outline-none" />
                      </div>
                    </div>
                  </div>
                  <button 
                    disabled={loading} 
                    type="submit" 
                    className="w-full py-4 bg-white text-black hover:bg-blue-400 hover:text-white rounded-2xl font-bold transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {loading ? <Users className="animate-spin" size={20} /> : "Authenticate Securely"}
                  </button>
                  <div className="text-center pt-6">
                    <button type="button" onClick={() => handleSwitchView('register')} className="group text-slate-400 hover:text-white transition-all text-xs font-semibold uppercase tracking-widest flex items-center justify-center gap-2 mx-auto">
                      Generate New Node Identity <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : view === 'register' ? (
            <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[40px] shadow-2xl p-8 md:p-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-white/5 pb-8">
                <div>
                  <h1 className="text-4xl font-black text-white leading-tight">Identity Node <br/><span className="text-blue-500">Registration</span></h1>
                  <p className="text-slate-500 mt-2 font-medium">Complete the KYC package for blockchain issuance</p>
                </div>
                <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                  {[1, 2, 3].map(i => (
                    <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${step === i ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-slate-500'}`}>{i}</div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-12">
                {/* 1. IDENTITY */}
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><User size={20} /></div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Tourist Identity (KYC)</h2>
                  </div>
                  <div className="grid md:grid-cols-4 gap-6">
                    <Field label="Full Name" value={formData.name} onChange={(e) => handleInputChange(null, 'name', e.target.value)} placeholder="Jane Doe" />
                    <Field label="Gender" options={['Male', 'Female', 'Other']} value={formData.gender} onChange={(e) => handleInputChange(null, 'gender', e.target.value)} />
                    <Field label="Age" type="number" value={formData.age} onChange={(e) => handleInputChange(null, 'age', e.target.value)} />
                    <Field label="D.O.B" type="date" value={formData.dob} onChange={(e) => handleInputChange(null, 'dob', e.target.value)} />
                  </div>
                  <div className="grid md:grid-cols-4 gap-6">
                    <Field label="Nationality" value={formData.nationality} onChange={(e) => handleInputChange(null, 'nationality', e.target.value)} icon={Map} />
                    <Field label="Passport ID" value={formData.passport} onChange={(e) => handleInputChange(null, 'passport', e.target.value)} icon={ShieldCheck} />
                    <div className="md:col-span-2">
                       <Field label="Email Address" type="email" value={formData.email} onChange={(e) => handleInputChange(null, 'email', e.target.value)} icon={Mail} />
                    </div>
                  </div>
                </div>

                {/* 2. TRIP */}
                <div className="space-y-8 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 border border-purple-500/20"><Plane size={20} /></div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Trip Dynamics</h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-6">
                    <Field label="Arrival Date" type="date" value={formData.travelStart} onChange={(e) => handleInputChange(null, 'travelStart', e.target.value)} icon={Calendar} />
                    <Field label="Departure Date" type="date" value={formData.travelEnd} onChange={(e) => handleInputChange(null, 'travelEnd', e.target.value)} icon={Calendar} />
                    <Field label="Accommodation" value={formData.hotel} onChange={(e) => handleInputChange(null, 'hotel', e.target.value)} icon={Home} />
                  </div>
                </div>

                {/* 3. EMERGENCY */}
                <div className="space-y-8 pt-8 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400 border border-red-500/20"><AlertTriangle size={20} /></div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Safety Network</h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <Field label="Local Contact" value={formData.emergencyContacts.localName} onChange={(e) => handleInputChange('emergencyContacts', 'localName', e.target.value)} />
                    <Field label="Phone Number" value={formData.emergencyContacts.localPhone} onChange={(e) => handleInputChange('emergencyContacts', 'localPhone', e.target.value)} icon={Phone} />
                  </div>
                </div>

                {/* 5. FAMILY */}
                <div className="space-y-8 pt-8 border-t border-white/5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20"><Users size={20} /></div>
                      <h2 className="text-xl font-bold text-white tracking-tight">Node Dependents</h2>
                    </div>
                    <button type="button" onClick={addFamilyMember} className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-5 py-2.5 rounded-xl border border-emerald-500/20 transition-all font-bold text-xs uppercase tracking-widest">+ Add Member</button>
                  </div>
                  {formData.familyMembers.length > 0 && (
                    <div className="grid gap-4">
                      {formData.familyMembers.map((member, i) => (
                        <div key={i} className="flex flex-wrap md:flex-nowrap gap-4 items-center bg-slate-900/60 p-5 rounded-2xl border border-white/5 group relative overflow-hidden">
                          <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500/50" />
                          <div className="flex-1 space-y-1"><label className="text-[9px] text-slate-500 uppercase font-black">Name</label><input value={member.name} onChange={(e) => handleFamilyChange(i, 'name', e.target.value)} className="w-full bg-transparent border-none text-sm focus:outline-none" /></div>
                          <div className="w-32 space-y-1"><label className="text-[9px] text-slate-500 uppercase font-black">Passport</label><input value={member.passport} onChange={(e) => handleFamilyChange(i, 'passport', e.target.value)} className="w-full bg-transparent border-none text-sm focus:outline-none" /></div>
                          <button type="button" onClick={() => removeFamilyMember(i)} className="ml-4 p-2 text-slate-500 hover:text-red-400 transition-colors"><Trash2 size={20} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col md:flex-row gap-6 pb-6">
                   <button type="button" onClick={() => handleSwitchView('login')} className="flex-1 py-5 rounded-2xl bg-slate-800 text-slate-300 font-black uppercase tracking-widest text-xs hover:bg-slate-700 transition-all">Cancel</button>
                   <button type="submit" disabled={loading} className="flex-[3] py-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black uppercase tracking-widest text-xs shadow-2xl shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all">
                     {loading ? <span className="flex items-center justify-center gap-3"><Users className="animate-spin"/> Syncing with Chain...</span> : "Generate Cryptographic Identity"}
                   </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto bg-[#0d121f] backdrop-blur-3xl border border-white/5 rounded-[48px] p-12 text-center shadow-2xl">
               <div className="mb-10 inline-flex p-5 rounded-[24px] bg-emerald-500/10 border border-emerald-500/20">
                 <CheckCircle2 className="text-emerald-400" size={56} />
               </div>
               
               <div className="space-y-3 mb-10">
                 <h1 className="text-5xl font-black text-white italic tracking-tight">IDENTITY SECURED</h1>
                 <p className="text-slate-500 font-medium tracking-wide uppercase text-xs">Node address successfully linked to passport ID</p>
               </div>
               
               <div className="grid grid-cols-2 gap-8 mb-10">
                 <div className="group space-y-4">
                   <div className="bg-white p-3 rounded-[24px] shadow-2xl group-hover:scale-110 transition-transform duration-500"><img src={regData?.blockchainQR} alt="Public" className="w-full aspect-square" /></div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Public Blockchain ID</p>
                 </div>
                 <div className="group space-y-4">
                   <div className="bg-white p-3 rounded-[24px] shadow-2xl border-4 border-red-500 group-hover:scale-110 transition-transform duration-500"><img src={regData?.walletQR} alt="Secret" className="w-full aspect-square" /></div>
                   <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">Master Private Gate</p>
                 </div>
               </div>

               <div className="p-8 bg-red-500/10 border border-red-500/20 rounded-[32px] text-left mb-10 space-y-3">
                 <div className="flex items-center gap-3 text-red-400 font-black italic uppercase text-sm tracking-widest"><AlertTriangle size={20} /> Irreversible Security Protocol</div>
                 <p className="text-xs text-slate-400 leading-relaxed font-medium">SafeSphere operates on a zero-knowledge architecture. Your private key QR above is the <span className="text-white italic">only</span> way to manage your identity. We do not store a copy. If lost, your digital profile becomes inaccessible.</p>
               </div>

               <div className="group relative py-5 px-8 bg-slate-900 rounded-2xl font-mono text-[11px] text-blue-500 border border-white/5 break-all hover:bg-slate-800 transition-colors flex items-center justify-between gap-4">
                  <div className="flex-1 text-left">IDENT_HASH: {regData?.blockchainId}</div>
                  <button 
                    onClick={handleCopy}
                    className={`shrink-0 p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                  >
                    {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />} 
                  </button>
                  {copied && <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-bold animate-bounce">COPIED!</span>}
               </div>

               <button onClick={() => handleSwitchView('login')} className="w-full mt-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-xl shadow-blue-600/30 transition-all">Launch Dashboard Interface</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
