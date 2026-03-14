-- Bingo Card Generator — Database Schema
-- Host creates games, players get unique cards, host calls items

CREATE TABLE games (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  host_name text NOT NULL,
  status text DEFAULT 'setup' CHECK (status IN ('setup', 'playing', 'finished')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE items (
  id serial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  label text NOT NULL,
  called boolean DEFAULT false,
  call_order integer
);

CREATE TABLE players (
  id serial PRIMARY KEY,
  game_id integer NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  card jsonb NOT NULL DEFAULT '[]',
  marked jsonb NOT NULL DEFAULT '[]',
  has_bingo boolean DEFAULT false,
  joined_at timestamptz DEFAULT now()
);

CREATE INDEX idx_items_game ON items(game_id);
CREATE INDEX idx_players_game ON players(game_id);
CREATE INDEX idx_games_code ON games(code);
