-- Memory Match — Database Schema
-- Card flip matching game with AI-generated art and leaderboard

CREATE TABLE card_sets (
  id serial PRIMARY KEY,
  name text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE card_images (
  id serial PRIMARY KEY,
  card_set_id integer NOT NULL REFERENCES card_sets(id) ON DELETE CASCADE,
  prompt text NOT NULL,
  image_path text NOT NULL,
  pair_index integer NOT NULL
);

CREATE TABLE scores (
  id serial PRIMARY KEY,
  player_name text NOT NULL,
  difficulty text NOT NULL,
  moves integer NOT NULL,
  time_seconds integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_card_images_set ON card_images(card_set_id);
CREATE INDEX idx_scores_difficulty ON scores(difficulty, moves, time_seconds);
