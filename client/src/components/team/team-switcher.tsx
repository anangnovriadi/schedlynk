import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Check, ChevronDown, Plus } from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TeamMembership {
  id: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  team: {
    id: number;
    name: string;
    slug: string;
  };
}

export default function TeamSwitcher() {
  const { currentTeam, setCurrentTeam } = useTeam();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [teamName, setTeamName] = useState("");
  const { toast } = useToast();

  const { data: teams = [] } = useQuery<TeamMembership[]>({
    queryKey: ["/api/user/teams"],
  });

  // Check if user is super admin in any team
  const isSuperAdmin = teams.some(team => team.role === 'SUPER_ADMIN');

  const createTeamMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await apiRequest('POST', '/api/teams', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/teams'] });
      setShowCreateDialog(false);
      setTeamName("");
      toast({
        title: "Success",
        description: "Team created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    },
  });

  const handleTeamSwitch = (team: TeamMembership['team']) => {
    setCurrentTeam(team);
    setIsOpen(false);
    
    // Invalidate all team-specific queries to refresh data
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0] as string;
        return key.includes('/api/teams/') || key.includes('/api/user/');
      }
    });
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive",
      });
      return;
    }
    createTeamMutation.mutate({ name: teamName.trim() });
  };

  if (!currentTeam) {
    return (
      <div className="text-sm text-gray-500">
        No team selected
      </div>
    );
  }

  return (
    <>
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center space-x-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs">
              {currentTeam.name[0]}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{currentTeam.name}</span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="start">
        <DropdownMenuLabel>Your Teams</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {teams.map((membership) => {
          const isSelected = currentTeam.id === membership.team.id;
          
          return (
            <DropdownMenuItem
              key={membership.team.id}
              onClick={() => handleTeamSwitch(membership.team)}
              className="flex items-center space-x-3 cursor-pointer"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {membership.team.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{membership.team.name}</div>
                <div className="text-xs text-gray-500">
                  {membership.role} • {teams.length} member{teams.length !== 1 ? 's' : ''}
                </div>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="flex items-center space-x-3 cursor-pointer"
          onClick={() => {
            if (!isSuperAdmin) {
              toast({
                title: "Permission Denied",
                description: "Only super admins can create teams",
                variant: "destructive",
              });
              return;
            }
            setShowCreateDialog(true);
            setIsOpen(false);
          }}
        >
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <Plus className="h-4 w-4 text-gray-600" />
          </div>
          <span className="text-sm font-medium">Create New Team</span>
          {!isSuperAdmin && <span className="text-xs text-gray-400 ml-2">(Super Admin Only)</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
      <DialogContent aria-describedby="create-team-description">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription id="create-team-description">
            Create a new team to manage services and bookings separately.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name"
              disabled={createTeamMutation.isPending}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowCreateDialog(false)}
              disabled={createTeamMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTeamMutation.isPending || !teamName.trim()}
            >
              {createTeamMutation.isPending ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
