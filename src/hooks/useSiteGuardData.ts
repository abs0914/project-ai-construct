import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Camera {
  id: string;
  name: string;
  location: string;
  ip_address: string;
  onvif_port: number;
  rtsp_url?: string;
  username: string;
  router_id?: string;
  status: 'online' | 'offline' | 'error';
  is_recording: boolean;
  last_seen?: string;
  created_at: string;
  updated_at: string;
}

export interface VpnRouter {
  id: string;
  name: string;
  model: string;
  ip_address: string;
  vpn_status: 'connected' | 'disconnected' | 'connecting' | 'error';
  api_key?: string;
  location: string;
  bandwidth_usage: number;
  last_seen?: string;
  created_at: string;
  updated_at: string;
  zerotier_network_id?: string;
  zerotier_node_id?: string;
  zerotier_status?: 'connected' | 'disconnected' | 'connecting' | 'error';
  zerotier_ip_address?: string;
  zerotier_enabled?: boolean;
}

export interface SecurityAlert {
  id: string;
  camera_id?: string;
  alert_type: 'motion' | 'intrusion' | 'equipment' | 'security' | 'safety';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: any;
  resolved: boolean;
  resolved_at?: string;
  created_at: string;
}

export interface SitePersonnel {
  id: string;
  name: string;
  role: string;
  badge_number: string;
  location?: string;
  check_in_time?: string;
  check_out_time?: string;
  status: 'active' | 'break' | 'checked_out' | 'emergency';
  created_at: string;
  updated_at: string;
}

export const useSiteGuardData = () => {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [routers, setRouters] = useState<VpnRouter[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [personnel, setPersonnel] = useState<SitePersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCameras((data as Camera[]) || []);
    } catch (err) {
      console.error('Error fetching cameras:', err);
      setError('Failed to fetch cameras');
    }
  };

  const fetchRouters = async () => {
    try {
      const { data, error } = await supabase
        .from('vpn_routers')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setRouters((data as VpnRouter[]) || []);
    } catch (err) {
      console.error('Error fetching routers:', err);
      setError('Failed to fetch routers');
    }
  };

  const fetchAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setAlerts((data as SecurityAlert[]) || []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
      setError('Failed to fetch alerts');
    }
  };

  const fetchPersonnel = async () => {
    try {
      const { data, error } = await supabase
        .from('site_personnel')
        .select('*')
        .neq('status', 'checked_out')
        .order('check_in_time', { ascending: false });

      if (error) throw error;
      setPersonnel((data as SitePersonnel[]) || []);
    } catch (err) {
      console.error('Error fetching personnel:', err);
      setError('Failed to fetch personnel');
    }
  };

  const updateCameraRecording = async (cameraId: string, isRecording: boolean) => {
    try {
      const { error } = await supabase
        .from('cameras')
        .update({ is_recording: isRecording })
        .eq('id', cameraId);

      if (error) throw error;
      
      setCameras(prev => 
        prev.map(camera => 
          camera.id === cameraId 
            ? { ...camera, is_recording: isRecording }
            : camera
        )
      );
    } catch (err) {
      console.error('Error updating camera recording:', err);
      throw err;
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ 
          resolved: true, 
          resolved_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      console.error('Error resolving alert:', err);
      throw err;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchCameras(),
          fetchRouters(),
          fetchAlerts(),
          fetchPersonnel()
        ]);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up real-time subscriptions
    const camerasSubscription = supabase
      .channel('cameras-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'cameras' }, 
        fetchCameras
      )
      .subscribe();

    const alertsSubscription = supabase
      .channel('alerts-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'security_alerts' }, 
        fetchAlerts
      )
      .subscribe();

    return () => {
      supabase.removeChannel(camerasSubscription);
      supabase.removeChannel(alertsSubscription);
    };
  }, []);

  return {
    cameras,
    routers,
    alerts,
    personnel,
    loading,
    error,
    updateCameraRecording,
    resolveAlert,
    refetch: {
      cameras: fetchCameras,
      routers: fetchRouters,
      alerts: fetchAlerts,
      personnel: fetchPersonnel
    }
  };
};