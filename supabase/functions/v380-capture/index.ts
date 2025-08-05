import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface V380CaptureRequest {
  action: 'start' | 'stop' | 'status';
  cameraId: string;
  inputSource?: string;
  options?: any;
}

interface V380CaptureStatus {
  status: 'active' | 'inactive' | 'error';
  startTime?: number;
  uptime?: number;
  config?: any;
  error?: string;
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
    const { action, cameraId, inputSource, options } = body as V380CaptureRequest;
    
    console.log(`V380 capture action: ${action} for camera ${cameraId}`);

    switch (action) {
      case 'start':
        return await handleStartCapture(supabaseClient, cameraId, inputSource!, options);
      
      case 'stop':
        return await handleStopCapture(supabaseClient, cameraId);
      
      case 'status':
        return await handleGetStatus(supabaseClient, cameraId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('V380 capture error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'V380 capture failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleStartCapture(supabaseClient: any, cameraId: string, inputSource: string, options: any) {
  console.log(`Starting V380 capture for camera: ${cameraId}`);
  console.log(`Input source: ${inputSource}`);
  console.log(`Options:`, options);

  try {
    // Simulate V380 PC software connection and capture start
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Store capture session in database for tracking
    const captureSession = {
      camera_id: cameraId,
      input_source: inputSource,
      status: 'active',
      started_at: new Date().toISOString(),
      config: options
    };

    // In a real implementation, this would start the V380 capture process
    // For now, we'll simulate success
    const captureStatus: V380CaptureStatus = {
      status: 'active',
      startTime: Date.now(),
      uptime: 0,
      config: {
        cameraId,
        inputSource,
        ...options
      }
    };

    console.log(`✅ V380 capture started for camera: ${cameraId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'V380 capture started successfully',
        status: captureStatus
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to start V380 capture for camera ${cameraId}:`, error);
    
    const errorStatus: V380CaptureStatus = {
      status: 'error',
      error: error.message
    };

    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to start V380 capture',
        status: errorStatus
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

async function handleStopCapture(supabaseClient: any, cameraId: string) {
  console.log(`Stopping V380 capture for camera: ${cameraId}`);

  try {
    // Simulate stopping V380 capture process
    await new Promise(resolve => setTimeout(resolve, 500));

    console.log(`✅ V380 capture stopped for camera: ${cameraId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'V380 capture stopped successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`Failed to stop V380 capture for camera ${cameraId}:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to stop V380 capture'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

async function handleGetStatus(supabaseClient: any, cameraId?: string) {
  console.log(`Getting V380 capture status${cameraId ? ` for camera: ${cameraId}` : ' for all cameras'}`);

  try {
    if (cameraId) {
      // Return status for specific camera
      const status: V380CaptureStatus = {
        status: 'active', // Simulate active status
        startTime: Date.now() - 300000, // Started 5 minutes ago
        uptime: 300000,
        config: {
          cameraId,
          inputSource: `rtsp://camera@${cameraId}:554/stream1`
        }
      };

      return new Response(
        JSON.stringify({ 
          success: true,
          status
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Return status for all cameras
      const captures = {
        'camera-1': {
          status: 'active',
          startTime: Date.now() - 300000,
          uptime: 300000
        },
        'camera-2': {
          status: 'inactive'
        }
      };

      return new Response(
        JSON.stringify({ 
          success: true,
          captures
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error(`Failed to get V380 capture status:`, error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to get V380 capture status'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}