-- Voting Booth — Database Schema
-- Create polls, share links, vote, see live results

CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  created_by text,
  multiple_choice boolean DEFAULT false,
  closed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid REFERENCES options(id) ON DELETE CASCADE,
  voter_id text NOT NULL,
  voted_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, voter_id)
);

CREATE INDEX idx_options_poll ON options(poll_id, sort_order);
CREATE INDEX idx_votes_poll ON votes(poll_id);
CREATE INDEX idx_votes_option ON votes(option_id);
