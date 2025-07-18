import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Globe, 
  Users, 
  Shield, 
  Plus, 
  Copy, 
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Settings,
  Trash2,
  Activity,
  Eye,
  Network
} from 'lucide-react';

interface ZeroTierNetwork {
  id: string;
  name: string;
  description: string;
  private: boolean;
  memberCount: number;
  authorizedMemberCount: number;
  activeMemberCount: number;
  creationTime: number;
  lastModified: number;
}

interface ZeroTierMember {
  id: string;
  name: string;
  description: string;
  authorized: boolean;
  ipAssignments: string[];
  online: boolean;
  version: string;
  physicalAddress: string;
  lastAuthorizedTime?: number;
}

interface ZeroTierStatus {
  user: any;
  loginMethods: string[];
  subscriptions: any[];
}

const NETWORK_SERVER_URL = 'http://localhost:3003';

export const ZeroTierNetworkManagement: React.FC = () => {
  const [networks, setNetworks] = useState<ZeroTierNetwork[]>([]);
  const [selectedNetwork, setSelectedNetwork] = useState<ZeroTierNetwork | null>(null);
  const [members, setMembers] = useState<ZeroTierMember[]>([]);
  const [status, setStatus] = useState<ZeroTierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  
  // Form state for creating network
  const [networkForm, setNetworkForm] = useState({
    name: '',
    description: '',
    private: true
  });

  useEffect(() => {
    loadZeroTierData();
    
    // Set up periodic refresh
    const interval = setInterval(loadZeroTierData, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const loadZeroTierData = async () => {
    try {
      setError(null);
      
      // Load ZeroTier status
      const statusResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/status`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setStatus(statusData.status);
      }
      
      // Load networks
      const networksResponse = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks`);
      if (networksResponse.ok) {
        const networksData = await networksResponse.json();
        setNetworks(networksData.networks);
      } else if (networksResponse.status === 400) {
        setError('ZeroTier API token not configured. Please set ZEROTIER_API_TOKEN environment variable.');
      } else {
        throw new Error('Failed to load ZeroTier networks');
      }
    } catch (error) {
      setError('Failed to connect to ZeroTier Central. Please check your API configuration.');
      console.error('Failed to load ZeroTier data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNetwork = async () => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(networkForm)
      });

      if (response.ok) {
        setCreateDialogOpen(false);
        setNetworkForm({ name: '', description: '', private: true });
        await loadZeroTierData();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create network');
      }
    } catch (error) {
      setError('Failed to create network');
    }
  };

  const deleteNetwork = async (networkId: string) => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks/${networkId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadZeroTierData();
      } else {
        setError('Failed to delete network');
      }
    } catch (error) {
      setError('Failed to delete network');
    }
  };

  const loadNetworkMembers = async (network: ZeroTierNetwork) => {
    try {
      setSelectedNetwork(network);
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks/${network.id}/members`);
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
        setMembersDialogOpen(true);
      } else {
        setError('Failed to load network members');
      }
    } catch (error) {
      setError('Failed to load network members');
    }
  };

  const authorizeMember = async (networkId: string, memberId: string) => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks/${networkId}/members/${memberId}/authorize`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadNetworkMembers(selectedNetwork!);
      } else {
        setError('Failed to authorize member');
      }
    } catch (error) {
      setError('Failed to authorize member');
    }
  };

  const deauthorizeMember = async (networkId: string, memberId: string) => {
    try {
      const response = await fetch(`${NETWORK_SERVER_URL}/api/network/zerotier/networks/${networkId}/members/${memberId}/deauthorize`, {
        method: 'POST'
      });

      if (response.ok) {
        await loadNetworkMembers(selectedNetwork!);
      } else {
        setError('Failed to deauthorize member');
      }
    } catch (error) {
      setError('Failed to deauthorize member');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openZeroTierCentral = (networkId: string) => {
    window.open(`https://my.zerotier.com/network/${networkId}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">ZeroTier Network Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage ZeroTier networks and members for secure connectivity
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2" disabled={!status}>
              <Plus className="h-4 w-4" />
              <span>Create Network</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create ZeroTier Network</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Network Name</Label>
                <Input
                  id="name"
                  value={networkForm.name}
                  onChange={(e) => setNetworkForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="SiteGuard Network"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={networkForm.description}
                  onChange={(e) => setNetworkForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Network for construction site monitoring"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="private"
                  checked={networkForm.private}
                  onChange={(e) => setNetworkForm(prev => ({ ...prev, private: e.target.checked }))}
                />
                <Label htmlFor="private">Private Network (requires authorization)</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createNetwork}>
                  Create Network
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ZeroTier Status */}
      {status && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>ZeroTier Central Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>User</Label>
                <p className="text-sm">{status.user?.email || 'Connected'}</p>
              </div>
              <div>
                <Label>Login Methods</Label>
                <p className="text-sm">{status.loginMethods?.join(', ') || 'API'}</p>
              </div>
              <div>
                <Label>Subscriptions</Label>
                <p className="text-sm">{status.subscriptions?.length || 0} active</p>
              </div>
              <div>
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Connected</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Networks Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-32">
          <Activity className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {networks.map((network) => (
            <Card key={network.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Network className="h-5 w-5" />
                    <CardTitle className="text-sm">{network.name}</CardTitle>
                  </div>
                  <Badge variant={network.private ? "default" : "secondary"}>
                    {network.private ? 'Private' : 'Public'}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {network.description}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Network ID */}
                <div className="space-y-1">
                  <Label className="text-xs">Network ID</Label>
                  <div className="flex items-center space-x-2">
                    <code className="text-xs bg-muted p-1 rounded flex-1">{network.id}</code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(network.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {/* Member Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-lg font-bold">{network.memberCount}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-green-600">{network.authorizedMemberCount}</div>
                    <div className="text-xs text-muted-foreground">Authorized</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{network.activeMemberCount}</div>
                    <div className="text-xs text-muted-foreground">Active</div>
                  </div>
                </div>

                {/* Creation Date */}
                <div className="text-xs text-muted-foreground">
                  Created: {new Date(network.creationTime).toLocaleDateString()}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center space-x-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => loadNetworkMembers(network)}
                      className="text-xs"
                    >
                      <Users className="h-3 w-3 mr-1" />
                      Members
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => openZeroTierCentral(network.id)}
                      className="text-xs"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => deleteNetwork(network.id)}
                    className="text-xs"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && networks.length === 0 && !error && (
        <Card className="text-center py-12">
          <CardContent>
            <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No ZeroTier Networks</h3>
            <p className="text-muted-foreground mb-4">
              Create ZeroTier networks to securely connect your devices
            </p>
            <Button onClick={() => setCreateDialogOpen(true)} disabled={!status}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Network
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Network Members: {selectedNetwork?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No members in this network</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${member.online ? 'bg-green-500' : 'bg-gray-500'}`} />
                        <span className="font-medium">{member.name || 'Unnamed Device'}</span>
                        <Badge variant={member.authorized ? "default" : "secondary"}>
                          {member.authorized ? 'Authorized' : 'Pending'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        ID: {member.id} | IPs: {member.ipAssignments.join(', ') || 'None'}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {member.authorized ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deauthorizeMember(selectedNetwork!.id, member.id)}
                        >
                          Deauthorize
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => authorizeMember(selectedNetwork!.id, member.id)}
                        >
                          Authorize
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
