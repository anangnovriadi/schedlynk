import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

interface Team {
  id: number;
  name: string;
  slug: string;
}

interface TeamMembership {
  id: number;
  userId: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  team: Team;
}

export function useTeam() {
  const [currentTeamId, setCurrentTeamId] = useState<number | null>(() => {
    const stored = localStorage.getItem("current-team-id");
    return stored ? parseInt(stored) : null;
  });

  const { data: teams = [] } = useQuery<TeamMembership[]>({
    queryKey: ["/api/user/teams"],
  });

  // Auto-select first team if none selected
  useEffect(() => {
    if (teams.length > 0 && !currentTeamId) {
      setCurrentTeamId(teams[0].team.id);
    }
  }, [teams, currentTeamId]);

  // Update localStorage when team changes
  useEffect(() => {
    if (currentTeamId) {
      localStorage.setItem("current-team-id", currentTeamId.toString());
    }
  }, [currentTeamId]);

  const currentTeam = teams.find(t => t.team.id === currentTeamId)?.team || null;
  const currentMembership = teams.find(t => t.team.id === currentTeamId) || null;

  const setCurrentTeam = (team: Team) => {
    setCurrentTeamId(team.id);
    
    // Import queryClient and invalidate team-specific queries
    import("@/lib/queryClient").then(({ queryClient }) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0] as string;
          return key.includes(`/api/teams/`) || key.includes('/api/user/teams');
        }
      });
    });
  };

  return {
    currentTeam,
    currentMembership,
    teams,
    setCurrentTeam,
  };
}
