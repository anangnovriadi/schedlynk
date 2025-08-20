import { Fragment } from "react";
import { Link, useLocation } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function MobileSidebar({ open, onClose }: MobileSidebarProps) {
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
    { name: "Services", href: "/services", icon: Bell, count: services.filter(s => s.isActive).length },
    { name: "Availability", href: "/availability", icon: CalendarDays },
    { name: "Bookings", href: "/bookings", icon: Clock },
    { name: "Team Members", href: "/team-members", icon: Users, count: members.length },
    ...(currentMembership?.role === 'SUPER_ADMIN' || currentMembership?.role === 'ADMIN' ? [
      { name: "API Keys", href: "/settings/api-keys", icon: Settings }
    ] : []),
    ...(currentMembership?.role === 'SUPER_ADMIN' ? [
      { name: "API Documentation", href: "/admin/swagger", icon: FileText }
    ] : []),
  ];

  const handleNavClick = () => {
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-64 p-0 lg:hidden">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white dark:bg-gray-800 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="h-8 w-8 bg-primary rounded flex items-center justify-center mr-2">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white">
              Scheduler-Lite
            </span>
          </div>

          {currentTeam && (
            <div className="bg-primary/5 dark:bg-primary/10 border border-primary/20 rounded-lg p-3">
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
          )}

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    
                    return (
                      <li key={item.name}>
                        <Link href={item.href}>
                          <div
                            onClick={handleNavClick}
                            className={cn(
                              "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold cursor-pointer",
                              isActive
                                ? "bg-primary/10 text-primary dark:bg-primary/20"
                                : "text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-700"
                            )}
                          >
                            <item.icon 
                              className={cn(
                                "h-6 w-6 shrink-0",
                                isActive ? "text-primary" : "text-gray-400 group-hover:text-primary"
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
                      </li>
                    );
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <Link href="/team-settings">
                  <div
                    onClick={handleNavClick}
                    className="group -mx-2 flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-primary cursor-pointer"
                  >
                    <Settings className="h-6 w-6 shrink-0 text-gray-400 group-hover:text-primary" />
                    Team Settings
                  </div>
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}