import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTeam } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings, Users, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  userId: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Team {
  id: number;
  name: string;
  slug: string;
  timezone: string;
}

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

export default function TeamSettingsPage() {
  const { currentTeam, currentMembership } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [teamName, setTeamName] = useState("");
  const [teamTimezone, setTeamTimezone] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');

  const { data: teamData } = useQuery<Team>({
    queryKey: ["/api/teams", currentTeam?.id],
    enabled: !!currentTeam,
    onSuccess: (data) => {
      if (data) {
        setTeamName(data.name);
        setTeamTimezone(data.timezone);
      }
    },
  });

  useEffect(() => {
    if (currentTeam) {
      setTeamName(currentTeam.name);
      setTeamTimezone(currentTeam.timezone);
    }
  }, [currentTeam]);

  useEffect(() => {
    if (teamData) {
      setTeamName(teamData.name);
      setTeamTimezone(teamData.timezone);
    }
  }, [teamData]);

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam,
  });

  const updateTeamMutation = useMutation({
    mutationFn: async (data: { name: string; timezone: string }) =>
      // apiRequest(`/api/teams/${currentTeam?.id}`, {
      //   method: "PUT",
      //   body: data,
      // }),
      apiRequest("PUT", `/api/teams/${currentTeam?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/teams"] });
      toast({ title: "Team settings updated successfully" });
    },
    onError: (error) => {
      console.error("Update team error:", error);
      toast({ title: "Failed to update team settings", variant: "destructive" });
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async (data: { email: string; name: string; role: string }) =>
      apiRequest(`/api/teams/${currentTeam?.id}/members`, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "members"] });
      toast({ title: "Team member added successfully" });
      setNewMemberEmail("");
      setNewMemberName("");
      setNewMemberRole('MEMBER');
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add team member", 
        description: error.message || "Unknown error occurred",
        variant: "destructive" 
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) =>
      apiRequest(`/api/teams/${currentTeam?.id}/members/${userId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "members"] });
      toast({ title: "Team member removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove team member", variant: "destructive" });
    },
  });

  const handleUpdateTeam = () => {
    updateTeamMutation.mutate({ name: teamName, timezone: teamTimezone });
  };

  const handleAddMember = () => {
    if (!newMemberEmail || !newMemberName) return;
    addMemberMutation.mutate({
      email: newMemberEmail,
      name: newMemberName,
      role: newMemberRole,
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'destructive';
      case 'ADMIN': return 'default';
      case 'MEMBER': return 'secondary';
      default: return 'outline';
    }
  };

  const isAdmin = currentMembership && ['ADMIN', 'SUPER_ADMIN'].includes(currentMembership.role);

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to manage settings.</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access team settings.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Settings</h1>
        <p className="text-gray-600 mt-1">Manage your team configuration and members</p>
      </div>

      <div className="grid gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              General Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="teamName" className="mb-2 block">Team Name</Label>
              <Input
                id="teamName"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
              />
            </div>
            
            <div>
              <Label htmlFor="timezone">Team Timezone</Label>
              <Select value={teamTimezone} onValueChange={setTeamTimezone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleUpdateTeam} 
              disabled={updateTeamMutation.isPending}
            >
              Save Settings
            </Button>
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent aria-describedby="add-member-description">
                  <DialogHeader>
                    <DialogTitle>Add Team Member</DialogTitle>
                  </DialogHeader>
                  <div id="add-member-description" className="sr-only">
                    Add a new member to your team by providing their email, name, and role.
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="member@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="Member Name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select value={newMemberRole} onValueChange={(value: 'ADMIN' | 'MEMBER') => setNewMemberRole(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setNewMemberEmail("");
                        setNewMemberName("");
                        setNewMemberRole('MEMBER');
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
                        Add Member
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(member.role)}>
                      {member.role.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  {member.user.id !== currentMembership?.userId && member.role !== 'SUPER_ADMIN' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMemberMutation.mutate(member.user.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {members.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No team members found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}