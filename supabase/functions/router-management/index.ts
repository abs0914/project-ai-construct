import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RouterStatus {
  ip: string;
  vpn_status: 'connected' | 'disconnected' | 'connecting' | 'error';
  bandwidth_usage: number;
  connected_clients: number;
  uptime: number;
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

    const { action, router_id, router_ip } = await req.json();
    
    console.log(`Router management action: ${action} for ${router_ip || router_id}`);

    switch (action) {
      case 'status_check':
        return await handleStatusCheck(supabaseClient, router_ip);
      
      case 'restart_vpn':
        return await handleVPNRestart(supabaseClient, router_id);
      
      case 'update_config':
        return await handleConfigUpdate(supabaseClient, router_id, req);
      
      case 'monitor_all':
        return await handleMonitorAll(supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Router management error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Router management failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleStatusCheck(supabaseClient: any, routerIP: string) {
  console.log(`Checking status for router: ${routerIP}`);
  
  // Simulate GL.iNET API call
  const status = await checkRouterStatus(routerIP);
  
  // Update database with current status
  const { error } = await supabaseClient
    .from('vpn_routers')
    .update({
      vpn_status: status.vpn_status,
      bandwidth_usage: status.bandwidth_usage,
      last_seen: new Date().toISOString()
    })
    .eq('ip_address', routerIP);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, status }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleVPNRestart(supabaseClient: any, routerId: string) {
  console.log(`Restarting VPN for router: ${routerId}`);
  
  // Update status to connecting
  await supabaseClient
    .from('vpn_routers')
    .update({ vpn_status: 'connecting' })
    .eq('id', routerId);

  // Simulate VPN restart process
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Update to connected status
  await supabaseClient
    .from('vpn_routers')
    .update({ 
      vpn_status: 'connected',
      last_seen: new Date().toISOString()
    })
    .eq('id', routerId);

  return new Response(
    JSON.stringify({ success: true, message: 'VPN restarted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleConfigUpdate(supabaseClient: any, routerId: string, req: Request) {
  const { config } = await req.json();
  
  console.log(`Updating config for router: ${routerId}`, config);
  
  // In reality, this would push config to the GL.iNET router
  // For now, we'll just update our database
  const { error } = await supabaseClient
    .from('vpn_routers')
    .update({
      api_key: config.api_key,
      last_seen: new Date().toISOString()
    })
    .eq('id', routerId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, message: 'Configuration updated' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleMonitorAll(supabaseClient: any) {
  console.log('Monitoring all routers');
  
  // Get all routers
  const { data: routers, error } = await supabaseClient
    .from('vpn_routers')
    .select('*');

  if (error) throw error;

  const statusUpdates = [];
  
  for (const router of routers) {
    const status = await checkRouterStatus(router.ip_address);
    statusUpdates.push({
      id: router.id,
      status
    });
    
    // Update in database
    await supabaseClient
      .from('vpn_routers')
      .update({
        vpn_status: status.vpn_status,
        bandwidth_usage: status.bandwidth_usage,
        last_seen: new Date().toISOString()
      })
      .eq('id', router.id);
  }

  return new Response(
    JSON.stringify({ success: true, router_statuses: statusUpdates }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkRouterStatus(routerIP: string): Promise<RouterStatus> {
  // Simulate GL.iNET API call - in reality this would make HTTP requests to the router
  // GL.iNET routers typically expose REST APIs for status monitoring
  
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  
  // Simulate random status for demo
  const isConnected = Math.random() > 0.2; // 80% chance of being connected
  
  return {
    ip: routerIP,
    vpn_status: isConnected ? 'connected' : 'disconnected',
    bandwidth_usage: Math.floor(Math.random() * 1000000000), // Random bytes
    connected_clients: Math.floor(Math.random() * 5) + 1,
    uptime: Math.floor(Math.random() * 86400) // Random uptime in seconds
  };
}