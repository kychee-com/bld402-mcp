/**
 * run402 Serverless Functions Pattern
 *
 * Provides: invoke deployed Lambda functions from client-side code.
 * Requires: db-connection.js (CONFIG object with API_URL and ANON_KEY).
 *
 * Functions are invoked via: ALL /functions/v1/:name[/*]
 * Deploy functions via admin API: POST /admin/v1/projects/:id/functions
 */

// === Invoke a Function ===
// Calls a deployed Lambda function by name.
// body: object to send as JSON (or null for GET-style calls).
// options.serviceKey: pass service_key to bypass RLS (for admin operations).
// options.method: HTTP method (default POST).
// options.path: extra path segments appended after function name.

async function callFunction(name, body = null, options = {}) {
  const method = options.method || 'POST';
  const path = options.path ? '/' + options.path : '';
  const url = CONFIG.API_URL + '/functions/v1/' + name + path;

  const headers = {
    'apikey': CONFIG.ANON_KEY,
    'Content-Type': 'application/json'
  };

  // Use service_key for server-side operations that bypass RLS
  if (options.serviceKey) {
    headers['Authorization'] = 'Bearer ' + options.serviceKey;
  }

  // Add user auth token if logged in (for user-scoped functions)
  const token = localStorage.getItem('access_token');
  if (token && !options.serviceKey) {
    headers['Authorization'] = 'Bearer ' + token;
  }

  const fetchOptions = { method, headers };
  if (body && method !== 'GET') {
    fetchOptions.body = JSON.stringify(body);
  }

  const res = await fetch(url, fetchOptions);

  // Parse response
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const err = new Error(
      (typeof data === 'object' && data.error) ? data.error : data || 'Function call failed'
    );
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// === Deploy a Function (Agent Use Only) ===
// This is used during the build process, NOT in deployed app code.
// Deploys a Node.js function to Lambda via the admin API.
//
// functionCode: string of JavaScript (the function source)
// functionName: name used to invoke it (e.g., 'draw-names')
// serviceKey: project service_key for admin auth
// projectId: project ID (e.g., 'prj_...')

async function deployFunction(functionName, functionCode, serviceKey, projectId) {
  const res = await fetch(CONFIG.API_URL + '/admin/v1/projects/' + projectId + '/functions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: functionName,
      code: functionCode
    })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error('Deploy failed: ' + error);
  }

  return res.json();
}

// === Set Function Secrets (Agent Use Only) ===
// Store environment variables accessible to the function at runtime.

async function setSecret(key, value, serviceKey, projectId) {
  const res = await fetch(CONFIG.API_URL + '/admin/v1/projects/' + projectId + '/secrets', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + serviceKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ key, value })
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error('Set secret failed: ' + error);
  }

  return res.json();
}
