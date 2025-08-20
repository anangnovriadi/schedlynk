import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTeam } from "@/hooks/use-team";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  Calendar, 
  Bell, 
  Clock, 
  Users, 
  BarChart3, 
  Settings,
  CalendarDays,
  FileText
} from "lucide-react";

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  isActive: boolean;
}

interface TeamMember {
  id: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function Sidebar() {
  const [location] = useLocation();
  const { currentTeam, currentMembership } = useTeam();

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/teams", currentTeam?.id, "services"],
    enabled: !!currentTeam,
  });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam,
  });

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Calendar Settings", href: "/calendar-settings", icon: Settings },
    { name: "Services", href: "/services", icon: Bell, count: services.filter(s => s.isActive).length },
    { name: "Availability", href: "/availability", icon: CalendarDays },
    { name: "Bookings", href: "/bookings", icon: Clock },
    { name: "Team Members", href: "/team-members", icon: Users, count: members.length },
    // ...(currentMembership?.role === 'SUPER_ADMIN' || currentMembership?.role === 'ADMIN' ? [
    //   { name: "API Keys", href: "/settings/api-keys", icon: Settings }
    // ] : []),
    // ...(currentMembership?.role === 'SUPER_ADMIN' ? [
    //   { name: "API Documentation", href: "/admin/swagger", icon: FileText }
    // ] : []),
  ];

  if (!currentTeam) {
    return (
      <div className="fixed inset-y-0 left-0 pt-16 w-64 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-4">
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">Select a team to view navigation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 left-0 pt-16 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-4">
        {/* Team Context Indicator */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded text-white text-xs flex items-center justify-center">
              <span>{currentTeam.name[0]}</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{currentTeam.name}</span>
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {currentMembership?.role === 'SUPER_ADMIN' ? 'Super Admin Access' : 
             currentMembership?.role === 'ADMIN' ? 'Admin Access' : 'Member Access'}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                    isActive
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                  )}
                >
                  <item.icon 
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive
                        ? "text-primary"
                        : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                    )} 
                  />
                  {item.name}
                  {item.count !== undefined && (
                    <Badge variant="secondary" className="ml-auto">
                      {item.count}
                    </Badge>
                  )}
                </div>
              </Link>
            );
          })}
          
          <hr className="my-4 border-gray-200 dark:border-gray-700" />
          
          <Link href="/team-settings">
            <div className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer">
              <Settings className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3 h-5 w-5" />
              Team Settings
            </div>
          </Link>
        </nav>
      </div>
    </div>
  );
}
