-- SiteGuard Row Level Security (RLS) Policies
-- This file contains comprehensive RLS policies for data access control

-- Enable RLS on all tables
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vpn_routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create helper functions for RLS policies
CREATE OR REPLACE FUNCTION auth.user_id() RETURNS uuid AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    (current_setting('request.jwt.claim.sub', true))::text
  )::uuid;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_role() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'role',
    (current_setting('request.jwt.claim.role', true))::text,
    'viewer'
  );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_email() RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    (current_setting('request.jwt.claim.email', true))::text
  );
$$ LANGUAGE sql STABLE;

-- Function to check if user has permission for a site
CREATE OR REPLACE FUNCTION user_has_site_access(site_id uuid) RETURNS boolean AS $$
DECLARE
  user_role text := auth.user_role();
  user_id uuid := auth.user_id();
BEGIN
  -- Super admins have access to everything
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Admins have access to sites in their organization
  IF user_role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.sites s
      WHERE s.id = site_id
      AND s.organization_id IN (
        SELECT organization_id FROM public.user_organizations
        WHERE user_id = auth.user_id()
      )
    );
  END IF;
  
  -- Operators and viewers need explicit site access
  RETURN EXISTS (
    SELECT 1 FROM public.site_users su
    WHERE su.site_id = site_id
    AND su.user_id = auth.user_id()
    AND su.is_active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user can modify data
CREATE OR REPLACE FUNCTION user_can_modify() RETURNS boolean AS $$
DECLARE
  user_role text := auth.user_role();
BEGIN
  RETURN user_role IN ('admin', 'super_admin', 'operator');
END;
$$ LANGUAGE plpgsql STABLE;

-- Sites table policies
CREATE POLICY "Users can view sites they have access to" ON public.sites
  FOR SELECT USING (user_has_site_access(id));

CREATE POLICY "Admins can insert sites" ON public.sites
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('admin', 'super_admin') AND
    organization_id IN (
      SELECT organization_id FROM public.user_organizations
      WHERE user_id = auth.user_id()
    )
  );

CREATE POLICY "Admins can update sites" ON public.sites
  FOR UPDATE USING (
    auth.user_role() IN ('admin', 'super_admin') AND
    user_has_site_access(id)
  );

CREATE POLICY "Super admins can delete sites" ON public.sites
  FOR DELETE USING (auth.user_role() = 'super_admin');

-- Cameras table policies
CREATE POLICY "Users can view cameras for accessible sites" ON public.cameras
  FOR SELECT USING (user_has_site_access(site_id));

CREATE POLICY "Operators can insert cameras" ON public.cameras
  FOR INSERT WITH CHECK (
    user_can_modify() AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Operators can update cameras" ON public.cameras
  FOR UPDATE USING (
    user_can_modify() AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Admins can delete cameras" ON public.cameras
  FOR DELETE USING (
    auth.user_role() IN ('admin', 'super_admin') AND
    user_has_site_access(site_id)
  );

-- Alerts table policies
CREATE POLICY "Users can view alerts for accessible sites" ON public.alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cameras c
      WHERE c.id = camera_id
      AND user_has_site_access(c.site_id)
    )
  );

CREATE POLICY "System can insert alerts" ON public.alerts
  FOR INSERT WITH CHECK (
    -- Allow system/service accounts to insert alerts
    auth.user_role() IN ('system', 'service') OR
    (
      user_can_modify() AND
      EXISTS (
        SELECT 1 FROM public.cameras c
        WHERE c.id = camera_id
        AND user_has_site_access(c.site_id)
      )
    )
  );

CREATE POLICY "Operators can update alerts" ON public.alerts
  FOR UPDATE USING (
    user_can_modify() AND
    EXISTS (
      SELECT 1 FROM public.cameras c
      WHERE c.id = camera_id
      AND user_has_site_access(c.site_id)
    )
  );

