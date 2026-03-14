-- Micro-Blog — Database Schema
-- Posts with optional image attachments, authenticated posting, public reading

CREATE TABLE posts (
  id serial PRIMARY KEY,
  body text NOT NULL CHECK (char_length(body) <= 500),
  image_path text,
  user_id uuid NOT NULL,
  author_name text NOT NULL,
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_user ON posts(user_id);
