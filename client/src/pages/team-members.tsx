import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserPlus, Users } from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import InviteMemberModal from "@/components/team/invite-member-modal";

interface TeamMember {
  id: number;
  role: 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function TeamMembers() {
  const { currentTeam } = useTeam();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam,
  });

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to view members.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Team Members</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Manage your team members and their roles</p>
          </div>
          <Button onClick={() => setIsInviteModalOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Invite Member</span>
            <span className="sm:hidden">Invite</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : members.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No team members</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Invite people to join your team</p>
              <Button onClick={() => setIsInviteModalOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Your First Member
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {members.map((member) => (
            <Card key={member.id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarFallback>
                        {member.user.name?.split(' ').map(n => n[0]).join('') || member.user.email[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{member.user.name || member.user.email}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-3 w-full sm:w-auto">
                    <Badge variant={member.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {member.role}
                    </Badge>
                    <Button variant="outline" size="sm" className="w-full sm:w-auto">
                      Edit
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      />
    </div>
  );
}
