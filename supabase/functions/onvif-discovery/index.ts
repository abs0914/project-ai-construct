import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ONVIFDevice {
  ip: string;
  port: number;
  name?: string;
  manufacturer?: string;
  model?: string;
  rtsp_url?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { action, network_range, networkRange, deviceId, credentials } = await req.json();

    console.log(`ONVIF action: ${action}`);

    // Use either parameter name for backward compatibility
    const range = network_range || networkRange;

    let result;
    switch (action) {
      case 'discover':
        result = await performDiscovery(supabaseClient, range);
        break;
      case 'configure':
        result = await configureDevice(supabaseClient, deviceId, credentials);
        break;
      case 'get_devices':
        result = await getDevices();
        break;
      default:
        // Fallback to legacy discovery for backward compatibility
        result = await performDiscovery(supabaseClient, range || '192.168.8.0/24');
    }

    return new Response(
      JSON.stringify({
        success: true,
        ...result
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('ONVIF Discovery error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'ONVIF discovery failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

const ONVIF_SERVER_URL = 'http://localhost:3002';

async function performDiscovery(supabaseClient: any, networkRange?: string) {
  try {
    // Try to use real ONVIF server first
    const response = await fetch(`${ONVIF_SERVER_URL}/api/onvif/discover`, {
      method: 'POST'
    });

    if (response.ok) {
      const data = await response.json();
      const devices = data.devices || [];

      // Store discovered devices in database
      for (const device of devices) {
        await storeDiscoveredDevice(supabaseClient, device);
      }

      return {
        devices: devices,
        message: `Discovered ${devices.length} ONVIF devices`
      };
    }
  } catch (error) {
    console.warn('ONVIF server not available, falling back to simulation');
  }

  // Fallback to simulation
  return await simulateDiscovery(supabaseClient, networkRange || '192.168.8.0/24');
}

async function configureDevice(supabaseClient: any, deviceId: string, credentials: any) {
  try {
    // Try to use real ONVIF server first
    const response = await fetch(`${ONVIF_SERVER_URL}/api/onvif/devices/${deviceId}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    if (response.ok) {
      const data = await response.json();

      // Update camera in database with ONVIF information
      if (data.device) {
        await updateCameraWithONVIFInfo(supabaseClient, data.device);
      }

      return {
        device: data.device,
        message: 'Device configured successfully'
      };
    }
  } catch (error) {
    console.warn('ONVIF server not available, falling back to simulation');
  }

  // Fallback to simulated configuration when ONVIF server is not available
  return await simulateConfiguration(supabaseClient, deviceId, credentials);
}

async function getDevices() {
  try {
    const response = await fetch(`${ONVIF_SERVER_URL}/api/onvif/devices`);

    if (response.ok) {
      const data = await response.json();
      return { devices: data.devices };
    }
  } catch (error) {
    console.warn('ONVIF server not available');
  }

  return { devices: [] };
}

async function storeDiscoveredDevice(supabaseClient: any, device: any) {
  try {
    const { data: existingCamera } = await supabaseClient
      .from('cameras')
      .select('id')
      .eq('ip_address', device.ip)
      .single();

    const cameraData = {
      name: device.name,
      location: 'Auto-discovered',
      ip_address: device.ip,
      rtsp_url: device.rtsp_url || `rtsp://${device.ip}:554/stream1`,
      status: device.configured ? 'online' : 'discovered',
      is_recording: false,
      last_seen: new Date().toISOString(),
      username: 'admin',
      onvif_device_id: device.id,
      manufacturer: device.manufacturer,
      model: device.model
    };

    if (!existingCamera) {
      await supabaseClient.from('cameras').insert(cameraData);
      console.log(`Stored camera: ${device.name} (${device.ip})`);
    } else {
      await supabaseClient
        .from('cameras')
        .update({
          status: device.configured ? 'online' : 'discovered',
          last_seen: new Date().toISOString(),
          onvif_device_id: device.id,
          manufacturer: device.manufacturer,
          model: device.model
        })
        .eq('ip_address', device.ip);
    }
  } catch (error) {
    console.error('Error storing device:', error);
  }
}

async function updateCameraWithONVIFInfo(supabaseClient: any, device: any) {
  try {
    const streamProfile = device.profiles?.find((p: any) => p.videoEncoder) || device.profiles?.[0];
    const rtspUrl = streamProfile ? `rtsp://${device.ip}:554/stream1` : null;

    await supabaseClient
      .from('cameras')
      .update({
        status: 'online',
        rtsp_url: rtspUrl,
        last_seen: new Date().toISOString(),
        onvif_profiles: JSON.stringify(device.profiles || []),
        onvif_capabilities: JSON.stringify(device.capabilities || {})
      })
      .eq('onvif_device_id', device.id);
  } catch (error) {
    console.error('Error updating camera with ONVIF info:', error);
  }
}

async function simulateDiscovery(supabaseClient: any, networkRange: string) {
  const devices: ONVIFDevice[] = [];
  const baseIP = networkRange.split('/')[0].split('.').slice(0, 3).join('.');

  for (let i = 200; i <= 203; i++) {
    const ip = `${baseIP}.${i}`;
    const isReachable = Math.random() > 0.7;

    if (isReachable) {
      const device = {
        ip,
        port: 80,
        name: `V380 Pro Camera ${i}`,
        manufacturer: 'V380',
        model: 'YK-23',
        rtsp_url: `rtsp://admin:password@${ip}:554/stream1`
      };

      devices.push(device);
      await storeDiscoveredDevice(supabaseClient, { ...device, id: `sim-${ip}`, configured: false });
    }
  }

  await new Promise(resolve => setTimeout(resolve, 1000));

  return {
    devices: devices,
    message: `Simulated discovery: ${devices.length} devices (ONVIF server not available)`
  };
}

async function simulateConfiguration(supabaseClient: any, deviceId: string, credentials: any) {
  console.log(`Simulating configuration for device: ${deviceId}`);
  
  try {
    // Find the camera by extracting IP from deviceId or matching pattern
    const deviceIP = deviceId.includes('sim-') ? deviceId.replace('sim-', '') : deviceId;
    
    // Update the camera in the database to mark it as configured
    const { error } = await supabaseClient
      .from('cameras')
      .update({
        status: 'online',
        username: credentials.username,
        last_seen: new Date().toISOString()
      })
      .eq('ip_address', deviceIP);

    if (error) {
      console.error('Database update error:', error);
      throw error;
    }

    // Create a mock configured device response
    const mockDevice = {
      id: deviceId,
      ip: deviceId.replace('sim-', ''),
      name: `Configured Camera`,
      status: 'online',
      configured: true,
      profiles: [
        {
          token: 'profile_1',
          name: 'Main Stream',
          videoEncoder: {
            encoding: 'H264',
            resolution: { width: 1920, height: 1080 },
            frameRate: 25
          }
        }
      ],
      capabilities: {
        media: true,
        ptz: false,
        imaging: true,
        events: false,
        analytics: false
      }
    };

    return {
      device: mockDevice,
      message: 'Device configured successfully (simulated)'
    };
  } catch (error) {
    console.error('Simulated configuration failed:', error);
    throw new Error('Configuration failed');
  }
}