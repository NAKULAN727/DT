import './style.css';
import { gsap } from 'gsap';

// ==========================================
// VIEWS & DOM ELEMENTS
// ==========================================
const viewLogin = document.getElementById('view-login');
const viewRegister = document.getElementById('view-register');
const viewDashboard = document.getElementById('view-dashboard');

const goRegisterBtn = document.getElementById('go-register');
const goLoginBtn = document.getElementById('go-login');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

const mapNav = document.getElementById('nav-dash');
const profileNav = document.getElementById('nav-profile');
const logoutNav = document.getElementById('nav-logout');

const mapView = document.getElementById('map-view');
const profileView = document.getElementById('profile-view');
const rightPanel = document.getElementById('right-panel');

const sosBtn = document.getElementById('sos-btn');

// ==========================================
// INITIAL ANIMATIONS
// ==========================================
function initLoginAnim() {
  gsap.fromTo('#login-card', 
    { y: 30, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
  );
  gsap.fromTo('.login-field',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, delay: 0.3, ease: 'power2.out' }
  );
}

// Start with login animation
window.addEventListener('DOMContentLoaded', () => {
  initLoginAnim();
});

// ==========================================
// AUTHENTICATION NAVIGATION
// ==========================================
goRegisterBtn.addEventListener('click', () => {
  gsap.to(viewLogin, {
    opacity: 0, scale: 0.95, duration: 0.4, onComplete: () => {
      viewLogin.classList.add('hidden');
      viewRegister.classList.remove('hidden');
      
      gsap.fromTo(viewRegister, 
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
      gsap.fromTo('.reg-field',
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.4, stagger: 0.05, delay: 0.2 }
      );
    }
  });
});

goLoginBtn.addEventListener('click', () => {
  gsap.to(viewRegister, {
    opacity: 0, x: 50, duration: 0.4, onComplete: () => {
      viewRegister.classList.add('hidden');
      viewLogin.classList.remove('hidden');
      gsap.fromTo(viewLogin, { opacity: 0, x: -50 }, { opacity: 1, x: 0, duration: 0.5 });
      initLoginAnim();
    }
  });
});

// Mock Login Submission
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  // Button success animation
  const btn = loginForm.querySelector('.btn-primary');
  const ogText = btn.innerHTML;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
  
  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Success';
    
    // Transition to Dashboard
    gsap.to('.auth-container', {
      opacity: 0, duration: 0.5, onComplete: () => {
        viewLogin.classList.add('hidden');
        viewDashboard.classList.remove('hidden');
        
        // Start dashboard entrance animations
        initDashboardAnim();
      }
    });
  }, 1000);
});

// Mock Register Submission
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = registerForm.querySelector('button[type="submit"]');
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Registered!';
  btn.classList.add('btn-safe');
  btn.style.background = 'var(--accent-safe)';
  
  setTimeout(() => {
    // Return to login
    goLoginBtn.click();
    btn.innerHTML = 'Register';
    btn.style.background = '';
  }, 1500);
});

// ==========================================
// DASHBOARD & MAP ANIMATIONS
// ==========================================
function initDashboardAnim() {
  viewDashboard.style.opacity = 0;
  gsap.to(viewDashboard, { opacity: 1, duration: 0.5 });
  
  // Slide in Sidebar
  gsap.fromTo('.sidebar', { x: -80 }, { x: 0, duration: 0.6, ease: 'power3.out' });
  
  // Slide in Right Panel
  gsap.fromTo('.right-panel', { x: 400 }, { x: 0, duration: 0.7, ease: 'power3.out' });
  
  // Stagger nav items
  gsap.fromTo('.nav-item', 
    { x: -20, opacity: 0 }, 
    { x: 0, opacity: 1, stagger: 0.1, delay: 0.3 }
  );

  // Stagger right panel cards
  gsap.fromTo('.ai-panel, .blockchain-panel, .alerts-section, .sos-container',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, stagger: 0.15, delay: 0.4, ease: 'back.out(1.2)' }
  );

  // Start map generic animations
  initMapPulse();
}

