-- AI Sticker Maker — Database Schema
-- AI-generated sticker images with public gallery

CREATE TABLE stickers (
  id serial PRIMARY KEY,
  prompt text NOT NULL CHECK (char_length(prompt) <= 200),
  image_path text NOT NULL,
  creator_name text DEFAULT 'Anonymous',
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stickers_created ON stickers(created_at DESC);
