import { db } from '@run402/functions';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

const schema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(100000),
  password: z.string().min(1).max(200).optional(),
  burn_after_read: z.boolean().optional(),
  expires_in: z.enum(['1h', '24h', '7d']).optional(),
});

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getExpiresAt(expiresIn) {
  if (!expiresIn) return null;
  const now = Date.now();
  const ms = { '1h': 3600000, '24h': 86400000, '7d': 604800000 };
  return new Date(now + ms[expiresIn]).toISOString();
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body;
  try {
    body = schema.parse(await req.json());
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Invalid input', details: err.errors }), { status: 400 });
  }

  const code = generateCode();
  const password_hash = body.password ? await bcrypt.hash(body.password, 10) : null;
  const expires_at = getExpiresAt(body.expires_in);

  const [note] = await db.from('notes').insert({
    code,
    title: body.title || 'Untitled',
    content_encrypted: body.content,
    password_hash,
    burn_after_read: body.burn_after_read || false,
    expires_at,
  });

  return new Response(JSON.stringify({
    code,
    has_password: !!password_hash,
    burn_after_read: body.burn_after_read || false,
  }), { status: 201 });
};
