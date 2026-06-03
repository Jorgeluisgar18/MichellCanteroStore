-- Audit Log Table for tracking critical changes
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- 'order', 'product', 'user', 'profile'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  changes JSONB, -- Store before/after values
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON audit_log
  FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- System can insert audit logs (via service role)
CREATE POLICY "System can insert audit logs" ON audit_log
  FOR INSERT
  WITH CHECK (true);

-- Trigger function to log profile changes
CREATE OR REPLACE FUNCTION log_profile_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'profile',
      NEW.id,
      'update',
      auth.uid(),
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to profiles table
DROP TRIGGER IF EXISTS profile_audit_trigger ON profiles;
CREATE TRIGGER profile_audit_trigger
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_profile_changes();

-- Trigger function to log order changes
CREATE OR REPLACE FUNCTION log_order_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'order',
      NEW.id,
      'create',
      NEW.user_id,
      jsonb_build_object('data', row_to_json(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, changes)
    VALUES (
      'order',
      NEW.id,
      'update',
      auth.uid(),
      jsonb_build_object(
        'before', row_to_json(OLD),
        'after', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to orders table
DROP TRIGGER IF EXISTS order_audit_trigger ON orders;
CREATE TRIGGER order_audit_trigger
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_changes();
