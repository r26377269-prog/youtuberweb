// Admin Authentication Manager

const AUTH_TOKEN_KEY = 'youtuber_admin_token';
const API_BASE_URL = typeof window !== 'undefined' && (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') ? 'https://youtuberweb.onrender.com' : '';

// Save JWT Token
function setAdminToken(token) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

// Retrieve JWT Token
function getAdminToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

// Clear JWT Token (Logout)
function removeAdminToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Check if admin is currently authenticated with server
async function verifyAdminAuth() {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('Auth verification error:', err);
    return false;
  }
}

// Login Form Submit Handler
async function handleAdminLogin(event) {
  event.preventDefault();
  
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const alertBox = document.getElementById('login-alert');
  const submitBtn = document.getElementById('login-submit-btn');

  if (!emailInput || !passwordInput) return;

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (alertBox) alertBox.style.display = 'none';

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerText = 'Authenticating...';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.success && data.token) {
      setAdminToken(data.token);
      if (alertBox) {
        alertBox.className = 'alert-box alert-success';
        alertBox.innerText = 'Login successful! Redirecting to dashboard...';
        alertBox.style.display = 'block';
      }
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 1000);
    } else {
      if (alertBox) {
        alertBox.className = 'alert-box alert-danger';
        alertBox.innerText = data.message || 'Invalid email or password.';
        alertBox.style.display = 'block';
      }
    }
  } catch (err) {
    console.error('Login submit error:', err);
    if (alertBox) {
      alertBox.className = 'alert-box alert-danger';
      alertBox.innerText = 'Connection error. Please check server connection.';
      alertBox.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerText = 'LOG IN TO PORTAL';
    }
  }
}

// Logout Handler
function logoutAdmin() {
  removeAdminToken();
  window.location.href = '/admin';
}

window.setAdminToken = setAdminToken;
window.getAdminToken = getAdminToken;
window.removeAdminToken = removeAdminToken;
window.verifyAdminAuth = verifyAdminAuth;
window.handleAdminLogin = handleAdminLogin;
window.logoutAdmin = logoutAdmin;
