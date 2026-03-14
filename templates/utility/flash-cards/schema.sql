-- Flash Cards — Database Schema
-- Personal decks with spaced repetition and optional public sharing

CREATE TABLE decks (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  user_id uuid NOT NULL,
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE cards (
  id serial PRIMARY KEY,
  deck_id integer NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE progress (
  id serial PRIMARY KEY,
  card_id integer NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  ease_factor numeric DEFAULT 2.5,
  interval_days integer DEFAULT 0,
  next_review timestamptz DEFAULT now(),
  review_count integer DEFAULT 0,
  UNIQUE(card_id, user_id)
);

CREATE INDEX idx_decks_user ON decks(user_id);
CREATE INDEX idx_decks_public ON decks(is_public) WHERE is_public = true;
CREATE INDEX idx_cards_deck ON cards(deck_id);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_next ON progress(next_review);
