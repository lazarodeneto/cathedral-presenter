CREATE TABLE IF NOT EXISTS cp_bootstrap (
  id integer PRIMARY KEY CHECK (id = 1),
  user_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO cp_bootstrap(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS cp_invitations (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL UNIQUE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin','operator')),
  expires_at timestamptz NOT NULL,
  used_by text,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_workspace (
  id integer PRIMARY KEY CHECK (id = 1),
  revision bigint NOT NULL DEFAULT 0,
  document jsonb,
  object_key text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO cp_workspace(id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS cp_workspace_history (
  revision bigint PRIMARY KEY,
  document jsonb NOT NULL,
  object_key text NOT NULL,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_uploads (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('media','workspace','scan','package')),
  owner_id text NOT NULL,
  name text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  sha256 text NOT NULL,
  parts integer NOT NULL,
  status text NOT NULL DEFAULT 'uploading',
  storage text NOT NULL DEFAULT 'drive',
  result jsonb,
  lease_token text,
  lease_worker text,
  lease_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_upload_parts (
  upload_id uuid NOT NULL REFERENCES cp_uploads(id) ON DELETE CASCADE,
  part integer NOT NULL,
  size integer NOT NULL,
  sha256 text NOT NULL,
  PRIMARY KEY(upload_id,part)
);
CREATE TABLE IF NOT EXISTS cp_media (
  id uuid PRIMARY KEY,
  record jsonb NOT NULL,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_oauth_states (
  state_hash text PRIMARY KEY,
  user_id text NOT NULL,
  verifier_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS cp_installations (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  platform text,
  can_scan boolean NOT NULL DEFAULT false,
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  last_seen timestamptz,
  created_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_pairing_codes (
  code_hash text PRIMARY KEY,
  name text NOT NULL,
  created_by text NOT NULL,
  can_scan boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL,
  consumed boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS cp_output_channels (
  installation_id uuid PRIMARY KEY REFERENCES cp_installations(id) ON DELETE CASCADE,
  controller text,
  controller_actor text,
  snapshot jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS cp_output_events (
  sequence bigserial PRIMARY KEY,
  installation_id uuid NOT NULL REFERENCES cp_installations(id) ON DELETE CASCADE,
  event_id text NOT NULL,
  message jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(installation_id,event_id)
);
CREATE INDEX IF NOT EXISTS cp_output_events_channel ON cp_output_events(installation_id,sequence);
CREATE TABLE IF NOT EXISTS cp_rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);
