-- Shared Todo List — Database Schema
-- Creates tables for a collaborative task list with assignments

CREATE TABLE todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  done boolean DEFAULT false,
  assigned_to text,
  user_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_todos_user ON todos(user_id);
CREATE INDEX idx_todos_done ON todos(done);
