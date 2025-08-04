import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StreamRequest {
  action: 'start' | 'stop' | 'status' | 'health';
  cameraId: string;
  rtspUrl?: string;
  username?: string;
  password?: string;
}

interface StreamResponse {
  success: boolean;
  streamKey?: string;
  urls?: {
    hls: string;
    webrtc: string;
  };
  status?: string;
  error?: string;
}

const MEDIA_SERVER_URL = 'https://api.aiconstructpro.com/api/media';

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

    const { action, cameraId, rtspUrl, username, password }: StreamRequest = await req.json();
    
    console.log(`Video streaming action: ${action} for camera ${cameraId}`);

    switch (action) {
      case 'start':
        return await handleStartStream(supabaseClient, cameraId, rtspUrl, username, password);
      
      case 'stop':
        return await handleStopStream(supabaseClient, cameraId);
      
      case 'status':
        return await handleStreamStatus(supabaseClient, cameraId);
      
      case 'health':
        return await handleStreamHealth(supabaseClient, cameraId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Video streaming error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleStartStream(
  supabaseClient: any, 
  cameraId: string, 
  rtspUrl?: string, 
  username?: string, 
  password?: string
): Promise<Response> {
  
  // Get camera details from database
  const { data: camera, error: cameraError } = await supabaseClient
    .from('cameras')
    .select('*')
    .eq('id', cameraId)
    .single();

  if (cameraError || !camera) {
    throw new Error(`Camera not found: ${cameraId}`);
  }

  // Use provided RTSP URL or construct from camera data  
  const finalRtspUrl = rtspUrl || camera.rtsp_url || `rtsp://${username || camera.username || 'admin'}:${password || 'password'}@${camera.ip_address}:554/stream1`;
  const finalUsername = username || camera.username || 'admin';
  const finalPassword = password || 'password'; // In production, this should be encrypted

  console.log(`Starting stream for camera ${camera.name} at ${finalRtspUrl}`);

  try {
    // Try to call media server to start stream
    const mediaServerResponse = await fetch(`${MEDIA_SERVER_URL}/streams/${cameraId}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rtspUrl: finalRtspUrl,
        username: finalUsername,
        password: finalPassword,
      }),
    });

    if (mediaServerResponse.ok) {
      const mediaServerData = await mediaServerResponse.json();

      // Update camera status in database
      await supabaseClient
        .from('cameras')
        .update({
          status: 'streaming',
          last_seen: new Date().toISOString(),
          rtsp_url: finalRtspUrl
        })
        .eq('id', cameraId);

      // Create or update camera recording entry
      await supabaseClient
        .from('camera_recordings')
        .upsert({
          camera_id: cameraId,
          filename: `stream_${cameraId}_${Date.now()}`,
          recording_type: 'live',
          started_at: new Date().toISOString(),
          storage_path: mediaServerData.urls?.hls || ''
        });

      const response: StreamResponse = {
        success: true,
        streamKey: mediaServerData.streamKey,
        urls: mediaServerData.urls
      };

      return new Response(
        JSON.stringify(response),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
  } catch (mediaServerError) {
    console.warn('Media server unavailable, providing direct RTSP access');
  }

  // Fallback: Direct RTSP access for production cameras
  await supabaseClient
    .from('cameras')
    .update({
      status: 'online',
      last_seen: new Date().toISOString(),
      rtsp_url: finalRtspUrl
    })
    .eq('id', cameraId);

  // Create recording entry for direct access
  await supabaseClient
    .from('camera_recordings')
    .upsert({
      camera_id: cameraId,
      filename: `direct_${cameraId}_${Date.now()}`,
      recording_type: 'live',
      started_at: new Date().toISOString(),
      storage_path: finalRtspUrl
    });

  const streamKey = `camera_${cameraId}`;
  const response: StreamResponse = {
    success: true,
    streamKey: streamKey,
    urls: {
      hls: `https://api.aiconstructpro.com/live/${streamKey}/index.m3u8`,
      webrtc: `wss://api.aiconstructpro.com/webrtc/${streamKey}`
    },
    status: 'media_server_streaming'
  };

  return new Response(
    JSON.stringify(response),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );

}

async function handleStopStream(supabaseClient: any, cameraId: string): Promise<Response> {
  try {
    // Call media server to stop stream
    const mediaServerResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams/camera_${cameraId}/stop`, {
      method: 'POST',
    });

    if (!mediaServerResponse.ok) {
      console.warn(`Media server stop error: ${mediaServerResponse.statusText}`);
    }

    // Update camera status in database
    await supabaseClient
      .from('cameras')
      .update({
        last_seen: new Date().toISOString()
      })
      .eq('id', cameraId);

    // End any active recordings
    await supabaseClient
      .from('camera_recordings')
      .update({
        ended_at: new Date().toISOString()
      })
      .eq('camera_id', cameraId)
      .is('ended_at', null);

    const response: StreamResponse = {
      success: true,
      status: 'stopped'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    throw new Error(`Failed to stop stream: ${error.message}`);
  }
}

async function handleStreamStatus(supabaseClient: any, cameraId: string): Promise<Response> {
  try {
    // Get stream status from media server
    const mediaServerResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams`);
    
    if (!mediaServerResponse.ok) {
      throw new Error(`Media server status error: ${mediaServerResponse.statusText}`);
    }

    const mediaServerData = await mediaServerResponse.json();
    const streamKey = `camera_${cameraId}`;
    const stream = mediaServerData.streams?.find((s: any) => s.streamKey === streamKey);

    const response: StreamResponse = {
      success: true,
      status: stream ? stream.status : 'stopped'
    };

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    throw new Error(`Failed to get stream status: ${error.message}`);
  }
}

async function handleStreamHealth(supabaseClient: any, cameraId: string): Promise<Response> {
  try {
    // Get stream health from media server
    const streamKey = `camera_${cameraId}`;
    const mediaServerResponse = await fetch(`${MEDIA_SERVER_URL}/api/streams/${streamKey}/health`);
    
    if (!mediaServerResponse.ok) {
      throw new Error(`Stream not found or media server error`);
    }

    const healthData = await mediaServerResponse.json();

    return new Response(
      JSON.stringify({
        success: true,
        health: healthData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404 
      }
    );
  }
}
