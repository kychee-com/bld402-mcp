-- Landing Page + Waitlist — Database Schema
-- Stores email signups for a product launch waitlist

CREATE TABLE signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_signups_email ON signups(email);
