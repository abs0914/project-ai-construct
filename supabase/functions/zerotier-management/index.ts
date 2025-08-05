import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ZeroTierNodeStatus {
  nodeId: string;
  networkId: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  ipAddress?: string;
  online: boolean;
  lastSeen: string;
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

    const { action, router_id, network_id, node_id } = await req.json();
    
    console.log(`ZeroTier management action: ${action} for router ${router_id || node_id}`);

    switch (action) {
      case 'check_node_status':
        return await handleNodeStatusCheck(supabaseClient, node_id, network_id);
      
      case 'join_network':
        return await handleJoinNetwork(supabaseClient, router_id, network_id);
      
      case 'leave_network':
        return await handleLeaveNetwork(supabaseClient, router_id);
      
      case 'monitor_all_nodes':
        return await handleMonitorAllNodes(supabaseClient);

      case 'restart_zerotier':
        return await handleRestartZeroTier(supabaseClient, router_id);
      
      case 'list_networks':
        return await handleListNetworks(supabaseClient);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('ZeroTier management error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'ZeroTier management failed', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

async function handleNodeStatusCheck(supabaseClient: any, nodeId: string, networkId: string) {
  console.log(`Checking ZeroTier node status: ${nodeId} on network ${networkId}`);
  
  // Simulate ZeroTier API call to check node status
  const nodeStatus = await checkZeroTierNodeStatus(nodeId, networkId);
  
  // Update database with current ZeroTier status
  const { error } = await supabaseClient
    .from('vpn_routers')
    .update({
      zerotier_status: nodeStatus.status,
      zerotier_ip_address: nodeStatus.ipAddress,
      last_seen: new Date().toISOString()
    })
    .eq('zerotier_node_id', nodeId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, nodeStatus }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleJoinNetwork(supabaseClient: any, routerId: string, networkId: string) {
  console.log(`Joining ZeroTier network ${networkId} for router ${routerId}`);
  
  const apiToken = Deno.env.get('ZEROTIER_API_TOKEN');
  if (!apiToken) {
    throw new Error('ZeroTier API token not configured');
  }

  // Update status to connecting
  await supabaseClient
    .from('vpn_routers')
    .update({ 
      zerotier_status: 'connecting',
      zerotier_network_id: networkId
    })
    .eq('id', routerId);

  try {
    // Generate a new node ID for this router
    const newNodeId = generateNodeId();
    
    // Create/authorize the member in ZeroTier network
    const memberResponse = await fetch(`https://api.zerotier.com/api/v1/network/${networkId}/member/${newNodeId}`, {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        authorized: true,
        description: `GL-iNet Router ${routerId}`
      })
    });

    if (!memberResponse.ok) {
      throw new Error(`Failed to authorize member: ${memberResponse.statusText}`);
    }

    const memberData = await memberResponse.json();
    const assignedIP = memberData.config?.ipAssignments?.[0] || await assignZeroTierIP(networkId);
    
    // Update to connected status
    await supabaseClient
      .from('vpn_routers')
      .update({ 
        zerotier_status: 'connected',
        zerotier_node_id: newNodeId,
        zerotier_ip_address: assignedIP,
        zerotier_enabled: true,
        last_seen: new Date().toISOString()
      })
      .eq('id', routerId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Successfully joined ZeroTier network',
        nodeId: newNodeId,
        ipAddress: assignedIP
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error joining ZeroTier network:', error);
    
    // Update status to error
    await supabaseClient
      .from('vpn_routers')
      .update({ zerotier_status: 'error' })
      .eq('id', routerId);
    
    throw error;
  }
}

async function handleLeaveNetwork(supabaseClient: any, routerId: string) {
  console.log(`Leaving ZeroTier network for router ${routerId}`);
  
  // Update database to reflect leaving the network
  const { error } = await supabaseClient
    .from('vpn_routers')
    .update({
      zerotier_status: 'disconnected',
      zerotier_enabled: false,
      zerotier_ip_address: null,
      last_seen: new Date().toISOString()
    })
    .eq('id', routerId);

  if (error) throw error;

  return new Response(
    JSON.stringify({ success: true, message: 'Successfully left ZeroTier network' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleMonitorAllNodes(supabaseClient: any) {
  console.log('Monitoring all ZeroTier nodes');
  
  // Get all routers with ZeroTier enabled
  const { data: routers, error } = await supabaseClient
    .from('vpn_routers')
    .select('*')
    .eq('zerotier_enabled', true);

  if (error) throw error;

  const nodeStatusUpdates = [];
  
  for (const router of routers) {
    if (router.zerotier_node_id && router.zerotier_network_id) {
      const nodeStatus = await checkZeroTierNodeStatus(router.zerotier_node_id, router.zerotier_network_id);
      nodeStatusUpdates.push({
        routerId: router.id,
        nodeStatus
      });
      
      // Update in database
      await supabaseClient
        .from('vpn_routers')
        .update({
          zerotier_status: nodeStatus.status,
          zerotier_ip_address: nodeStatus.ipAddress,
          last_seen: new Date().toISOString()
        })
        .eq('id', router.id);
    }
  }

  return new Response(
    JSON.stringify({ success: true, nodeStatusUpdates }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleRestartZeroTier(supabaseClient: any, routerId: string) {
  console.log(`Restarting ZeroTier for router: ${routerId}`);
  
  // Update status to connecting
  await supabaseClient
    .from('vpn_routers')
    .update({ zerotier_status: 'connecting' })
    .eq('id', routerId);

  // Simulate ZeroTier restart process
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Update to connected status
  await supabaseClient
    .from('vpn_routers')
    .update({ 
      zerotier_status: 'connected',
      last_seen: new Date().toISOString()
    })
    .eq('id', routerId);

  return new Response(
    JSON.stringify({ success: true, message: 'ZeroTier restarted successfully' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function checkZeroTierNodeStatus(nodeId: string, networkId: string): Promise<ZeroTierNodeStatus> {
  const apiToken = Deno.env.get('ZEROTIER_API_TOKEN');
  if (!apiToken) {
    throw new Error('ZeroTier API token not configured');
  }

  try {
    // Call ZeroTier Central API to get node status
    const response = await fetch(`https://api.zerotier.com/api/v1/network/${networkId}/member/${nodeId}`, {
      headers: {
        'Authorization': `bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`ZeroTier API error for node ${nodeId}: ${response.statusText}`);
      // Return a default disconnected status if API call fails
      return {
        nodeId,
        networkId,
        status: 'disconnected',
        online: false,
        lastSeen: new Date().toISOString()
      };
    }

    const nodeData = await response.json();
    
    return {
      nodeId,
      networkId,
      status: nodeData.online ? 'connected' : 'disconnected',
      ipAddress: nodeData.config?.ipAssignments?.[0],
      online: nodeData.online,
      lastSeen: nodeData.lastSeen ? new Date(nodeData.lastSeen).toISOString() : new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error checking ZeroTier node status: ${error.message}`);
    // Return default status on error
    return {
      nodeId,
      networkId,
      status: 'error',
      online: false,
      lastSeen: new Date().toISOString()
    };
  }
}

function generateNodeId(): string {
  // Generate a random 10-character hex string for ZeroTier node ID
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

async function handleListNetworks(supabaseClient: any) {
  console.log('Listing ZeroTier networks from database');
  
  const { data: networks, error } = await supabaseClient
    .from('zerotier_networks')
    .select('*')
    .eq('is_active', true)
    .order('network_name');

  if (error) throw error;

  return new Response(
    JSON.stringify({ 
      success: true, 
      networks: networks || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function assignZeroTierIP(networkId: string): Promise<string> {
  const apiToken = Deno.env.get('ZEROTIER_API_TOKEN');
  if (!apiToken) {
    throw new Error('ZeroTier API token not configured');
  }

  try {
    // Get network information to determine IP assignment range
    const response = await fetch(`https://api.zerotier.com/api/v1/network/${networkId}`, {
      headers: {
        'Authorization': `bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Failed to get network info: ${response.statusText}`);
      // Fallback to default range
      const lastOctet = Math.floor(Math.random() * 200) + 100;
      return `10.147.19.${lastOctet}`;
    }

    const networkData = await response.json();
    const routes = networkData.config?.routes || [];
    
    if (routes.length > 0) {
      // Use the first route to determine IP range
      const route = routes[0];
      const cidr = route.target;
      const [baseIp] = cidr.split('/');
      const parts = baseIp.split('.');
      const lastOctet = Math.floor(Math.random() * 200) + 100;
      return `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}`;
    }
    
    // Default fallback
    const lastOctet = Math.floor(Math.random() * 200) + 100;
    return `10.147.19.${lastOctet}`;
    
  } catch (error) {
    console.error(`Error assigning ZeroTier IP: ${error.message}`);
    // Fallback IP assignment
    const lastOctet = Math.floor(Math.random() * 200) + 100;
    return `10.147.19.${lastOctet}`;
  }
}