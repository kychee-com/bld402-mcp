-- Trivia Night — Database Schema
-- Kahoot-style multiplayer quiz: host creates room, players join via code

CREATE TABLE rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  host_name text NOT NULL,
  status text DEFAULT 'lobby',
  current_question integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_index integer NOT NULL,
  time_limit integer DEFAULT 20,
  sort_order integer NOT NULL
);

CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  name text NOT NULL,
  score integer DEFAULT 0,
  joined_at timestamptz DEFAULT now()
);

CREATE TABLE answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
  question_id uuid REFERENCES questions(id) ON DELETE CASCADE,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  selected_index integer NOT NULL,
  is_correct boolean DEFAULT false,
  answered_at timestamptz DEFAULT now(),
  UNIQUE(question_id, player_id)
);

CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_questions_room ON questions(room_id, sort_order);
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_answers_question ON answers(question_id);

-- Atomic score increment to avoid read-then-write race conditions
CREATE OR REPLACE FUNCTION increment_score(p_player_id uuid, p_points integer)
RETURNS void AS $$
  UPDATE players SET score = score + p_points WHERE id = p_player_id;
$$ LANGUAGE sql;
