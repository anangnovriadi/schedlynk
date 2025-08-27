import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Server, Users, Calendar, Key, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE_URL = window.location.origin;

const endpoints = [
  {
    category: "Authentication",
    icon: ShieldCheck,
    endpoints: [
      {
        method: "POST",
        path: "/api/auth/register-super-admin",
        description: "Register a new super admin user",
        auth: "None",
        body: {
          email: "admin@example.com",
          name: "Admin User",
          password: "secure_password"
        },
        response: {
          user: { id: 1, email: "admin@example.com", name: "Admin User" },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
      },
      {
        method: "POST", 
        path: "/api/auth/login",
        description: "Login existing user",
        auth: "None",
        body: {
          email: "admin@example.com",
          password: "secure_password"
        },
        response: {
          user: { id: 1, email: "admin@example.com", name: "Admin User" },
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        }
      }
    ]
  },
  {
    category: "User Management",
    icon: Users,
    endpoints: [
      {
        method: "GET",
        path: "/api/user",
        description: "Get current user profile",
        auth: "JWT Token",
        response: {
          id: 1,
          email: "admin@example.com",
          name: "Admin User"
        }
      },
      {
        method: "GET",
        path: "/api/user/teams",
        description: "Get user's teams",
        auth: "JWT Token",
        response: [
          {
            id: 1,
            userId: 1,
            teamId: 1,
            role: "SUPER_ADMIN",
            team: {
              id: 1,
              name: "Admin's Team",
              slug: "admin-team"
            }
          }
        ]
      }
    ]
  },
  {
    category: "Team Management",
    icon: Users,
    endpoints: [
      {
        method: "GET",
        path: "/api/teams/{teamId}",
        description: "Get team details",
        auth: "JWT Token",
        response: {
          id: 1,
          name: "Admin's Team",
          slug: "admin-team",
          createdAt: "2025-07-10T00:00:00Z"
        }
      },
      {
        method: "POST",
        path: "/api/teams",
        description: "Create new team (Super Admin only)",
        auth: "JWT Token",
        body: {
          name: "New Team",
          slug: "new-team"
        }
      },
      {
        method: "PUT",
        path: "/api/teams/{teamId}",
        description: "Update team (Admin only)",
        auth: "JWT Token",
        body: {
          name: "Updated Team Name"
        }
      }
    ]
  },
  {
    category: "Super Admin - Teams",
    icon: Server,
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/teams",
        description: "Get all teams (Super Admin only)",
        auth: "JWT Token",
        response: [
          {
            id: 1,
            name: "Team 1",
            slug: "team-1",
            createdAt: "2025-07-10T00:00:00Z"
          },
          {
            id: 2,
            name: "Team 2", 
            slug: "team-2",
            createdAt: "2025-07-10T00:00:00Z"
          }
        ]
      },
      {
        method: "GET",
        path: "/api/admin/teams/{teamId}",
        description: "Get specific team details (Super Admin only)",
        auth: "JWT Token",
        response: {
          id: 1,
          name: "Team 1",
          slug: "team-1",
          createdAt: "2025-07-10T00:00:00Z"
        }
      }
    ]
  },
  {
    category: "Super Admin - Bookings",
    icon: Calendar,
    endpoints: [
      {
        method: "GET",
        path: "/api/admin/bookings",
        description: "Get all bookings across all teams (Super Admin only)",
        auth: "JWT Token",
        response: [
          {
            id: 1,
            serviceId: 1,
            assignedUserId: 1,
            start: "2025-07-15T10:00:00Z",
            end: "2025-07-15T10:30:00Z",
            status: "SCHEDULED",
            guestEmail: "customer@example.com",
            guestName: "John Doe",
            service: {
              id: 1,
              name: "Hair Cut",
              teamId: 1
            },
            assignedUser: {
              id: 1,
              name: "Barber",
              email: "barber@example.com"
            },
            team: {
              id: 1,
              name: "Salon Team",
              slug: "salon-team"
            }
          }
        ]
      },
      {
        method: "GET",
        path: "/api/admin/bookings/{bookingId}",
        description: "Get specific booking details (Super Admin only)",
        auth: "JWT Token",
        response: {
          id: 1,
          serviceId: 1,
          assignedUserId: 1,
          start: "2025-07-15T10:00:00Z",
          end: "2025-07-15T10:30:00Z",
          status: "SCHEDULED",
          guestEmail: "customer@example.com",
          guestName: "John Doe"
        }
      }
    ]
  },
  {
    category: "API Keys",
    icon: Key,
    endpoints: [
      {
        method: "GET",
        path: "/api/teams/{teamId}/api-keys",
        description: "Get API keys for team (Admin only)",
        auth: "JWT Token",
        response: [
          {
            id: 1,
            name: "External System",
            keyPrefix: "sk_abc123...",
            permissions: ["read", "write"],
            expiresAt: "2025-12-31T23:59:59Z"
          }
        ]
      },
      {
        method: "POST",
        path: "/api/teams/{teamId}/api-keys",
        description: "Create API key (Admin only)",
        auth: "JWT Token",
        body: {
          name: "External System",
          permissions: ["read", "write"],
          expiresAt: "2025-12-31T23:59:59Z"
        },
        response: {
          id: 1,
          name: "External System",
          keyPrefix: "sk_abc123...",
          plainKey: "sk_abc123456789defghijklmnopqrstuvwxyz",
          permissions: ["read", "write"],
          expiresAt: "2025-12-31T23:59:59Z"
        }
      }
    ]
  },
  {
    category: "Public API",
    icon: ExternalLink,
    endpoints: [
      {
        method: "GET",
        path: "/api/public/teams/{teamSlug}",
        description: "Get public team info",
        auth: "None",
        response: {
          id: 1,
          name: "Salon Team",
          slug: "salon-team"
        }
      },
      {
        method: "GET",
        path: "/api/public/teams/{teamSlug}/services",
        description: "Get public services",
        auth: "None",
        response: [
          {
            id: 1,
            name: "Hair Cut",
            slug: "hair-cut",
            description: "Professional hair cutting",
            duration: 30,
            isActive: true
          }
        ]
      },
      {
        method: "POST",
        path: "/api/public/teams/{teamSlug}/services/{serviceSlug}/book",
        description: "Create public booking",
        auth: "None",
        body: {
          start: "2025-07-15T10:00:00Z",
          end: "2025-07-15T10:30:00Z", 
          guestEmail: "customer@example.com",
          guestName: "John Doe"
        },
        response: {
          id: 1,
          manageToken: "abc123def456",
          start: "2025-07-15T10:00:00Z",
          end: "2025-07-15T10:30:00Z",
          status: "SCHEDULED"
        }
      }
    ]
  }
];

