-- Hangman — Database Schema
-- Stores word list and game state for solo or pass-and-play hangman

CREATE TABLE words (
  id serial PRIMARY KEY,
  word text NOT NULL,
  category text,
  difficulty text DEFAULT 'medium'
);

CREATE TABLE games (
  id serial PRIMARY KEY,
  word_id integer REFERENCES words(id),
  guesses text[] DEFAULT '{}',
  status text DEFAULT 'playing',
  created_at timestamptz DEFAULT now()
);

-- Seed with 50+ words across easy/medium/hard difficulty levels

-- Easy (4-5 letters)
INSERT INTO words (word, category, difficulty) VALUES
  ('cat', 'animals', 'easy'),
  ('dog', 'animals', 'easy'),
  ('fish', 'animals', 'easy'),
  ('bird', 'animals', 'easy'),
  ('book', 'objects', 'easy'),
  ('tree', 'nature', 'easy'),
  ('star', 'nature', 'easy'),
  ('moon', 'nature', 'easy'),
  ('cake', 'food', 'easy'),
  ('rain', 'nature', 'easy'),
  ('frog', 'animals', 'easy'),
  ('lamp', 'objects', 'easy'),
  ('door', 'objects', 'easy'),
  ('bear', 'animals', 'easy'),
  ('milk', 'food', 'easy'),
  ('ship', 'objects', 'easy'),
  ('wolf', 'animals', 'easy');

-- Medium (6-7 letters)
INSERT INTO words (word, category, difficulty) VALUES
  ('garden', 'nature', 'medium'),
  ('puzzle', 'objects', 'medium'),
  ('rocket', 'objects', 'medium'),
  ('castle', 'objects', 'medium'),
  ('bridge', 'objects', 'medium'),
  ('planet', 'nature', 'medium'),
  ('sunset', 'nature', 'medium'),
  ('monkey', 'animals', 'medium'),
  ('dragon', 'animals', 'medium'),
  ('turtle', 'animals', 'medium'),
  ('pirate', 'general', 'medium'),
  ('basket', 'objects', 'medium'),
  ('cheese', 'food', 'medium'),
  ('desert', 'nature', 'medium'),
  ('frozen', 'general', 'medium'),
  ('hammer', 'objects', 'medium'),
  ('jungle', 'nature', 'medium');

-- Hard (8+ letters)
INSERT INTO words (word, category, difficulty) VALUES
  ('elephant', 'animals', 'hard'),
  ('dinosaur', 'animals', 'hard'),
  ('fireworks', 'general', 'hard'),
  ('adventure', 'general', 'hard'),
  ('butterfly', 'animals', 'hard'),
  ('crocodile', 'animals', 'hard'),
  ('pineapple', 'food', 'hard'),
  ('telescope', 'objects', 'hard'),
  ('chocolate', 'food', 'hard'),
  ('jellyfish', 'animals', 'hard'),
  ('waterfall', 'nature', 'hard'),
  ('lemonade', 'food', 'hard'),
  ('mountain', 'nature', 'hard'),
  ('notebook', 'objects', 'hard'),
  ('sandwich', 'food', 'hard'),
  ('umbrella', 'objects', 'hard'),
  ('keyboard', 'objects', 'hard'),
  ('penguin', 'animals', 'hard'),
  ('rainbow', 'nature', 'hard'),
  ('volcano', 'nature', 'hard');
