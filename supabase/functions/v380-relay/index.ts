import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface V380RelayRequest {
  action: 'start' | 'stop' | 'status' | 'streams';
  cameraId?: string;
  relayId?: string;
  inputSource?: string;
  outputFormat?: 'hls' | 'rtsp' | 'webrtc';
}

interface V380StreamUrls {
  hls: string;
  rtsp: string;
  webrtc: string;
}

interface V380RelayStatus {
  isRunning: boolean;
  activeRelays: number;
  relays: Record<string, {
    relayId: string;
    cameraId: string;
    inputSource: string;
    outputFormat: string;
    status: string;
    startTime: number;
    uptime: number;
    error?: string;
  }>;
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

    const body = await req.json();
    const { action, cameraId, relayId, inputSource, outputFormat } = body as V380RelayRequest;
    
    console.log(`V380 relay action: ${action} for camera ${cameraId || 'all'}`);

    switch (action) {
      case 'start':
        return await handleStartRelay(supabaseClient, cameraId!, inputSource!, outputFormat!);
      
      case 'stop':
        return await handleStopRelay(supabaseClient, relayId!);
      
      case 'status':
        return await handleGetRelayStatus(supabaseClient, relayId);
        
      case 'streams':
        return await handleGetStreamUrls(supabaseClient, cameraId!);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('V380 relay error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'V380 relay failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleStartRelay(supabaseClient: any, cameraId: string, inputSource: string, outputFormat: string) {
  console.log(`Starting V380 relay for camera: ${cameraId}`);
  console.log(`Input: ${inputSource} -> Output: ${outputFormat}`);

  try {
    // Generate unique relay ID
    const relayId = `relay_${cameraId}_${Date.now()}`;
    
    // Simulate starting relay process
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate stream URLs based on camera ID and output format
    const streamUrls: V380StreamUrls = generateStreamUrls(cameraId);

    console.log(`✅ V380 relay started: ${relayId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'V380 relay started successfully',
        relayId,
        streamUrls
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to start V380 relay for camera ${cameraId}:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to start V380 relay'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

async function handleStopRelay(supabaseClient: any, relayId: string) {
  console.log(`Stopping V380 relay: ${relayId}`);

  try {
    // Simulate stopping relay process
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`✅ V380 relay stopped: ${relayId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'V380 relay stopped successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to stop V380 relay ${relayId}:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to stop V380 relay'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

async function handleGetRelayStatus(supabaseClient: any, relayId?: string) {
  console.log(`Getting V380 relay status${relayId ? ` for relay: ${relayId}` : ' for all relays'}`);

  try {
    // Simulate relay status
    const relayStatus: V380RelayStatus = {
      isRunning: true,
      activeRelays: 2,
      relays: {
        'relay_camera-1_1234567890': {
          relayId: 'relay_camera-1_1234567890',
          cameraId: 'camera-1',
          inputSource: 'rtsp://camera@192.168.1.101:554/stream1',
          outputFormat: 'hls',
          status: 'running',
          startTime: Date.now() - 300000,
          uptime: 300000
        },
        'relay_camera-2_1234567891': {
          relayId: 'relay_camera-2_1234567891',
          cameraId: 'camera-2',
          inputSource: 'rtsp://camera@192.168.1.102:554/stream1',
          outputFormat: 'webrtc',
          status: 'running',
          startTime: Date.now() - 180000,
          uptime: 180000
        }
      }
    };

    return new Response(
      JSON.stringify({ 
        success: true,
        status: relayStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to get V380 relay status:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to get V380 relay status'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

async function handleGetStreamUrls(supabaseClient: any, cameraId: string) {
  console.log(`Getting stream URLs for camera: ${cameraId}`);

  try {
    const streamUrls: V380StreamUrls = generateStreamUrls(cameraId);

    return new Response(
      JSON.stringify({ 
        success: true,
        streamUrls
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to get stream URLs for camera ${cameraId}:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to get stream URLs'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

function generateStreamUrls(cameraId: string): V380StreamUrls {
  // Generate real stream URLs based on the camera relay configuration
  // These URLs should point to your actual streaming infrastructure
  const streamingDomain = Deno.env.get('STREAMING_DOMAIN') || 'localhost:3001';
  const protocol = streamingDomain.includes('localhost') ? 'http' : 'https';
  const rtspPort = Deno.env.get('RTSP_PORT') || '8554';
  
  return {
    hls: `${protocol}://${streamingDomain}/v380-streams/hls/${cameraId}/index.m3u8`,
    rtsp: `rtsp://${streamingDomain}:${rtspPort}/v380/${cameraId}`,
    webrtc: `${protocol}://${streamingDomain}/v380-streams/webrtc/${cameraId}`
  };
}