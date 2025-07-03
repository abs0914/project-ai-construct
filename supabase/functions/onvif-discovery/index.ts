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

    const { network_range } = await req.json();
    
    console.log(`Starting ONVIF discovery for network range: ${network_range}`);

    // In a real implementation, this would use ONVIF WS-Discovery protocol
    // For now, we'll simulate device discovery
    const discoveredDevices: ONVIFDevice[] = await simulateONVIFDiscovery(network_range);

    // Update camera status in database
    for (const device of discoveredDevices) {
      const { data: existingCamera } = await supabaseClient
        .from('cameras')
        .select('id')
        .eq('ip_address', device.ip)
        .single();

      if (existingCamera) {
        // Update existing camera status
        await supabaseClient
          .from('cameras')
          .update({ 
            status: 'online',
            last_seen: new Date().toISOString(),
            rtsp_url: device.rtsp_url 
          })
          .eq('ip_address', device.ip);
        
        console.log(`Updated camera status: ${device.ip}`);
      } else {
        // Auto-register new discovered camera
        const newCamera = {
          name: device.name || `Camera ${device.ip}`,
          location: 'Auto-discovered',
          ip_address: device.ip,
          onvif_port: device.port,
          rtsp_url: device.rtsp_url,
          username: 'admin', // Default username
          status: 'online',
          last_seen: new Date().toISOString()
        };

        await supabaseClient
          .from('cameras')
          .insert(newCamera);
        
        console.log(`Auto-registered new camera: ${device.ip}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        discovered_devices: discoveredDevices.length,
        devices: discoveredDevices 
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

async function simulateONVIFDiscovery(networkRange: string): Promise<ONVIFDevice[]> {
  // Simulate network scan - in reality this would use WS-Discovery multicast
  const devices: ONVIFDevice[] = [];
  
  // Simulate finding V380 Pro YK-23 cameras
  const baseIP = networkRange.split('/')[0].split('.').slice(0, 3).join('.');
  
  for (let i = 200; i <= 210; i++) {
    const ip = `${baseIP}.${i}`;
    
    // Simulate ping/probe (in reality would be proper ONVIF probe)
    const isReachable = Math.random() > 0.7; // 30% chance device is found
    
    if (isReachable) {
      devices.push({
        ip,
        port: 80,
        name: `V380 Pro Camera ${i}`,
        manufacturer: 'V380',
        model: 'YK-23',
        rtsp_url: `rtsp://admin:password@${ip}:554/stream1`
      });
    }
  }
  
  // Add artificial delay to simulate network scanning
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return devices;
}