/**
 * run402 File Upload Pattern
 *
 * Provides: upload, download, list, delete files via S3-backed storage.
 * Requires: db-connection.js (CONFIG and api() function).
 */

// === Upload File ===

async function uploadFile(bucket, path, file) {
  const response = await fetch(CONFIG.API_URL + '/storage/v1/object/' + bucket + '/' + path, {
    method: 'POST',
    headers: {
      'apikey': CONFIG.ANON_KEY
    },
    body: file  // Raw file content (File or Blob)
  });

  if (!response.ok) throw new Error(await response.text());
  return response.json();  // { key, size }
}

// === Download File ===

async function downloadFile(bucket, path) {
  const response = await fetch(CONFIG.API_URL + '/storage/v1/object/' + bucket + '/' + path, {
    headers: {
      'apikey': CONFIG.ANON_KEY
    }
  });

  if (!response.ok) throw new Error('File not found');
  return response;  // Use .blob(), .text(), .arrayBuffer() as needed
}

// === Get Signed URL ===
// Use for temporary public access to a file (expires in 1 hour)

async function getSignedUrl(bucket, path) {
  const data = await api('/storage/v1/object/sign/' + bucket + '/' + path, {
    method: 'POST'
  });
  return data.signed_url;  // Full URL, accessible without auth for 1 hour
}

// === List Files ===

async function listFiles(bucket) {
  return api('/storage/v1/object/list/' + bucket);
  // Returns: { objects: [{ key, size, last_modified }] }
}

// === Delete File ===

async function deleteFile(bucket, path) {
  return api('/storage/v1/object/' + bucket + '/' + path, {
    method: 'DELETE'
  });
}

// === File Input Helper ===
// Attach to an <input type="file"> element for easy upload

function setupFileInput(inputId, bucket, onUploaded) {
  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const path = Date.now() + '-' + file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const result = await uploadFile(bucket, path, file);
      if (onUploaded) onUploaded(result.key, file.name, file.size);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    }
  });
}

// === Image Preview Helper ===
// Show uploaded image inline

async function showImagePreview(bucket, key, imgElementId) {
  const url = await getSignedUrl(bucket, key);
  const img = document.getElementById(imgElementId);
  if (img) img.src = url;
}
