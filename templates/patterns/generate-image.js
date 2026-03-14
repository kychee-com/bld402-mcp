/**
 * run402 AI Image Generation Pattern
 *
 * Generates images from text prompts via run402's /v1/generate-image endpoint.
 * This endpoint is x402-gated ($0.01 per image) — requires crypto wallet payment.
 *
 * Since end users won't have wallets, the pattern uses a server-side Lambda
 * function as a proxy. The function holds wallet credentials as secrets and
 * handles x402 payment on behalf of the user.
 *
 * Requires: db-connection.js (CONFIG), functions.js (callFunction),
 *           file-upload.js (uploadFile) — if saving to storage.
 *
 * Setup (agent does this during build):
 *   1. Deploy the generate-image-proxy function (see Lambda code below)
 *   2. Set secrets: WALLET_PRIVATE_KEY (from project wallet)
 *   3. Client calls the proxy function, which calls /v1/generate-image with x402
 */

// === Client-Side: Generate an Image ===
// Calls the server-side proxy function to generate an image.
// Returns: { image_url, prompt } or throws on error.

async function generateImage(prompt) {
  return callFunction('generate-image-proxy', { prompt });
  // Returns: { image_url: "https://...", prompt: "..." }
}

// === Client-Side: Generate and Save to Storage ===
// Generates an image, downloads it, uploads to storage bucket.
// Returns: { image_url, storage_path, prompt }

async function generateAndSave(prompt, bucket, pathPrefix) {
  // 1. Generate image via proxy function
  const result = await generateImage(prompt);

  // 2. Download the generated image
  const imgRes = await fetch(result.image_url);
  if (!imgRes.ok) throw new Error('Failed to download generated image');
  const blob = await imgRes.blob();

  // 3. Upload to storage
  const filename = pathPrefix + '/' + Date.now() + '.png';
  await uploadFile(bucket, filename, blob);

  return {
    image_url: result.image_url,
    storage_path: filename,
    prompt: prompt
  };
}

// === UI Helper: Generate with Loading State ===
// Wires up a prompt input + generate button with loading feedback.
//
// promptInputId: ID of the text input for the prompt
// generateBtnId: ID of the generate button
// previewImgId: ID of an <img> element to show the result
// onGenerated: callback(result) called after successful generation

function setupGenerateUI(promptInputId, generateBtnId, previewImgId, onGenerated) {
  const btn = document.getElementById(generateBtnId);
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const input = document.getElementById(promptInputId);
    const prompt = input.value.trim();
    if (!prompt) return;

    const preview = document.getElementById(previewImgId);
    btn.disabled = true;
    const origText = btn.textContent;
    btn.textContent = 'Generating...';

    try {
      const result = await generateImage(prompt);
      if (preview) {
        preview.src = result.image_url;
        preview.style.display = '';
      }
      if (onGenerated) onGenerated(result);
    } catch (err) {
      alert('Generation failed: ' + (err.message || 'Unknown error'));
    } finally {
      btn.disabled = false;
      btn.textContent = origText;
    }
  });
}


// ==========================================================================
// LAMBDA FUNCTION CODE — Deploy this as "generate-image-proxy"
// ==========================================================================
//
// The agent deploys this function during the build process.
// Secrets required: WALLET_PRIVATE_KEY
//
// --- Copy below into the function deployment ---
//
// module.exports.handler = async (event) => {
//   const { prompt } = JSON.parse(event.body || '{}');
//   if (!prompt) {
//     return { statusCode: 400, body: JSON.stringify({ error: 'prompt is required' }) };
//   }
//
//   const API_URL = 'https://api.run402.com';
//   const WALLET_KEY = process.env.WALLET_PRIVATE_KEY;
//
//   // Step 1: Try the generate-image endpoint (will return 402)
//   const initialRes = await fetch(API_URL + '/v1/generate-image', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ prompt })
//   });
//
//   if (initialRes.status !== 402) {
//     // If not 402, either succeeded (unlikely) or errored
//     const data = await initialRes.json();
//     return { statusCode: initialRes.status, body: JSON.stringify(data) };
//   }
//
//   // Step 2: Parse x402 payment requirements from 402 response
//   // The 402 response includes payment instructions in headers/body.
//   // Use @x402/fetch to handle payment automatically.
//   //
//   // Note: The function's package.json must include @x402/fetch and @x402/evm.
//   // The agent adds these as dependencies during function deployment.
//
//   const { wrapFetchWithPayment, x402Client } = require('@x402/fetch');
//   const { ExactEvmScheme, toClientEvmSigner } = require('@x402/evm');
//   const { privateKeyToAccount } = require('viem/accounts');
//   const { createPublicClient, http } = require('viem');
//   const { baseSepolia } = require('viem/chains');
//
//   const account = privateKeyToAccount(WALLET_KEY);
//   const publicClient = createPublicClient({ chain: baseSepolia, transport: http() });
//   const signer = toClientEvmSigner(account, publicClient);
//   const client = new x402Client();
//   client.register('eip155:84532', new ExactEvmScheme(signer));
//   const fetchPaid = wrapFetchWithPayment(fetch, client);
//
//   const paidRes = await fetchPaid(API_URL + '/v1/generate-image', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ prompt })
//   });
//
//   const data = await paidRes.json();
//   return {
//     statusCode: paidRes.status,
//     body: JSON.stringify(data)
//   };
// };
// --- End of Lambda function code ---
