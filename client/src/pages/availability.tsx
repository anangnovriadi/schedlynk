import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Plus, 
  Trash2, 
  Copy, 
  Calendar,
  Clock,
  User
} from "lucide-react";
import { useTeam } from "@/hooks/use-team";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface TeamMember {
  id: number;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MEMBER';
  user: {
    id: number;
    name: string;
    email: string;
  };
}

interface Availability {
  id: number;
  userId: number;
  teamId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface Holiday {
  id: number;
  userId: number;
  teamId: number;
  date: string;
  title: string;
  isRecurring: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const COMMON_TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
];

export default function AvailabilityPage() {
  const { currentTeam } = useTeam();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const [newHoliday, setNewHoliday] = useState({
    date: '',
    title: '',
    isRecurring: false,
  });

  const { data: members = [] } = useQuery<TeamMember[]>({
    queryKey: ["/api/teams", currentTeam?.id, "members"],
    enabled: !!currentTeam,
  });

  const { data: availability = [] } = useQuery<Availability[]>({
    queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "availability"],
    enabled: !!currentTeam && !!selectedUserId,
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "holidays"],
    enabled: !!currentTeam && !!selectedUserId,
  });

  const createAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        `/api/teams/${currentTeam!.id}/users/${selectedUserId}/availability`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "availability"] 
      });
      toast({
        title: "Availability added",
        description: "New availability slot has been created.",
      });
      setNewAvailability({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create availability.",
        variant: "destructive",
      });
    },
  });

  const bulkCreateAvailabilityMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        `/api/teams/${currentTeam!.id}/users/${selectedUserId}/availability/bulk`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "availability"] 
      });
      toast({
        title: "Availability copied",
        description: "Hours have been copied to all weekdays.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy availability.",
        variant: "destructive",
      });
    },
  });

  const deleteAvailabilityMutation = useMutation({
    mutationFn: async (availabilityId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/teams/${currentTeam!.id}/availability/${availabilityId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "availability"] 
      });
      toast({
        title: "Availability deleted",
        description: "Availability slot has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete availability.",
        variant: "destructive",
      });
    },
  });

  const createHolidayMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest(
        "POST",
        `/api/teams/${currentTeam!.id}/users/${selectedUserId}/holidays`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "holidays"] 
      });
      toast({
        title: "Holiday added",
        description: "New holiday has been created.",
      });
      setNewHoliday({
        date: '',
        title: '',
        isRecurring: false,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create holiday.",
        variant: "destructive",
      });
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: async (holidayId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/teams/${currentTeam!.id}/holidays/${holidayId}`,
        {}
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/teams", currentTeam?.id, "users", selectedUserId, "holidays"] 
      });
      toast({
        title: "Holiday deleted",
        description: "Holiday has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete holiday.",
        variant: "destructive",
      });
    },
  });

  const handleAddAvailability = () => {
    if (!selectedUserId) return;
    createAvailabilityMutation.mutate(newAvailability);
  };

  const handleCopyToWeekdays = () => {
    if (!selectedUserId) return;
    
    const weekdayAvailabilities = [];
    for (let day = 1; day <= 5; day++) { // Monday to Friday
      weekdayAvailabilities.push({
        dayOfWeek: day,
        startTime: newAvailability.startTime,
        endTime: newAvailability.endTime,
        timezone: newAvailability.timezone,
      });
    }
    
    bulkCreateAvailabilityMutation.mutate({ availabilities: weekdayAvailabilities });
  };

  const handleAddHoliday = () => {
    if (!selectedUserId || !newHoliday.date || !newHoliday.title) return;
    createHolidayMutation.mutate(newHoliday);
  };

  const groupedAvailability = availability.reduce((acc, av) => {
    if (!acc[av.dayOfWeek]) acc[av.dayOfWeek] = [];
    acc[av.dayOfWeek].push(av);
    return acc;
  }, {} as Record<number, Availability[]>);

  const selectedMember = members.find(m => m.user.id === selectedUserId);

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to manage availability.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team Availability</h1>
        <p className="text-gray-600 mt-1">Manage working hours and holidays for team members</p>
      </div>

      {/* Member Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Select Team Member
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedUserId(member.user.id)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedUserId === member.user.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {member.user.name?.split(' ').map(n => n[0]).join('') || member.user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="font-medium">{member.user.name || member.user.email}</div>
                    <div className="text-sm text-gray-500">{member.role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedUserId && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Working Hours - {selectedMember?.user.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Availability */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Add New Hours</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="dayOfWeek">Day</Label>
                    <select
                      id="dayOfWeek"
                      value={newAvailability.dayOfWeek}
                      onChange={(e) => setNewAvailability(prev => ({ ...prev, dayOfWeek: parseInt(e.target.value) }))}
                      className="w-full p-2 border rounded-md"
                    >
                      {DAYS_OF_WEEK.map(day => (
                        <option key={day.value} value={day.value}>{day.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="startTime">Start Time</Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={newAvailability.startTime}
                      onChange={(e) => setNewAvailability(prev => ({ ...prev, startTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">End Time</Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={newAvailability.endTime}
                      onChange={(e) => setNewAvailability(prev => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <select
                      id="timezone"
                      value={newAvailability.timezone}
                      onChange={(e) => setNewAvailability(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full p-2 border rounded-md"
                    >
                      {COMMON_TIMEZONES.map(tz => (
                        <option key={tz.value} value={tz.value}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button onClick={handleAddAvailability} disabled={createAvailabilityMutation.isPending}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Hours
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleCopyToWeekdays}
                    disabled={bulkCreateAvailabilityMutation.isPending}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy to Weekdays
                  </Button>
                </div>
              </div>

              {/* Current Availability */}
              <div className="space-y-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.value} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="font-medium text-sm w-20">{day.label}</div>
                      <div className="flex space-x-2">
                        {groupedAvailability[day.value]?.map(av => (
                          <div key={av.id} className="flex items-center space-x-2">
                            <Badge variant="secondary" className="text-xs">
                              {av.startTime} - {av.endTime}
                              {av.timezone !== 'UTC' && (
                                <span className="ml-1 text-xs opacity-70">
                                  ({av.timezone})
                                </span>
                              )}
                            </Badge>
                            <button
                              onClick={() => deleteAvailabilityMutation.mutate(av.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )) || <span className="text-gray-400 text-sm">No hours set</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Holidays */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Holidays - {selectedMember?.user.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Add New Holiday */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium">Add New Holiday</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="holidayDate">Date</Label>
                    <Input
                      id="holidayDate"
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holidayTitle">Title</Label>
                    <Input
                      id="holidayTitle"
                      type="text"
                      placeholder="e.g., Christmas Day"
                      value={newHoliday.title}
                      onChange={(e) => setNewHoliday(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={newHoliday.isRecurring}
                    onChange={(e) => setNewHoliday(prev => ({ ...prev, isRecurring: e.target.checked }))}
                  />
                  <Label htmlFor="isRecurring">Recurring yearly</Label>
                </div>
                <Button onClick={handleAddHoliday} disabled={createHolidayMutation.isPending}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Holiday
                </Button>
              </div>

              {/* Current Holidays */}
              <div className="space-y-3">
                {holidays.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No holidays added yet</p>
                  </div>
                ) : (
                  holidays.map(holiday => (
                    <div key={holiday.id} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                      <div>
                        <div className="font-medium">{holiday.title}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(holiday.date).toLocaleDateString()}
                          {holiday.isRecurring && <span className="ml-2 text-blue-500">(Recurring)</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteHolidayMutation.mutate(holiday.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}