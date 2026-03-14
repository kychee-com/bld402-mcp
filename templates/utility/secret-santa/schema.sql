-- Secret Santa — Database Schema
-- Anonymous gift exchange with groups, members, and server-side matching

CREATE TABLE groups (
  id serial PRIMARY KEY,
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  budget text,
  organizer_id uuid NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'drawn')),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE members (
  id serial PRIMARY KEY,
  group_id integer NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  wishlist text,
  assigned_to integer REFERENCES members(id),
  viewed_assignment boolean DEFAULT false,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_members_group ON members(group_id);
CREATE INDEX idx_members_user ON members(user_id);
CREATE INDEX idx_groups_code ON groups(code);
