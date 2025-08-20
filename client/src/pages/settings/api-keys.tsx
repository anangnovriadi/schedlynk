import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useTeam } from "@/hooks/use-team";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Key, Copy, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required"),
  permissions: z.array(z.string()).min(1, "At least one permission is required"),
  expiresAt: z.string().optional(),
});

type CreateApiKeyForm = z.infer<typeof createApiKeySchema>;

export default function ApiKeysPage() {
  const { user } = useAuth();
  const { currentTeam } = useTeam();
  const { toast } = useToast();
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<number>>(new Set());

  const form = useForm<CreateApiKeyForm>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: {
      name: "",
      permissions: [],
      expiresAt: "",
    },
  });

  const { data: apiKeys = [], isLoading } = useQuery({
    queryKey: ['/api/teams', currentTeam?.id, 'api-keys'],
    enabled: !!currentTeam?.id,
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async (data: CreateApiKeyForm) => {
      const response = await apiRequest('POST', `/api/teams/${currentTeam?.id}/api-keys`, {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      });
      return response.json();
    },
    onSuccess: (response) => {
      setNewApiKey(response.plainKey);
      setShowNewKeyDialog(false);
      form.reset();
      queryClient.invalidateQueries({
        queryKey: ['/api/teams', currentTeam?.id, 'api-keys'],
      });
      toast({
        title: "API Key Created",
        description: "Your new API key has been generated. Make sure to copy it now - you won't be able to see it again.",
      });
    },
    onError: (error) => {
      console.error('API Key creation error:', error);
      toast({
        title: "Error",
        description: `Failed to create API key: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/teams/${currentTeam?.id}/api-keys/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/teams', currentTeam?.id, 'api-keys'],
      });
      toast({
        title: "API Key Deleted",
        description: "The API key has been deleted successfully.",
      });
    },
  });

  const onSubmit = (data: CreateApiKeyForm) => {
    console.log('Submitting API key data:', data);
    createApiKeyMutation.mutate(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard",
    });
  };

  const toggleKeyVisibility = (keyId: number) => {
    setVisibleKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return key;
    return key.substring(0, 8) + "•".repeat(20);
  };

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-600 mt-2">
            Manage API keys for external integrations and automation
          </p>
        </div>
        
        <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for external integrations. Choose permissions carefully.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., External Booking System" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="permissions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Permissions</FormLabel>
                      <FormControl>
                        <Select
                          value={
                            field.value?.includes("admin") ? "admin" :
                            field.value?.includes("write") ? "write" :
                            field.value?.includes("read") ? "read" : ""
                          }
                          onValueChange={(value) => {
                            if (value === "read") field.onChange(["read"]);
                            else if (value === "write") field.onChange(["read", "write"]);
                            else if (value === "admin") field.onChange(["read", "write", "admin"]);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select permissions" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="read">Read Only</SelectItem>
                            <SelectItem value="write">Read & Write</SelectItem>
                            <SelectItem value="admin">Full Admin Access</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="expiresAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiration (Optional)</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setShowNewKeyDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createApiKeyMutation.isPending}>
                    {createApiKeyMutation.isPending ? "Creating..." : "Create API Key"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* New API Key Display */}
      {newApiKey && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">New API Key Created</CardTitle>
            <CardDescription className="text-green-600">
              Copy this key now - you won't be able to see it again
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2 bg-white p-3 rounded border">
              <code className="flex-1 font-mono text-sm">{newApiKey}</code>
              <Button size="sm" variant="outline" onClick={() => copyToClipboard(newApiKey)}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => setNewApiKey(null)}
            >
              I've copied the key
            </Button>
          </CardContent>
        </Card>
      )}

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No API Keys</h3>
              <p className="text-gray-600 mb-4">
                Create your first API key to start integrating with external systems
              </p>
              <Button onClick={() => setShowNewKeyDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create API Key
              </Button>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((apiKey: any) => (
            <Card key={apiKey.id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium">{apiKey.name}</h3>
                      <Badge variant="outline">
                        {apiKey.permissions?.[0] || 'read'}
                      </Badge>
                      {apiKey.expiresAt && (
                        <Badge variant="secondary">
                          Expires {new Date(apiKey.expiresAt).toLocaleDateString()}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <span>Key: </span>
                      <code className="font-mono bg-gray-100 px-2 py-1 rounded">
                        {visibleKeys.has(apiKey.id) ? apiKey.keyPrefix + "..." : maskKey(apiKey.keyPrefix)}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleKeyVisibility(apiKey.id)}
                      >
                        {visibleKeys.has(apiKey.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {apiKey.lastUsed && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last used: {new Date(apiKey.lastUsed).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteApiKeyMutation.mutate(apiKey.id)}
                    disabled={deleteApiKeyMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            How to use your API keys with external integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Authentication</h4>
            <p className="text-sm text-gray-600 mb-2">
              Include your API key in the Authorization header:
            </p>
            <code className="block bg-gray-100 p-3 rounded text-sm font-mono">
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Available Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-green-600">Public API (No Auth Required)</h5>
                  <ul className="text-gray-600 space-y-1 mt-1">
                    <li>GET /api/public/teams/:teamSlug</li>
                    <li>GET /api/public/teams/:teamSlug/services</li>
                    <li>POST /api/public/teams/:teamSlug/services/:serviceSlug/book</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium text-blue-600">Authenticated API</h5>
                  <ul className="text-gray-600 space-y-1 mt-1">
                    <li>GET /api/teams/:teamId/bookings</li>
                    <li>GET /api/teams/:teamId/services</li>
                    <li>POST /api/teams/:teamId/bookings</li>
                    <li>PUT /api/teams/:teamId/bookings/:id/status</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}