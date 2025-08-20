import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useTeam } from "@/hooks/use-team";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Edit, X, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Booking {
  id: number;
  start: string;
  end: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  guestEmail: string;
  guestName: string;
  rescheduleCount: number;
  service: {
    id: number;
    name: string;
    description: string;
  };
  assignedUser: {
    id: number;
    name: string;
    email: string;
  };
}

export default function BookingsPage() {
  const { currentTeam } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [serviceFilter, setServiceFilter] = useState<number | null>(null);
  const [highlightedBookingId, setHighlightedBookingId] = useState<number | null>(null);

  // Get service filter and booking highlight from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const serviceParam = urlParams.get('service');
    const bookingParam = urlParams.get('booking');
    
    if (serviceParam) {
      setServiceFilter(parseInt(serviceParam, 10));
    }
    
    if (bookingParam) {
      const bookingId = parseInt(bookingParam, 10);
      setHighlightedBookingId(bookingId);
      
      // Auto-scroll to the highlighted booking after a short delay
      setTimeout(() => {
        const bookingElement = document.getElementById(`booking-${bookingId}`);
        if (bookingElement) {
          bookingElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
    }
  }, []);

  // Get services data for filter display
  const { data: services = [] } = useQuery({
    queryKey: ["/api/teams", currentTeam?.id, "services"],
    enabled: !!currentTeam,
  });

  // Find the filtered service name
  const filteredService = serviceFilter 
    ? services.find((s: any) => s.id === serviceFilter) 
    : null;

  useDocumentTitle(filteredService ? `${filteredService.name} - Bookings` : "Bookings");

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/teams", currentTeam?.id, "bookings"],
    enabled: !!currentTeam,
  });

  // Filter bookings by service if filter is set
  const filteredBookings = serviceFilter 
    ? bookings.filter(booking => booking.service.id === serviceFilter)
    : bookings;

  const { data: userBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/user/bookings"],
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ bookingId, start, end }: { bookingId: number; start: string; end: string }) => {
      const response = await apiRequest(
        "PUT",
        `/api/teams/${currentTeam?.id}/bookings/${bookingId}/reschedule`,
        { start, end }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });
      toast({ title: "Booking rescheduled successfully" });
      setSelectedBooking(null);
    },
    onError: () => {
      toast({ title: "Failed to reschedule booking", variant: "destructive" });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest(
        "PUT",
        `/api/teams/${currentTeam?.id}/bookings/${bookingId}/cancel`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });
      toast({ title: "Booking cancelled successfully" });
    },
    onError: () => {
      toast({ title: "Failed to cancel booking", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest(
        "PUT",
        `/api/teams/${currentTeam?.id}/bookings/${bookingId}/complete`
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", currentTeam?.id, "bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/bookings"] });
      toast({ title: "Booking marked as completed" });
    },
    onError: () => {
      toast({ title: "Failed to complete booking", variant: "destructive" });
    },
  });

  const handleReschedule = () => {
    if (!selectedBooking || !rescheduleStart || !rescheduleEnd) return;
    
    // Convert datetime-local to ISO string
    const startISO = new Date(rescheduleStart).toISOString();
    const endISO = new Date(rescheduleEnd).toISOString();
    
    rescheduleMutation.mutate({
      bookingId: selectedBooking.id,
      start: startISO,
      end: endISO,
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'default';
      case 'CANCELLED': return 'destructive';
      case 'COMPLETED': return 'secondary';
      default: return 'outline';
    }
  };

  const { currentMembership } = useTeam();
  const isAdmin = currentMembership && ['ADMIN', 'SUPER_ADMIN'].includes(currentMembership.role);

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Team Selected</h1>
          <p className="text-gray-600">Please select a team to view bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
        <p className="text-gray-600 mt-1">
          {filteredService 
            ? `Showing bookings for "${filteredService.name}" service` 
            : "Manage team appointments and schedules"}
        </p>
        {serviceFilter && (
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => {
              setServiceFilter(null);
              window.history.pushState({}, '', '/bookings');
            }}
          >
            <X className="h-4 w-4 mr-1" />
            Clear Filter
          </Button>
        )}
      </div>

      {/* Admin View - All Team Bookings */}
      {isAdmin && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Team Bookings</h2>
          <div className="grid gap-4">
            {filteredBookings.map((booking) => (
              <Card 
                key={booking.id} 
                id={`booking-${booking.id}`}
                className={`hover:shadow-md transition-all duration-300 ${
                  highlightedBookingId === booking.id 
                    ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/20' 
                    : ''
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-2">
                        <h3 className="font-semibold text-lg">{booking.service.name}</h3>
                        <Badge variant={getStatusBadgeVariant(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(booking.start), "MMM dd, yyyy")}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")}
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {booking.assignedUser.name}
                        </div>
                      </div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">Guest:</span> {booking.guestName} ({booking.guestEmail})
                      </div>
                    </div>
                    
                    {booking.status === 'SCHEDULED' && (
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedBooking(booking);
                                // Convert ISO string to datetime-local format
                                const startDate = new Date(booking.start);
                                const endDate = new Date(booking.end);
                                setRescheduleStart(startDate.toISOString().slice(0, 16));
                                setRescheduleEnd(endDate.toISOString().slice(0, 16));
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Reschedule
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reschedule Booking</DialogTitle>
                              <DialogDescription>
                                Update the start and end times for this booking appointment.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-3">
                                <Label htmlFor="start">Start Time</Label>
                                <Input
                                  id="start"
                                  type="datetime-local"
                                  value={rescheduleStart}
                                  onChange={(e) => setRescheduleStart(e.target.value)}
                                />
                              </div>
                              <div className="space-y-3">
                                <Label htmlFor="end">End Time</Label>
                                <Input
                                  id="end"
                                  type="datetime-local"
                                  value={rescheduleEnd}
                                  onChange={(e) => setRescheduleEnd(e.target.value)}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <DialogClose asChild>
                                  <Button variant="outline">
                                    Cancel
                                  </Button>
                                </DialogClose>
                                <Button onClick={handleReschedule} disabled={rescheduleMutation.isPending}>
                                  Reschedule
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => cancelMutation.mutate(booking.id)}
                          disabled={cancelMutation.isPending}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => completeMutation.mutate(booking.id)}
                          disabled={completeMutation.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Complete
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {bookings.length === 0 && (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No bookings found for this team.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* User's Personal Bookings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">My Bookings</h2>
        <div className="grid gap-4">
          {userBookings.map((booking) => (
            <Card 
              key={booking.id} 
              id={`booking-${booking.id}`}
              className={`hover:shadow-md transition-all duration-300 ${
                highlightedBookingId === booking.id 
                  ? 'ring-2 ring-blue-500 shadow-lg bg-blue-50 dark:bg-blue-900/20' 
                  : ''
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg">{booking.service.name}</h3>
                      <Badge variant={getStatusBadgeVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(booking.start), "MMM dd, yyyy")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {booking.assignedUser.name}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {userBookings.length === 0 && (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                You have no bookings yet.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}