-- Add ZeroTier fields to vpn_routers table
ALTER TABLE public.vpn_routers 
ADD COLUMN zerotier_network_id TEXT,
ADD COLUMN zerotier_node_id TEXT,
ADD COLUMN zerotier_status TEXT DEFAULT 'disconnected' CHECK (zerotier_status IN ('connected', 'disconnected', 'connecting', 'error')),
ADD COLUMN zerotier_ip_address INET,
ADD COLUMN zerotier_enabled BOOLEAN DEFAULT false;

-- Create ZeroTier networks table for managing multiple networks
CREATE TABLE public.zerotier_networks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  network_id TEXT NOT NULL UNIQUE,
  network_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for ZeroTier networks table
ALTER TABLE public.zerotier_networks ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for ZeroTier networks
CREATE POLICY "Enable all access for zerotier_networks" ON public.zerotier_networks FOR ALL USING (true);

-- Create trigger for automatic timestamp updates on zerotier_networks
CREATE TRIGGER update_zerotier_networks_updated_at
  BEFORE UPDATE ON public.zerotier_networks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample ZeroTier network for construction sites
INSERT INTO public.zerotier_networks (network_id, network_name, description) VALUES
('a84ac5c10a4a5d56', 'SiteGuard-Main', 'Main ZeroTier network for all construction sites');

-- Update existing routers to have ZeroTier enabled
UPDATE public.vpn_routers 
SET zerotier_enabled = true,
    zerotier_network_id = 'a84ac5c10a4a5d56',
    zerotier_status = 'connected',
    zerotier_ip_address = CASE 
      WHEN name = 'Router-Gate-A' THEN '10.147.19.101'::inet
      WHEN name = 'Router-Zone-1' THEN '10.147.19.102'::inet
      WHEN name = 'Router-Storage' THEN '10.147.19.103'::inet
    END,
    zerotier_node_id = CASE 
      WHEN name = 'Router-Gate-A' THEN 'a1b2c3d4e5'
      WHEN name = 'Router-Zone-1' THEN 'b2c3d4e5f6'
      WHEN name = 'Router-Storage' THEN 'c3d4e5f6g7'
    END;

-- Create index for better performance
CREATE INDEX idx_vpn_routers_zerotier_network_id ON public.vpn_routers(zerotier_network_id);
CREATE INDEX idx_vpn_routers_zerotier_status ON public.vpn_routers(zerotier_status);