-- Create cameras table for ONVIF camera management
CREATE TABLE public.cameras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  ip_address INET NOT NULL,
  onvif_port INTEGER DEFAULT 80,
  rtsp_url TEXT,
  username TEXT,
  password_encrypted TEXT,
  router_id UUID,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'error')),
  is_recording BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create VPN routers table for GL.iNET management  
CREATE TABLE public.vpn_routers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  model TEXT DEFAULT 'GL-MT300N',
  ip_address INET NOT NULL,
  vpn_status TEXT DEFAULT 'disconnected' CHECK (vpn_status IN ('connected', 'disconnected', 'connecting', 'error')),
  api_key TEXT,
  location TEXT,
  bandwidth_usage BIGINT DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security alerts table
CREATE TABLE public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('motion', 'intrusion', 'equipment', 'security', 'safety')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create personnel tracking table
CREATE TABLE public.site_personnel (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  badge_number TEXT UNIQUE,
  location TEXT,
  check_in_time TIMESTAMP WITH TIME ZONE,
  check_out_time TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'checked_out' CHECK (status IN ('active', 'break', 'checked_out', 'emergency')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create camera recordings table
CREATE TABLE public.camera_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT,
  duration_seconds INTEGER,
  recording_type TEXT DEFAULT 'motion' CHECK (recording_type IN ('scheduled', 'motion', 'manual', 'alert')),
  storage_path TEXT,
  thumbnail_path TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add foreign key constraint for router reference in cameras
ALTER TABLE public.cameras 
ADD CONSTRAINT fk_cameras_router 
FOREIGN KEY (router_id) REFERENCES public.vpn_routers(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vpn_routers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_personnel ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_recordings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing all access for now - to be refined based on auth requirements)
CREATE POLICY "Enable all access for cameras" ON public.cameras FOR ALL USING (true);
CREATE POLICY "Enable all access for vpn_routers" ON public.vpn_routers FOR ALL USING (true);
CREATE POLICY "Enable all access for security_alerts" ON public.security_alerts FOR ALL USING (true);
CREATE POLICY "Enable all access for site_personnel" ON public.site_personnel FOR ALL USING (true);
CREATE POLICY "Enable all access for camera_recordings" ON public.camera_recordings FOR ALL USING (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_cameras_updated_at
  BEFORE UPDATE ON public.cameras
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vpn_routers_updated_at
  BEFORE UPDATE ON public.vpn_routers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_personnel_updated_at
  BEFORE UPDATE ON public.site_personnel
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data for development
INSERT INTO public.vpn_routers (name, model, ip_address, vpn_status, location) VALUES
('Router-Gate-A', 'GL-MT300N', '192.168.1.100', 'connected', 'Main Entrance'),
('Router-Zone-1', 'GL-MT300N', '192.168.1.101', 'connected', 'Construction Zone 1'),
('Router-Storage', 'GL-MT300N', '192.168.1.102', 'disconnected', 'Equipment Storage');

INSERT INTO public.cameras (name, location, ip_address, onvif_port, username, status, is_recording, router_id) VALUES
('Main Entrance Cam', 'Gate A', '192.168.1.200', 80, 'admin', 'online', true, (SELECT id FROM public.vpn_routers WHERE name = 'Router-Gate-A')),
('Construction Zone 1 Cam', 'Building A', '192.168.1.201', 80, 'admin', 'online', true, (SELECT id FROM public.vpn_routers WHERE name = 'Router-Zone-1')),
('Equipment Storage Cam', 'Yard B', '192.168.1.202', 80, 'admin', 'offline', false, (SELECT id FROM public.vpn_routers WHERE name = 'Router-Storage')),
('Worker Rest Area Cam', 'Building C', '192.168.1.203', 80, 'admin', 'online', false, (SELECT id FROM public.vpn_routers WHERE name = 'Router-Zone-1'));

INSERT INTO public.security_alerts (camera_id, alert_type, severity, message) VALUES
((SELECT id FROM public.cameras WHERE name = 'Main Entrance Cam'), 'security', 'high', 'Unauthorized access detected at Gate B'),
((SELECT id FROM public.cameras WHERE name = 'Construction Zone 1 Cam'), 'safety', 'medium', 'Worker without helmet in Zone 3'),
((SELECT id FROM public.cameras WHERE name = 'Equipment Storage Cam'), 'equipment', 'low', 'Excavator left running unattended');

INSERT INTO public.site_personnel (name, role, badge_number, location, check_in_time, status) VALUES
('John Smith', 'Site Manager', 'SM001', 'Building A', '2024-07-03 07:30:00+00:00', 'active'),
('Maria Garcia', 'Safety Inspector', 'SI002', 'Zone 2', '2024-07-03 08:00:00+00:00', 'active'),
('David Chen', 'Equipment Operator', 'EO003', 'Yard B', '2024-07-03 07:45:00+00:00', 'break'),
('Sarah Wilson', 'Foreman', 'FM004', 'Building C', '2024-07-03 07:15:00+00:00', 'active');

-- Create indexes for better performance
CREATE INDEX idx_cameras_status ON public.cameras(status);
CREATE INDEX idx_cameras_router_id ON public.cameras(router_id);
CREATE INDEX idx_security_alerts_camera_id ON public.security_alerts(camera_id);
CREATE INDEX idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX idx_security_alerts_resolved ON public.security_alerts(resolved);
CREATE INDEX idx_site_personnel_status ON public.site_personnel(status);