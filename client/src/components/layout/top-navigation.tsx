import { Bell, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import TeamSwitcher from "@/components/team/team-switcher";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/hooks/use-auth";

interface TopNavigationProps {
  onMenuClick: () => void;
}

export default function TopNavigation({ onMenuClick }: TopNavigationProps) {
  const { user, logout } = useAuth();

  // In a real app, notifications would come from an API
  const notifications: any[] = [];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 fixed top-0 w-full z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="lg:hidden"
              onClick={onMenuClick}
            >
              <Menu className="h-6 w-6" />
            </Button>
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <div className="h-8 w-8 bg-primary rounded flex items-center justify-center mr-2">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <span className="hidden sm:block font-bold text-xl text-gray-900 dark:text-white">
                SchedLynk
              </span>
              {/* <span className="sm:hidden font-bold text-lg text-gray-900 dark:text-white">
                SL
              </span> */}
            </div>
            
            {/* Team Switcher - Hidden on small screens */}
            <div className="hidden md:block">
              <TeamSwitcher />
            </div>
          </div>
          
          {/* User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Team switcher for mobile */}
            <div className="md:hidden">
              {/* <TeamSwitcher /> */}
            </div>
            
            {/* Notifications - Hidden when no notifications */}
            {notifications.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="hidden sm:flex relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      You have {unreadCount} unread notifications
                    </p>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                            notification.unread ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {notification.title}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                {notification.time}
                              </p>
                            </div>
                            {notification.unread && (
                              <div className="w-2 h-2 bg-blue-600 rounded-full mt-2" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" className="w-full" size="sm">
                      View all notifications
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
            
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {user?.name?.split(' ').map(n => n[0]).join('') || user?.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length > 0 && (
                  <DropdownMenuItem className="sm:hidden">
                    <Bell className="h-4 w-4 mr-2" />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                        {unreadCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
