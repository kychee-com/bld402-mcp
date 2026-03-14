/**
 * run402 Auth Flow Pattern
 *
 * Provides: signup, login, logout, session management, auth state UI.
 * Requires: db-connection.js (api() function and CONFIG).
 * Stores tokens in localStorage for persistence across page reloads.
 */

// === Auth State ===

function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!localStorage.getItem('access_token');
}

// === Signup ===

async function signup(email, password) {
  const user = await api('/auth/v1/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Auto-login after signup
  return login(email, password);
}

// === Login ===

async function login(email, password) {
  const data = await api('/auth/v1/token', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('refresh_token', data.refresh_token);
  localStorage.setItem('user', JSON.stringify(data.user));

  onAuthChange(data.user);
  return data.user;
}

// === Logout ===

async function logout() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (refreshToken) {
    try {
      await api('/auth/v1/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: refreshToken })
      });
    } catch (e) {
      // Logout even if server call fails
    }
  }

  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');

  onAuthChange(null);
}

// === Token Refresh ===

async function refreshSession() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  try {
    const data = await api('/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });

    localStorage.setItem('access_token', data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    localStorage.setItem('user', JSON.stringify(data.user));

    return data.user;
  } catch (e) {
    // Refresh failed — clear session
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    return null;
  }
}

// === Auth UI Helper ===

// Call this on page load to restore session and update UI
async function initAuth() {
  const user = getCurrentUser();
  if (user) {
    // Try to refresh the token silently
    const refreshed = await refreshSession();
    onAuthChange(refreshed);
  } else {
    onAuthChange(null);
  }
}

// Override this function in your app to update UI when auth state changes
function onAuthChange(user) {
  // Example: show/hide login form, display user email, etc.
  document.querySelectorAll('.auth-only').forEach(el => {
    el.style.display = user ? '' : 'none';
  });
  document.querySelectorAll('.no-auth-only').forEach(el => {
    el.style.display = user ? 'none' : '';
  });

  const userDisplay = document.getElementById('user-email');
  if (userDisplay) {
    userDisplay.textContent = user ? user.email : '';
  }
}

// === Auth Form HTML ===
// Include this HTML in your page for a ready-made login/signup form:
//
// <div class="no-auth-only">
//   <form id="auth-form">
//     <input type="email" id="auth-email" placeholder="Email" required>
//     <input type="password" id="auth-password" placeholder="Password" required>
//     <button type="submit" id="auth-submit">Sign In</button>
//     <button type="button" id="auth-toggle">Need an account? Sign Up</button>
//   </form>
// </div>
// <div class="auth-only" style="display:none">
//   <span id="user-email"></span>
//   <button onclick="logout()">Sign Out</button>
// </div>

// === Auth Form Handler ===

function setupAuthForm() {
  let isSignup = false;
  const form = document.getElementById('auth-form');
  const toggle = document.getElementById('auth-toggle');
  const submit = document.getElementById('auth-submit');

  if (!form) return;

  toggle.addEventListener('click', () => {
    isSignup = !isSignup;
    submit.textContent = isSignup ? 'Sign Up' : 'Sign In';
    toggle.textContent = isSignup ? 'Already have an account? Sign In' : 'Need an account? Sign Up';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      alert(err.message || 'Authentication failed. Please try again.');
    }
  });
}
