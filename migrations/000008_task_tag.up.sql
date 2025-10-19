ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS tag TEXT CHECK (tag IN ('feature','feature_request','issue'));

