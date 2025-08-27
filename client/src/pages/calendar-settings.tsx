import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTeam } from "@/hooks/use-team";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Calendar, Settings, Plus, Trash2, AlertCircle, CheckCircle, Clock, ExternalLink } from "lucide-react";

interface CalendarIntegration {
  id: number;
  type: 'google' | 'outlook' | 'apple' | 'caldav';
  name: string;
  isActive: boolean;
  syncStatus: 'active' | 'paused' | 'error' | 'pending';
  syncDirection: string;
  autoSync: boolean;
  syncInterval: number;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  createdAt: string;
}

const integrationSchema = z.object({
  type: z.enum(['google', 'outlook', 'apple', 'caldav']),
  name: z.string().min(1, "Name is required"),
  syncDirection: z.enum(['both', 'to_external', 'from_external']).default('both'),
  autoSync: z.boolean().default(true),
  syncInterval: z.number().min(5).max(1440).default(15),
  
  // CalDAV specific fields
  caldavUrl: z.string().url().optional(),
  caldavUsername: z.string().optional(),
  caldavPassword: z.string().optional(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

export default function CalendarSettings() {
  const { currentTeam } = useTeam();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  
  useDocumentTitle("Calendar Settings");

  // Handle OAuth callback messages
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');

    if (success === 'google_connected') {
      toast({
        title: "Google Calendar Connected",
        description: "Your Google Calendar has been successfully integrated",
      });
      // Clean URL
      window.history.replaceState({}, '', '/calendar-settings');
      // Refresh integrations
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "calendar-integrations"] });
    } else if (error) {
      let errorMessage = "Failed to connect calendar";
      switch (error) {
        case 'oauth_denied':
          errorMessage = "Calendar authorization was denied";
          break;
        case 'oauth_failed':
          errorMessage = "Calendar authorization failed";
          break;
        case 'missing_code':
          errorMessage = "Authorization code was missing";
          break;
        case 'missing_team_id':
          errorMessage = "Team information was missing";
          break;
        case 'access_denied':
          errorMessage = "Access denied - you are not a member of this team";
          break;
      }
      toast({
        title: "Calendar Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Clean URL
      window.history.replaceState({}, '', '/calendar-settings');
    }
  }, [toast, currentTeam?.id]);

  const { data: integrations = [], isLoading } = useQuery<CalendarIntegration[]>({
    queryKey: ["/api/teams", currentTeam?.id, "calendar-integrations"],
    enabled: !!currentTeam,
  });

  const form = useForm<IntegrationFormData>({
    resolver: zodResolver(integrationSchema),
    defaultValues: {
      type: 'google',
      name: '',
      syncDirection: 'both',
      autoSync: true,
      syncInterval: 15,
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (data: IntegrationFormData) => {
      const response = await apiRequest('POST', `/api/teams/${currentTeam!.id}/calendar-integrations`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create integration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "calendar-integrations"] });
      setIsCreateDialogOpen(false);
      form.reset();
      toast({
        title: "Integration created",
        description: "Your calendar integration has been set up successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteIntegrationMutation = useMutation({
    mutationFn: async (integrationId: number) => {
      const response = await apiRequest('DELETE', `/api/teams/${currentTeam!.id}/calendar-integrations/${integrationId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete integration');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "calendar-integrations"] });
      toast({
        title: "Integration deleted",
        description: "Calendar integration has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleIntegrationMutation = useMutation({
    mutationFn: async ({ integrationId, isActive }: { integrationId: number; isActive: boolean }) => {
      const response = await apiRequest('PUT', `/api/teams/${currentTeam!.id}/calendar-integrations/${integrationId}`, { isActive });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update integration');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "calendar-integrations"] });
      toast({
        title: "Integration updated",
        description: "Calendar integration settings have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update integration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      case 'paused':
        return <Badge variant="outline">Paused</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'google':
        return '📅';
      case 'outlook':
        return '📧';
      case 'apple':
        return '🍎';
      case 'caldav':
        return '🔗';
      default:
        return '📅';
    }
  };

  const onSubmit = async (data: IntegrationFormData) => {
    // For Google Calendar, initiate OAuth via authenticated API call
    if (data.type === 'google') {
      const currentTeamId = currentTeam?.id;
      
      if (!currentTeamId) {
        toast({
          title: "Team required",
          description: "Please select a team first",
          variant: "destructive",
        });
        return;
      }

      try {
        // Call authenticated API to get OAuth URL
        const response = await fetch(`/api/auth/google/initiate?team_id=${currentTeamId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
          },
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to initiate OAuth');
        }
        
        const { authUrl } = await response.json();
        
        // Redirect to Google OAuth
        window.location.href = authUrl;
        setIsCreateDialogOpen(false);
        return;
      } catch (error) {
        toast({
          title: "OAuth Error",
          description: "Failed to start Google Calendar authorization",
          variant: "destructive",
        });
        return;
      }
    }

    // For other types, use the regular flow
    createIntegrationMutation.mutate(data);
  };

  const handleAuthorize = (integration: CalendarIntegration) => {
    if (integration.type === 'google') {
      const token = localStorage.getItem('auth-token');
      const currentTeamId = currentTeam?.id;
      
      if (!token || !currentTeamId) {
        toast({
          title: "Authentication required",
          description: "Please make sure you're logged in",
          variant: "destructive",
        });
        return;
      }

      // Redirect to Google OAuth with auth token
      window.location.href = `/auth/google?team_id=${currentTeamId}&token=${encodeURIComponent(token)}`;
    }
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Team Selected</h1>
          <p className="text-gray-600 dark:text-gray-400">Please select a team to view calendar settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Calendar Settings</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Manage your external calendar integrations</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add Calendar Integration</DialogTitle>
                <DialogDescription>
                  Connect your external calendar to sync bookings automatically.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Calendar Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select calendar type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="google">Google Calendar</SelectItem>
                            <SelectItem value="outlook">Microsoft Outlook</SelectItem>
                            <SelectItem value="apple">Apple Calendar</SelectItem>
                            <SelectItem value="caldav">CalDAV</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Integration Name</FormLabel>
                        <FormControl>
                          <Input placeholder="My Work Calendar" {...field} />
                        </FormControl>
                        <FormDescription>
                          A friendly name for this integration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="syncDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sync Direction</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="both">Both ways</SelectItem>
                            <SelectItem value="to_external">To external calendar only</SelectItem>
                            <SelectItem value="from_external">From external calendar only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('type') === 'caldav' && (
                    <>
                      <FormField
                        control={form.control}
                        name="caldavUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CalDAV Server URL</FormLabel>
                            <FormControl>
                              <Input placeholder="https://caldav.example.com/calendars/user/calendar/" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caldavUsername"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="caldavPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createIntegrationMutation.isPending}>
                      {createIntegrationMutation.isPending ? "Creating..." : "Create Integration"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Integration Cards */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(2)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : integrations.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Calendar Integrations</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Connect your external calendars to automatically sync bookings and availability.
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Integration
              </Button>
            </CardContent>
          </Card>
        ) : (
          integrations.map((integration) => (
            <Card key={integration.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{getIntegrationIcon(integration.type)}</div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {integration.type} Calendar
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(integration.syncStatus)}
                    <Switch
                      checked={integration.isActive}
                      onCheckedChange={(checked) =>
                        toggleIntegrationMutation.mutate({
                          integrationId: integration.id,
                          isActive: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Sync Direction</Label>
                    <p className="font-medium capitalize">{integration.syncDirection.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Auto Sync</Label>
                    <p className="font-medium">{integration.autoSync ? 'Enabled' : 'Disabled'}</p>
                  </div>
                  <div>
                    <Label className="text-gray-600 dark:text-gray-400">Sync Interval</Label>
                    <p className="font-medium">{integration.syncInterval} minutes</p>
                  </div>
                </div>
                
                {integration.lastSyncAt && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Label className="text-gray-600 dark:text-gray-400">Last Sync</Label>
                    <p className="text-sm">{new Date(integration.lastSyncAt).toLocaleString()}</p>
                  </div>
                )}

                {integration.lastSyncError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">Sync Error</p>
                        <p className="text-sm text-red-600 dark:text-red-300">{integration.lastSyncError}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure
                    </Button>
                    {integration.type !== 'caldav' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleAuthorize(integration)}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {integration.syncStatus === 'pending' ? 'Authorize' : 'Re-authorize'}
                      </Button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteIntegrationMutation.mutate(integration.id)}
                    disabled={deleteIntegrationMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Calendar Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Supported Calendar Services</h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• <strong>Google Calendar:</strong> OAuth integration with automatic sync</li>
              <li>• <strong>Microsoft Outlook:</strong> Office 365 and Outlook.com support</li>
              <li>• <strong>Apple Calendar:</strong> iCloud calendar integration</li>
              <li>• <strong>CalDAV:</strong> Any CalDAV-compatible calendar server</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Sync Options</h4>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>• <strong>Both ways:</strong> Sync bookings to external calendar and import external events</li>
              <li>• <strong>To external only:</strong> Only push bookings to your external calendar</li>
              <li>• <strong>From external only:</strong> Only import availability from your external calendar</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}