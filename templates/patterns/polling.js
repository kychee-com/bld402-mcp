/**
 * run402 Polling Pattern
 *
 * Provides near-real-time updates by periodically fetching data.
 * Use this instead of WebSockets (not supported on run402).
 * Requires: db-connection.js (api() function).
 */

// === Simple Polling ===
// Poll a table at a fixed interval and call a callback with new data.

function startPolling(table, callback, options = {}) {
  const interval = options.interval || 5000;  // Default: 5 seconds
  const filters = options.filters || {};
  const order = options.order || 'created_at.desc';
  const limit = options.limit || 50;

  let active = true;
  let lastFetch = null;

  async function poll() {
    if (!active) return;

    try {
      let path = '/rest/v1/' + table + '?order=' + order + '&limit=' + limit;
      for (const [key, value] of Object.entries(filters)) {
        path += '&' + key + '=' + value;
      }

      const data = await api(path);
      callback(data, null);
      lastFetch = new Date();
    } catch (err) {
      callback(null, err);
    }

    if (active) {
      setTimeout(poll, interval);
    }
  }

  // Start immediately
  poll();

  // Return a stop function
  return {
    stop() { active = false; },
    restart() {
      active = true;
      poll();
    },
    get lastFetch() { return lastFetch; }
  };
}

// === Smart Polling ===
// Only fetches rows newer than the last seen timestamp.
// More efficient for append-only data (messages, scores, votes).

function startSmartPolling(table, callback, options = {}) {
  const interval = options.interval || 3000;
  const timestampColumn = options.timestampColumn || 'created_at';
  const filters = options.filters || {};
  const order = options.order || timestampColumn + '.desc';

  let active = true;
  let lastSeen = options.since || new Date(0).toISOString();
  let allData = [];

  async function poll() {
    if (!active) return;

    try {
      let path = '/rest/v1/' + table + '?' +
        timestampColumn + '=gt.' + lastSeen +
        '&order=' + order;
      for (const [key, value] of Object.entries(filters)) {
        path += '&' + key + '=' + value;
      }

      const newRows = await api(path);

      if (newRows.length > 0) {
        // Update the high-water mark
        lastSeen = newRows[0][timestampColumn];
        allData = [...newRows, ...allData];
        callback(allData, newRows, null);
      }
    } catch (err) {
      callback(allData, [], err);
    }

    if (active) {
      setTimeout(poll, interval);
    }
  }

  poll();

  return {
    stop() { active = false; },
    restart() { active = true; poll(); },
    get data() { return allData; }
  };
}

// === Countdown / Timer Polling ===
// Polls and checks a condition, stops when met.

function pollUntil(checkFn, options = {}) {
  const interval = options.interval || 2000;
  const maxAttempts = options.maxAttempts || 30;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    async function check() {
      attempts++;
      try {
        const result = await checkFn();
        if (result) {
          resolve(result);
        } else if (attempts >= maxAttempts) {
          reject(new Error('Polling timed out'));
        } else {
          setTimeout(check, interval);
        }
      } catch (err) {
        reject(err);
      }
    }
    check();
  });
}

// === UI Update Helper ===
// Render a list of items into a container, only updating changed items.

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = items.map(renderItem).join('');
}

// === Visibility-Aware Polling ===
// Pauses polling when the browser tab is hidden, resumes when visible.

function createVisibilityAwarePoller(table, callback, options = {}) {
  let poller = null;

  function start() {
    if (!poller) {
      poller = startPolling(table, callback, options);
    }
  }

  function stop() {
    if (poller) {
      poller.stop();
      poller = null;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  start();

  return {
    stop() { stop(); document.removeEventListener('visibilitychange', arguments.callee); }
  };
}