function initMapPulse() {
  // Continuous pulse for user location
  gsap.to('.location-pulse', {
    scale: 2.5,
    opacity: 0,
    duration: 2,
    repeat: -1,
    ease: 'power1.out'
  });

  // Safe Zone pulse
  gsap.to('#safe-zone', {
    scale: 1.05,
    duration: 3,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });

  // Danger Zone subtle pulse
  gsap.to('#danger-zone', {
    scale: 1.05,
    duration: 2,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });

  // Simulate movement
  setTimeout(() => {
    gsap.to('.location-marker', {
      x: '50px', y: '30px', duration: 10, ease: 'linear'
    });
    gsap.to('.location-pulse', {
      x: '50px', y: '30px', duration: 10, ease: 'linear'
    });
  }, 1000);
}

// ==========================================
// DASHBOARD NAVIGATION (MAP vs PROFILE)
// ==========================================
mapNav.addEventListener('click', () => {
  if (mapNav.classList.contains('active')) return;
  
  mapNav.classList.add('active');
  profileNav.classList.remove('active');

  gsap.to(profileView, { opacity: 0, y: 20, duration: 0.3, onComplete: () => {
    profileView.classList.add('hidden');
    mapView.classList.remove('hidden');
    rightPanel.classList.remove('hidden');
    
    gsap.fromTo(mapView, { opacity: 0 }, { opacity: 1, duration: 0.4 });
    gsap.fromTo(rightPanel, { x: 300, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 });
  }});
});

profileNav.addEventListener('click', () => {
  if (profileNav.classList.contains('active')) return;
  
  profileNav.classList.add('active');
  mapNav.classList.remove('active');

  // Hide Map & Right Panel
  gsap.to([mapView, rightPanel], { opacity: 0, duration: 0.3, onComplete: () => {
    mapView.classList.add('hidden');
    rightPanel.classList.add('hidden');
    profileView.classList.remove('hidden');
    
    gsap.fromTo(profileView, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4 });
    gsap.fromTo('#profile-card-anim', { scale: 0.95, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, delay: 0.2, ease: 'back.out(1.5)' });
  }});
});

logoutNav.addEventListener('click', () => {
  gsap.to(viewDashboard, { opacity: 0, scale: 1.05, duration: 0.5, onComplete: () => {
    viewDashboard.classList.add('hidden');
    viewLogin.classList.remove('hidden');
    mapNav.click(); // Reset to map view
    gsap.fromTo(viewLogin, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.4 });
    initLoginAnim();
  }});
});

// ==========================================
// SOS BUTTON LOGIC & AI STATUS CHANGE
// ==========================================
sosBtn.addEventListener('click', () => {
  // Button animation
  gsap.to(sosBtn, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });
  
  const originalHtml = sosBtn.innerHTML;
  sosBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> SENDING ALERT...';
  
  // Flash effect on screen
  const flash = document.createElement('div');
  flash.style.position = 'fixed';
  flash.style.top = 0; flash.style.left = 0; flash.style.width = '100vw'; flash.style.height = '100vh';
  flash.style.background = 'rgba(239, 68, 68, 0.3)';
  flash.style.zIndex = 9999;
  flash.style.pointerEvents = 'none';
  document.body.appendChild(flash);
  
  gsap.to(flash, { opacity: 0, duration: 0.5, repeat: 3, yoyo: true, onComplete: () => flash.remove() });

  // Update AI Status to Danger
  const badge = document.getElementById('safety-badge');
  badge.classList.remove('status-safe');
  badge.classList.add('status-alert');
  badge.textContent = 'ALERT';
  
  // Animate Badge changing
  gsap.fromTo(badge, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.5)' });
  
  // Add new alert
  const alertList = document.getElementById('alert-list');
  const newAlert = document.createElement('div');
  newAlert.className = 'alert-item alert-danger';
  newAlert.innerHTML = `
    <i class="fa-solid fa-triangle-exclamation" style="color: var(--accent-danger);"></i>
    <div class="alert-content">
      <p>SOS Triggered!</p>
      <span>Just now - Police Notified</span>
    </div>
  `;
  alertList.insertBefore(newAlert, alertList.firstChild);
  gsap.fromTo(newAlert, { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4 });

  setTimeout(() => {
    sosBtn.innerHTML = '<i class="fa-solid fa-check"></i> ALERT SENT';
    sosBtn.style.background = '#991b1b'; // Darker red
    
    setTimeout(() => {
      sosBtn.innerHTML = originalHtml;
      sosBtn.style.background = '';
    }, 3000);
  }, 1500);
});
