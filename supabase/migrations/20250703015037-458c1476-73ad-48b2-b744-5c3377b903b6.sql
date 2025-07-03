-- Remove mock data from all tables
DELETE FROM public.security_alerts;
DELETE FROM public.cameras;
DELETE FROM public.site_personnel;
DELETE FROM public.vpn_routers;

-- Remove the sample ZeroTier network
DELETE FROM public.zerotier_networks;