/**
 * run402 Database Connection Pattern
 *
 * Usage: Copy this into your app and replace {{API_URL}}, {{ANON_KEY}}, {{PROJECT_ID}}.
 * The agent fills these values from memory (Step 10 outputs).
 */

// === Configuration ===
const CONFIG = {
  API_URL: '{{API_URL}}',       // https://api.run402.com
  ANON_KEY: '{{ANON_KEY}}',     // From project creation (client-side key, respects RLS)
  PROJECT_ID: '{{PROJECT_ID}}'  // From project creation
};

// === API Helper ===
// Use this for all client-side data operations (CRUD, auth, storage).
// The apikey header routes requests to the correct project.

async function api(path, options = {}) {
  const headers = {
    'apikey': CONFIG.ANON_KEY,
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add auth token if user is logged in
  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const response = await fetch(CONFIG.API_URL + path, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  // Handle 204 No Content (e.g., DELETE)
  if (response.status === 204) return null;

  return response.json();
}

// === Admin API Helper ===
// Use this ONLY during setup (SQL migrations, RLS config).
// NEVER include service_key in deployed frontend code.
// This function is for the agent's use during the build process.

async function adminApi(path, serviceKey, options = {}) {
  const response = await fetch(CONFIG.API_URL + path, {
    ...options,
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': options.contentType || 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}
