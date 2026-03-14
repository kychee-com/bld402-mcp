/**
 * run402 CRUD Operations Pattern
 *
 * Provides: create, read, update, delete with PostgREST filters.
 * Requires: db-connection.js (api() function).
 *
 * PostgREST filter reference:
 *   eq, neq, gt, gte, lt, lte, like, ilike, in, is
 *   Example: /rest/v1/todos?done=eq.false&order=created_at.desc&limit=10
 */

// === Read ===

// Get all rows from a table
async function getAll(table, options = {}) {
  let path = '/rest/v1/' + table;
  const params = [];

  if (options.order) params.push('order=' + options.order);
  if (options.limit) params.push('limit=' + options.limit);
  if (options.offset) params.push('offset=' + options.offset);
  if (options.select) params.push('select=' + options.select);
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      params.push(key + '=' + value);
    }
  }

  if (params.length) path += '?' + params.join('&');
  return api(path);
}

// Get a single row by ID
async function getById(table, id) {
  const rows = await api('/rest/v1/' + table + '?id=eq.' + id);
  return rows[0] || null;
}

// === Create ===

async function create(table, data) {
  const rows = await api('/rest/v1/' + table, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  return rows[0];
}

// === Update ===

async function update(table, id, data) {
  const rows = await api('/rest/v1/' + table + '?id=eq.' + id, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(data)
  });
  return rows[0];
}

// === Delete ===

async function remove(table, id) {
  await api('/rest/v1/' + table + '?id=eq.' + id, {
    method: 'DELETE'
  });
}

// === Upsert ===
// Insert or update if a conflict occurs (e.g., unique constraint)

async function upsert(table, data) {
  const rows = await api('/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'Prefer': 'return=representation,resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });
  return rows[0];
}

// === Count ===

async function count(table, filters = {}) {
  let path = '/rest/v1/' + table + '?select=count';
  for (const [key, value] of Object.entries(filters)) {
    path += '&' + key + '=' + value;
  }
  const rows = await api(path, {
    headers: { 'Prefer': 'count=exact' }
  });
  return rows[0]?.count || 0;
}

// === Search ===

async function search(table, column, query, options = {}) {
  return getAll(table, {
    ...options,
    filters: {
      ...options.filters,
      [column]: 'ilike.*' + query + '*'
    }
  });
}
