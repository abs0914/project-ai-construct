-- Add sample data for SiteGuard development
-- Insert sample cameras
INSERT INTO cameras (name, location, ip_address, onvif_port, rtsp_url, username, status, is_recording)
VALUES 
  ('Front Gate Camera', 'Main Entrance', '192.168.1.101', 80, 'rtsp://192.168.1.101:554/stream1', 'admin', 'online', false),
  ('Construction Zone 1', 'North Section', '192.168.1.102', 80, 'rtsp://192.168.1.102:554/stream1', 'admin', 'online', true),
  ('Parking Area', 'West Side', '192.168.1.103', 80, 'rtsp://192.168.1.103:554/stream1', 'admin', 'offline', false),
  ('Storage Shed', 'South Section', '192.168.1.104', 80, 'rtsp://192.168.1.104:554/stream1', 'admin', 'online', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample VPN routers
INSERT INTO vpn_routers (name, model, ip_address, vpn_status, location, bandwidth_usage, zerotier_network_id, zerotier_status, zerotier_enabled)
VALUES 
  ('Main Site Router', 'GL-MT300N-V2', '192.168.1.1', 'connected', 'Main Office', 150000000, 'abc123def456', 'connected', true),
  ('Zone 1 Router', 'GL-AR150', '192.168.2.1', 'connected', 'Construction Zone 1', 75000000, 'def456ghi789', 'connected', true),
  ('Zone 2 Router', 'GL-MT300N', '192.168.3.1', 'disconnected', 'Construction Zone 2', 0, null, 'disconnected', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample security alerts
INSERT INTO security_alerts (alert_type, severity, message, camera_id, metadata, resolved)
VALUES 
  ('motion', 'medium', 'Motion detected in restricted area', (SELECT id FROM cameras WHERE name = 'Front Gate Camera' LIMIT 1), '{"confidence": 0.85, "zone": "entrance"}', false),
  ('intrusion', 'high', 'Unauthorized access detected', (SELECT id FROM cameras WHERE name = 'Construction Zone 1' LIMIT 1), '{"confidence": 0.92, "person_count": 2}', false),
  ('equipment', 'low', 'Equipment left unattended', (SELECT id FROM cameras WHERE name = 'Storage Shed' LIMIT 1), '{"equipment_type": "excavator", "duration": 120}', false)
ON CONFLICT (id) DO NOTHING;

-- Insert sample personnel
INSERT INTO site_personnel (name, role, badge_number, location, status, check_in_time)
VALUES 
  ('John Smith', 'Site Manager', 'SM001', 'Main Office', 'active', NOW() - INTERVAL '2 hours'),
  ('Maria Garcia', 'Safety Officer', 'SO005', 'Construction Zone 1', 'active', NOW() - INTERVAL '1 hour'),
  ('David Chen', 'Equipment Operator', 'EO012', 'Construction Zone 1', 'break', NOW() - INTERVAL '3 hours'),
  ('Sarah Johnson', 'Foreman', 'FM003', 'Construction Zone 2', 'active', NOW() - INTERVAL '30 minutes'),
  ('Mike Wilson', 'Security Guard', 'SG007', 'Main Entrance', 'active', NOW() - INTERVAL '8 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert sample ZeroTier networks
INSERT INTO zerotier_networks (network_id, network_name, description, is_active)
VALUES 
  ('abc123def456ghi789', 'SiteGuard Main Network', 'Primary network for all site devices', true),
  ('def456ghi789jkl012', 'Backup Network', 'Secondary network for redundancy', false)
ON CONFLICT (id) DO NOTHING;