CREATE POLICY "Admins can delete alerts" ON public.alerts
  FOR DELETE USING (
    auth.user_role() IN ('admin', 'super_admin') AND
    EXISTS (
      SELECT 1 FROM public.cameras c
      WHERE c.id = camera_id
      AND user_has_site_access(c.site_id)
    )
  );

-- Personnel table policies
CREATE POLICY "Users can view personnel for accessible sites" ON public.personnel
  FOR SELECT USING (user_has_site_access(site_id));

CREATE POLICY "Operators can insert personnel" ON public.personnel
  FOR INSERT WITH CHECK (
    user_can_modify() AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Operators can update personnel" ON public.personnel
  FOR UPDATE USING (
    user_can_modify() AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Admins can delete personnel" ON public.personnel
  FOR DELETE USING (
    auth.user_role() IN ('admin', 'super_admin') AND
    user_has_site_access(site_id)
  );

-- VPN Routers table policies
CREATE POLICY "Users can view routers for accessible sites" ON public.vpn_routers
  FOR SELECT USING (user_has_site_access(site_id));

CREATE POLICY "Admins can insert routers" ON public.vpn_routers
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('admin', 'super_admin') AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Admins can update routers" ON public.vpn_routers
  FOR UPDATE USING (
    auth.user_role() IN ('admin', 'super_admin') AND
    user_has_site_access(site_id)
  );

CREATE POLICY "Super admins can delete routers" ON public.vpn_routers
  FOR DELETE USING (auth.user_role() = 'super_admin');

-- Audit logs table policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('system', 'service', 'admin', 'super_admin')
  );

CREATE POLICY "Super admins can delete old audit logs" ON public.audit_logs
  FOR DELETE USING (
    auth.user_role() = 'super_admin' AND
    created_at < NOW() - INTERVAL '1 year'
  );

-- API Keys table policies
CREATE POLICY "Users can view their own API keys" ON public.api_keys
  FOR SELECT USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Admins can insert API keys" ON public.api_keys
  FOR INSERT WITH CHECK (auth.user_role() IN ('admin', 'super_admin'));

CREATE POLICY "Users can update their own API keys" ON public.api_keys
  FOR UPDATE USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can delete their own API keys" ON public.api_keys
  FOR DELETE USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

-- User Sessions table policies
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
  FOR SELECT USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "System can insert sessions" ON public.user_sessions
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('system', 'service') OR
    user_id = auth.user_id()
  );

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
  FOR UPDATE USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can delete their own sessions" ON public.user_sessions
  FOR DELETE USING (
    user_id = auth.user_id() OR
    auth.user_role() IN ('admin', 'super_admin')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON public.sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_cameras_site_id ON public.cameras(site_id);
CREATE INDEX IF NOT EXISTS idx_alerts_camera_id ON public.alerts(camera_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON public.alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_personnel_site_id ON public.personnel(site_id);
CREATE INDEX IF NOT EXISTS idx_vpn_routers_site_id ON public.vpn_routers(site_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.audit_logs (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    user_email,
    ip_address,
    user_agent
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    auth.user_id(),
    auth.user_email(),
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
  
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive tables
CREATE TRIGGER audit_sites_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.sites
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_cameras_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.cameras
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_vpn_routers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.vpn_routers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_api_keys_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create service role for system operations
CREATE ROLE service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Comments for documentation
COMMENT ON FUNCTION user_has_site_access(uuid) IS 'Checks if the current user has access to a specific site based on their role and site assignments';
COMMENT ON FUNCTION user_can_modify() IS 'Checks if the current user has permission to modify data based on their role';
COMMENT ON FUNCTION audit_trigger_function() IS 'Audit trigger function that logs all changes to sensitive tables';

-- Security best practices
-- 1. All tables have RLS enabled
-- 2. Policies are based on user roles and site access
-- 3. Audit logging is implemented for sensitive operations
-- 4. Indexes are created for performance
-- 5. Service accounts have appropriate permissions
-- 6. Functions use SECURITY DEFINER for controlled privilege escalation