export default function SwaggerPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedEndpoint, setSelectedEndpoint] = useState<any>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API endpoint copied to clipboard",
    });
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "GET": return "bg-green-100 text-green-800";
      case "POST": return "bg-blue-100 text-blue-800";
      case "PUT": return "bg-yellow-100 text-yellow-800";
      case "DELETE": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getAuthColor = (auth: string) => {
    switch (auth) {
      case "None": return "bg-gray-100 text-gray-800";
      case "JWT Token": return "bg-blue-100 text-blue-800";
      case "API Key": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">API Documentation</h1>
          <p className="text-gray-600 mt-2">
            Complete REST API documentation for Scheduler-Lite
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline">Base URL: {API_BASE_URL}</Badge>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(API_BASE_URL)}>
            <Copy className="h-4 w-4 mr-2" />
            Copy Base URL
          </Button>
        </div>
      </div>

      <Tabs defaultValue="endpoints" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="endpoints">API Endpoints</TabsTrigger>
          <TabsTrigger value="authentication">Authentication</TabsTrigger>
        </TabsList>

        <TabsContent value="endpoints" className="space-y-4">
          {endpoints.map((category) => (
            <Card key={category.category}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <category.icon className="h-5 w-5" />
                  <span>{category.category}</span>
                </CardTitle>
                <CardDescription>
                  {category.endpoints.length} endpoint{category.endpoints.length !== 1 ? 's' : ''}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {category.endpoints.map((endpoint, index) => (
                    <div 
                      key={index}
                      className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedEndpoint(endpoint)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Badge className={getMethodColor(endpoint.method)}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono">{endpoint.path}</code>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getAuthColor(endpoint.auth)}>
                            {endpoint.auth}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(`${API_BASE_URL}${endpoint.path}`);
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{endpoint.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="authentication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Methods</CardTitle>
              <CardDescription>
                Scheduler-Lite supports multiple authentication methods
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">JWT Token Authentication</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Use JWT tokens for secure API access. Include in the Authorization header:
                  </p>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    Authorization: Bearer YOUR_JWT_TOKEN
                  </code>
                </div>
                
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">API Key Authentication</h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Use API keys for external integrations. Include in the Authorization header:
                  </p>
                  <code className="text-sm bg-gray-100 p-2 rounded block">
                    Authorization: Bearer YOUR_API_KEY
                  </code>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Public Endpoints</h4>
                  <p className="text-sm text-gray-600">
                    Public endpoints (starting with /api/public/) don't require authentication
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Endpoint Detail Modal */}
      {selectedEndpoint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Badge className={getMethodColor(selectedEndpoint.method)}>
                    {selectedEndpoint.method}
                  </Badge>
                  <code className="text-lg font-mono">{selectedEndpoint.path}</code>
                </div>
                <Button variant="ghost" onClick={() => setSelectedEndpoint(null)}>
                  ×
                </Button>
              </div>
              <p className="text-gray-600 mt-2">{selectedEndpoint.description}</p>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <Badge className={getAuthColor(selectedEndpoint.auth)}>
                  {selectedEndpoint.auth}
                </Badge>
              </div>

              {selectedEndpoint.body && (
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedEndpoint.body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedEndpoint.response && (
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <pre className="text-sm bg-gray-100 p-3 rounded overflow-x-auto">
                    {JSON.stringify(selectedEndpoint.response, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  onClick={() => copyToClipboard(`${API_BASE_URL}${selectedEndpoint.path}`)}
                  variant="outline"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy URL
                </Button>
                {selectedEndpoint.body && (
                  <Button 
                    onClick={() => copyToClipboard(JSON.stringify(selectedEndpoint.body, null, 2))}
                    variant="outline"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Body
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}