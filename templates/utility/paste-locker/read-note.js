import { db } from '@run402/functions';
import bcrypt from 'bcryptjs';

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { code, password } = body;
  if (!code || typeof code !== 'string') {
    return new Response(JSON.stringify({ error: 'Code is required' }), { status: 400 });
  }

  // Look up note by code
  const notes = await db.from('notes').select('*').eq('code', code).limit(1);
  if (!notes || notes.length === 0) {
    return new Response(JSON.stringify({ error: 'Note not found' }), { status: 404 });
  }

  const note = notes[0];

  // Check expiry
  if (note.expires_at && new Date(note.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'This note has expired' }), { status: 404 });
  }

  // Check burn-after-read
  if (note.burn_after_read && note.is_read) {
    return new Response(JSON.stringify({ error: 'This note has been burned' }), { status: 410 });
  }

  // Check password
  if (note.password_hash) {
    if (!password) {
      return new Response(JSON.stringify({ error: 'Password required', needs_password: true }), { status: 403 });
    }
    const valid = await bcrypt.compare(password, note.password_hash);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Wrong password' }), { status: 403 });
    }
  }

  // Mark as read if burn-after-read
  if (note.burn_after_read && !note.is_read) {
    await db.from('notes').update({ is_read: true }).eq('id', note.id);
  }

  return new Response(JSON.stringify({
    title: note.title,
    content: note.content_encrypted,
    burn_after_read: note.burn_after_read,
    created_at: note.created_at,
  }), { status: 200 });
};
