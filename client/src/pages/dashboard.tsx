import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Plus, UserPlus, CalendarDays, Bell, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useTeam } from "@/hooks/use-team";
import { useDocumentTitle } from "@/hooks/use-document-title";
import ServiceCard from "@/components/services/service-card";
import CreateServiceModal from "@/components/services/create-service-modal";
import InviteMemberModal from "@/components/team/invite-member-modal";
import { useState } from "react";
import { useLocation } from "wouter";

interface DashboardStats {
  todayBookings: number;
  activeServices: number;
  teamMembers: number;
  weeklyHours: number;
}

interface Service {
  id: number;
  name: string;
  description: string;
  duration: number;
  isActive: boolean;
  members: Array<{
    id: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

export default function Dashboard() {
  const { currentTeam } = useTeam();
  const [isCreateServiceModalOpen, setIsCreateServiceModalOpen] = useState(false);
  const [isInviteMemberModalOpen, setIsInviteMemberModalOpen] = useState(false);
  const [, setLocation] = useLocation();
  
  useDocumentTitle("Dashboard");

  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ["/api/teams", currentTeam?.id, "stats"],
    enabled: !!currentTeam,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/teams", currentTeam?.id, "services"],
    enabled: !!currentTeam,
  });

  const { data: recentBookings = [] } = useQuery({
    queryKey: ["/api/teams", currentTeam?.id, "bookings"],
    enabled: !!currentTeam,
    select: (data: any[]) => {
      // Get the 5 most recent bookings, sorted by creation/start time
      return data
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime())
        .slice(0, 5);
    }
  });

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Team Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm sm:text-base">Manage your team's scheduling and services</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Calendar className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
                </div>
              </div>
              <div className="ml-3 lg:ml-4">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats?.todayBookings || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Today's Bookings</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center">
                  <Bell className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="ml-3 lg:ml-4">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats?.activeServices || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Active Services</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center">
                  <Users className="h-5 w-5 lg:h-6 lg:w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="ml-3 lg:ml-4">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats?.teamMembers || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Team Members</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div className="ml-3 lg:ml-4">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{stats?.weeklyHours || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 dark:text-gray-400">Weekly Hours</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-3"
                onClick={() => setIsCreateServiceModalOpen(true)}
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Create New Service</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Set up a new bookable service</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-3"
                onClick={() => setIsInviteMemberModalOpen(true)}
              >
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900 rounded-lg flex items-center justify-center mr-3">
                  <UserPlus className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">Invite Team Member</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Add someone to your team</div>
                </div>
              </Button>

              <Button 
                variant="outline" 
                className="w-full justify-start h-auto p-3"
                onClick={() => setLocation('/calendar')}
              >
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-lg flex items-center justify-center mr-3">
                  <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900 dark:text-white">View Full Calendar</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">See all upcoming bookings</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardContent className="p-4 lg:p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {recentBookings.length > 0 ? (
                recentBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center space-x-3 p-3 rounded-lg border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <div className="flex-shrink-0">
                      {booking.status === 'COMPLETED' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {booking.status === 'CANCELLED' && (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      {booking.status === 'SCHEDULED' && (
                        <AlertCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {booking.service.name}
                      </p>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{booking.guestName}</span>
                        <span>•</span>
                        <span>{format(new Date(booking.start), "MMM dd, h:mm a")}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        booking.status === 'COMPLETED' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : booking.status === 'CANCELLED'
                          ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      }`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Services Overview */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Services</h3>
            <Button onClick={() => setIsCreateServiceModalOpen(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Create Service</span>
              <span className="sm:hidden">Create</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            
            {/* Add Service Card */}
            <Button
              variant="outline"
              className="border-2 border-dashed border-gray-300 h-auto min-h-[180px] flex flex-col items-center justify-center text-gray-500 hover:text-gray-600 hover:border-gray-400"
              onClick={() => setIsCreateServiceModalOpen(true)}
            >
              <Plus className="h-8 w-8 mb-2" />
              <span className="text-sm font-medium">Add New Service</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateServiceModal
        isOpen={isCreateServiceModalOpen}
        onClose={() => setIsCreateServiceModalOpen(false)}
      />
      
      <InviteMemberModal
        isOpen={isInviteMemberModalOpen}
        onClose={() => setIsInviteMemberModalOpen(false)}
      />
    </div>
  );
}
