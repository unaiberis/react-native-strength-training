/**
 * PocketBase API Helpers
 *
 * Low-level functions for authenticating and performing CRUD operations
 * against the PocketBase REST API. Uses fetch() — no SDK dependency.
 */

// ─── Configuration Defaults ─────────────────────────────────────────────

const DEFAULT_URL = 'http://127.0.0.1:8090';
const DEFAULT_ADMIN_EMAIL = 'aitor@musikak.com';
const DEFAULT_ADMIN_PASS = 'entrenamentua2026';

// ─── Auth ───────────────────────────────────────────────────────────────

/**
 * Authenticate as PocketBase admin.
 * @returns {{ token: string, headers: object }}
 */
export async function authenticate(overrides = {}) {
  const url = overrides.pbUrl || process.env.PB_URL || DEFAULT_URL;
  const email =
    overrides.adminEmail || process.env.PB_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
  const pass =
    overrides.adminPass || process.env.PB_ADMIN_PASS || DEFAULT_ADMIN_PASS;

  const res = await fetch(`${url}/api/admins/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: email, password: pass }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const token = data.token;
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  return { token, headers, baseUrl: url };
}

// ─── Auth as Regular User ───────────────────────────────────────────────

/**
 * Authenticate as a regular user (email + password).
 * Used for SDK-style verification in verify-seed.mjs.
 */
export async function authenticateUser(baseUrl, email, password) {
  const res = await fetch(
    `${baseUrl}/api/collections/users/auth-with-password`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`User auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return {
    token: data.token,
    record: data.record,
    headers: {
      Authorization: `Bearer ${data.token}`,
      'Content-Type': 'application/json',
    },
  };
}

// ─── CRUD Operations ────────────────────────────────────────────────────

/**
 * Create a single record.
 * @returns {object|null} The created record, or null on failure.
 */
export async function createRecord(collection, data, headers, baseUrl) {
  const url = `${baseUrl}/api/collections/${collection}/records`;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    // If it's a duplicate (unique constraint), return null silently
    if (res.status === 409 || text.includes('validation_not_unique')) {
      return null;
    }
    console.warn(
      `  [WARN] create ${collection}: HTTP ${res.status} — ${text.substring(0, 150)}`
    );
    return null;
  }

  return res.json();
}

/**
 * Update an existing record.
 */
export async function updateRecord(collection, id, data, headers, baseUrl) {
  const url = `${baseUrl}/api/collections/${collection}/records/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(
      `  [WARN] update ${collection}/${id}: HTTP ${res.status} — ${text.substring(0, 150)}`
    );
    return null;
  }

  return res.json();
}

/**
 * Get a record by ID.
 */
export async function getRecord(collection, id, headers, baseUrl) {
  const url = `${baseUrl}/api/collections/${collection}/records/${id}`;
  const res = await fetch(url, { headers });

  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`get ${collection}/${id}: HTTP ${res.status} — ${text}`);
  }

  return res.json();
}

/**
 * Get the first record matching a filter.
 */
export async function getFirstRecord(collection, filter, headers, baseUrl) {
  const url = `${baseUrl}/api/collections/${collection}/records?filter=${encodeURIComponent(filter)}&perPage=1`;
  const res = await fetch(url, { headers });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`getFirst ${collection}: HTTP ${res.status} — ${text}`);
  }

  const data = await res.json();
  return data.items?.[0] || null;
}

/**
 * Get all records from a collection (with optional filter).
 */
export async function getAllRecords(collection, filter = '', headers, baseUrl) {
  const params = new URLSearchParams({ perPage: '200', sort: 'created' });
  if (filter) params.set('filter', filter);

  let allItems = [];
  let page = 1;

  while (true) {
    params.set('page', String(page));
    const url = `${baseUrl}/api/collections/${collection}/records?${params}`;
    const res = await fetch(url, { headers });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`getAll ${collection}: HTTP ${res.status} — ${text}`);
    }

    const data = await res.json();
    allItems = allItems.concat(data.items || []);

    if (allItems.length >= data.totalItems) break;
    page++;
  }

  return allItems;
}

/**
 * Delete a single record.
 */
export async function deleteRecord(collection, id, headers, baseUrl) {
  const url = `${baseUrl}/api/collections/${collection}/records/${id}`;
  const res = await fetch(url, { method: 'DELETE', headers });

  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    console.warn(
      `  [WARN] delete ${collection}/${id}: HTTP ${res.status} — ${text.substring(0, 150)}`
    );
    return false;
  }

  return true;
}

/**
 * Delete ALL records from a collection (pagination-safe).
 * @returns {number} Number of records deleted.
 */
export async function deleteAllRecords(collection, headers, baseUrl) {
  let total = 0;
  while (true) {
    const url = `${baseUrl}/api/collections/${collection}/records?perPage=200&sort=created`;
    const res = await fetch(url, { headers });
    if (!res.ok) break;

    const data = await res.json();
    const ids = (data.items || []).map((i) => i.id);
    if (ids.length === 0) break;

    for (const id of ids) {
      await fetch(`${baseUrl}/api/collections/${collection}/records/${id}`, {
        method: 'DELETE',
        headers,
      });
      total++;
    }
  }
  return total;
}

/**
 * Check if a record exists by a specific field value.
 * Falls back to programmatic matching if filter has special characters.
 * @returns {object|null} The record if found, null otherwise.
 */
export async function findExisting(collection, field, value, headers, baseUrl) {
  const strValue = String(value);

  // If the value contains characters that break PocketBase filters (quotes,
  // backslashes, etc.), fall back to programmatic matching
  if (/['\\]/.test(strValue)) {
    const all = await getAllRecords(collection, '', headers, baseUrl);
    if (!all) return null;
    return all.find((r) => String(r[field]) === strValue) || null;
  }

  const filter = `${field} = '${strValue}'`;
  return getFirstRecord(collection, filter, headers, baseUrl);
}

/**
 * Create or update a record based on a unique field.
 * @param {string} collection
 * @param {string} uniqueField - Field to check uniqueness on (e.g. "name")
 * @param {string} uniqueValue - Value to match
 * @param {object} data - Full data to create/update
 * @returns {object} The existing or newly created record
 */
export async function upsertRecord(
  collection,
  uniqueField,
  uniqueValue,
  data,
  headers,
  baseUrl
) {
  let existing;
  try {
    existing = await findExisting(
      collection,
      uniqueField,
      uniqueValue,
      headers,
      baseUrl
    );
  } catch (err) {
    // Filter failed (e.g. special chars), try programmatic match
    const all = await getAllRecords(collection, '', headers, baseUrl);
    existing =
      all.find((r) => String(r[uniqueField]) === String(uniqueValue)) || null;
  }

  if (existing) {
    const updated = await updateRecord(
      collection,
      existing.id,
      data,
      headers,
      baseUrl
    );
    return updated || existing;
  }
  return createRecord(collection, data, headers, baseUrl);
}
