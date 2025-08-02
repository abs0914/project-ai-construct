import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CameraDiscoveryResult {
  ip_address: string;
  name: string;
  location: string;
  rtsp_url: string;
  onvif_port: number;
  router_id?: string;
  status: 'online' | 'offline';
  network_segment: string;
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

    const { action, network_segments, router_id } = await req.json();
    
    console.log(`Network discovery action: ${action}`);

    switch (action) {
      case 'discover_cameras_multi_site':
        return await handleMultiSiteDiscovery(supabaseClient, network_segments);
      
      case 'discover_cameras_by_router':
        return await handleRouterBasedDiscovery(supabaseClient, router_id);
      
      case 'scan_zerotier_network':
        return await handleZeroTierNetworkScan(supabaseClient);
      
      case 'test_camera_connectivity':
        return await handleCameraConnectivityTest(supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Network discovery error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Network discovery failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleMultiSiteDiscovery(supabaseClient: any, networkSegments: string[]) {
  console.log('Discovering cameras across multiple network segments:', networkSegments);
  
  // Get all active routers with ZeroTier connections
  const { data: routers, error: routersError } = await supabaseClient
    .from('vpn_routers')
    .select('*')
    .eq('zerotier_status', 'connected');

  if (routersError) throw routersError;

  const discoveredCameras: CameraDiscoveryResult[] = [];
  
  // Simulate camera discovery across different network segments
  for (const router of routers) {
    const routerSegment = getNetworkSegmentFromIP(router.ip_address);
    const cameras = await discoverCamerasInSegment(routerSegment, router.id);
    discoveredCameras.push(...cameras);
  }

  // Also scan ZeroTier virtual network
  const zeroTierCameras = await discoverZeroTierCameras();
  discoveredCameras.push(...zeroTierCameras);

  return new Response(
    JSON.stringify({ 
      success: true, 
      cameras: discoveredCameras,
      total_found: discoveredCameras.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRouterBasedDiscovery(supabaseClient: any, routerId: string) {
  console.log(`Discovering cameras for router: ${routerId}`);
  
  const { data: router, error } = await supabaseClient
    .from('vpn_routers')
    .select('*')
    .eq('id', routerId)
    .single();

  if (error) throw error;

  const networkSegment = getNetworkSegmentFromIP(router.ip_address);
  const cameras = await discoverCamerasInSegment(networkSegment, routerId);

  return new Response(
    JSON.stringify({ 
      success: true, 
      router: router.name,
      network_segment: networkSegment,
      cameras,
      total_found: cameras.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleZeroTierNetworkScan(supabaseClient: any) {
  console.log('Scanning ZeroTier network for cameras');
  
  const apiToken = Deno.env.get('ZEROTIER_API_TOKEN');
  if (!apiToken) {
    throw new Error('ZeroTier API token not configured');
  }

  // Get all ZeroTier networks from database
  const { data: networks, error } = await supabaseClient
    .from('zerotier_networks')
    .select('*')
    .eq('is_active', true);

  if (error) throw error;

  const allDiscoveredCameras: CameraDiscoveryResult[] = [];

  for (const network of networks) {
    try {
      // Get network members from ZeroTier API
      const response = await fetch(`https://api.zerotier.com/api/v1/network/${network.network_id}/member`, {
        headers: {
          'Authorization': `bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const members = await response.json();
        
        for (const member of members) {
          if (member.online && member.config?.ipAssignments?.length > 0) {
            // Test if this IP might be a camera
            const cameras = await testIPForCamera(member.config.ipAssignments[0], network.network_id);
            allDiscoveredCameras.push(...cameras);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning ZeroTier network ${network.network_id}:`, error);
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      zerotier_cameras: allDiscoveredCameras,
      total_found: allDiscoveredCameras.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleCameraConnectivityTest(supabaseClient: any) {
  console.log('Testing camera connectivity across VPN');
  
  const { data: cameras, error } = await supabaseClient
    .from('cameras')
    .select('*');

  if (error) throw error;

  const connectivityResults = [];

  for (const camera of cameras) {
    const isReachable = await testCameraConnectivity(camera.ip_address, camera.rtsp_url);
    connectivityResults.push({
      camera_id: camera.id,
      name: camera.name,
      ip_address: camera.ip_address,
      reachable: isReachable,
      test_time: new Date().toISOString()
    });

    // Update camera status based on connectivity test
    await supabaseClient
      .from('cameras')
      .update({ 
        status: isReachable ? 'online' : 'offline',
        last_seen: isReachable ? new Date().toISOString() : camera.last_seen
      })
      .eq('id', camera.id);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      connectivity_results: connectivityResults
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function getNetworkSegmentFromIP(ipAddress: string): string {
  const parts = ipAddress.split('.');
  return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
}

async function discoverCamerasInSegment(networkSegment: string, routerId: string): Promise<CameraDiscoveryResult[]> {
  // Simulate camera discovery in network segment
  const cameras: CameraDiscoveryResult[] = [];
  const baseIP = networkSegment.split('/')[0].split('.').slice(0, 3).join('.');
  
  // Simulate finding cameras in common IP ranges for security cameras
  const commonCameraIPs = [101, 102, 103, 104, 201, 202, 203, 204];
  
  for (const lastOctet of commonCameraIPs) {
    const cameraIP = `${baseIP}.${lastOctet}`;
    
    // Simulate camera detection (in reality, this would be ONVIF discovery)
    if (Math.random() > 0.7) { // 30% chance of finding a camera
      cameras.push({
        ip_address: cameraIP,
        name: `Camera ${lastOctet}`,
        location: `Zone ${Math.floor(lastOctet / 100)}`,
        rtsp_url: `rtsp://${cameraIP}:554/stream1`,
        onvif_port: 80,
        router_id: routerId,
        status: 'online',
        network_segment: networkSegment
      });
    }
  }
  
  return cameras;
}

async function discoverZeroTierCameras(): Promise<CameraDiscoveryResult[]> {
  // Simulate discovering cameras on ZeroTier virtual network
  const cameras: CameraDiscoveryResult[] = [];
  const zeroTierBase = '10.147.19';
  
  // Simulate finding cameras in ZeroTier network range
  for (let i = 101; i <= 110; i++) {
    if (Math.random() > 0.8) { // 20% chance of finding a camera
      const cameraIP = `${zeroTierBase}.${i}`;
      cameras.push({
        ip_address: cameraIP,
        name: `ZeroTier Camera ${i}`,
        location: `Remote Site ${i - 100}`,
        rtsp_url: `rtsp://${cameraIP}:554/stream1`,
        onvif_port: 80,
        status: 'online',
        network_segment: 'ZeroTier Virtual Network'
      });
    }
  }
  
  return cameras;
}

async function testIPForCamera(ipAddress: string, networkId: string): Promise<CameraDiscoveryResult[]> {
  // Simulate testing if an IP address is a camera
  const cameras: CameraDiscoveryResult[] = [];
  
  // Simple heuristic: if IP ends with certain numbers, it might be a camera
  const lastOctet = parseInt(ipAddress.split('.').pop() || '0');
  if (lastOctet >= 100 && lastOctet <= 120) {
    cameras.push({
      ip_address: ipAddress,
      name: `ZT Camera ${lastOctet}`,
      location: `ZeroTier Network ${networkId.substring(0, 8)}`,
      rtsp_url: `rtsp://${ipAddress}:554/stream1`,
      onvif_port: 80,
      status: 'online',
      network_segment: `ZeroTier ${networkId}`
    });
  }
  
  return cameras;
}

async function testCameraConnectivity(ipAddress: string, rtspUrl?: string): Promise<boolean> {
  // Simulate connectivity test
  // In reality, this would try to connect to ONVIF port or RTSP stream
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  // Simulate 85% success rate for connectivity tests
  return Math.random() > 0.15;
}