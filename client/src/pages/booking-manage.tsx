import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { Calendar, Clock, User, Mail, AlertTriangle, Check, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BookingDetails {
  booking: {
    id: number;
    start: string;
    end: string;
    status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
    guestName: string;
    guestEmail: string;
    rescheduleCount: number;
  };
  service: {
    id: number;
    name: string;
    slug: string;
    description: string;
    duration: number;
    workingHours: string;
    cancellationBuffer: number;
    rescheduleBuffer: number;
  };
  assignedUser: {
    id: number;
    name: string;
    email: string;
  };
  team: {
    id: number;
    name: string;
    slug: string;
  };
}

interface TimeSlot {
  start: Date;
  end: Date;
  memberIds: number[];
}

export default function BookingManagePage() {
  const params = useParams<{ manageToken: string; action?: string }>();
  const { toast } = useToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  // Get booking details
  const { data: bookingDetails, isLoading, error } = useQuery<BookingDetails>({
    queryKey: ['/api/public/booking', params.manageToken],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/public/booking/${params.manageToken}`);
      return await response.json();
    },
    enabled: !!params.manageToken
  });

  // Get available slots for reschedule
  const startDate = startOfWeek(selectedDate);
  const endDate = addDays(startDate, 6);
  
  const { data: slotsData, isLoading: slotsLoading } = useQuery<{ slots: TimeSlot[] }>({
    queryKey: ['/api/public/slots', bookingDetails?.team.slug, bookingDetails?.service.slug, startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/public/book/${bookingDetails?.team.slug}/${bookingDetails?.service.slug}/slots?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
      return await response.json();
    },
    enabled: !!bookingDetails && showReschedule
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/public/booking/${params.manageToken}/cancel`),
    onSuccess: () => {
      toast({
        title: "Booking cancelled",
        description: "Your appointment has been cancelled successfully."
      });
      // Redirect to booking details page
      setShowCancel(false);
      window.location.href = `/booking/${params.manageToken}`;
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes(':') ? 
        error.message.split(': ')[1] : 
        error.message || "Please try again.";
      
      toast({
        title: "Cancellation failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Reschedule booking mutation
  const rescheduleMutation = useMutation({
    mutationFn: (rescheduleData: { start: string; end: string }) =>
      apiRequest('POST', `/api/public/booking/${params.manageToken}/reschedule`, rescheduleData),
    onSuccess: () => {
      toast({
        title: "Booking rescheduled",
        description: "Your appointment has been rescheduled successfully."
      });
      // Redirect to booking details page
      setShowReschedule(false);
      window.location.href = `/booking/${params.manageToken}`;
    },
    onError: (error: any) => {
      const errorMessage = error.message?.includes(':') ? 
        error.message.split(': ')[1] : 
        error.message || "Please try again.";
      
      toast({
        title: "Reschedule failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  });

  // Set initial action based on URL
  useEffect(() => {
    if (params.action === 'cancel') {
      setShowCancel(true);
    } else if (params.action === 'reschedule') {
      setShowReschedule(true);
    }
  }, [params.action]);

  const handleConfirmCancel = () => {
    cancelMutation.mutate();
  };

  const handleConfirmReschedule = () => {
    if (!selectedSlot) return;
    
    rescheduleMutation.mutate({
      start: new Date(selectedSlot.start).toISOString(),
      end: new Date(selectedSlot.end).toISOString()
    });
  };

  const groupSlotsByDate = (slots: TimeSlot[]) => {
    const grouped = new Map<string, TimeSlot[]>();
    
    slots.forEach(slot => {
      const dateKey = format(new Date(slot.start), 'yyyy-MM-dd');
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(slot);
    });
    
    return grouped;
  };

  const canCancel = () => {
    if (!bookingDetails) return false;
    if (bookingDetails.booking.status !== 'SCHEDULED') return false;
    
    const now = new Date();
    const bookingStart = new Date(bookingDetails.booking.start);
    const bufferMs = bookingDetails.service.cancellationBuffer * 60 * 60 * 1000;
    
    return bookingStart.getTime() - now.getTime() >= bufferMs;
  };

  const canReschedule = () => {
    if (!bookingDetails) return false;
    if (bookingDetails.booking.status !== 'SCHEDULED') return false;
    
    const now = new Date();
    const bookingStart = new Date(bookingDetails.booking.start);
    const bufferMs = bookingDetails.service.rescheduleBuffer * 60 * 60 * 1000;
    
    return bookingStart.getTime() - now.getTime() >= bufferMs;
  };

  const downloadCalendar = () => {
    window.open(`/api/public/booking/${params.manageToken}/calendar.ics`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || !bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Booking Not Found</h1>
          <p className="text-gray-600">The booking link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  const workingHours = JSON.parse(bookingDetails.service.workingHours || '{}');
  const weekDays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const groupedSlots = slotsData ? groupSlotsByDate(slotsData.slots) : new Map();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">Manage Your Booking</h1>
              <p className="text-gray-600">{bookingDetails.team.name}</p>
            </div>
            <Badge variant={
              bookingDetails.booking.status === 'SCHEDULED' ? 'default' :
              bookingDetails.booking.status === 'CANCELLED' ? 'destructive' : 'secondary'
            }>
              {bookingDetails.booking.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!showReschedule && !showCancel && (
          <div className="space-y-6">
            {/* Booking Details */}
            <Card>
              <CardHeader>
                <CardTitle>Appointment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Service Information</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Service:</strong> {bookingDetails.service.name}</div>
                      <div><strong>Duration:</strong> {bookingDetails.service.duration} minutes</div>
                      <div><strong>Provider:</strong> {bookingDetails.assignedUser.name}</div>
                      <div><strong>Team:</strong> {bookingDetails.team.name}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Appointment Time</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Date:</strong> {format(new Date(bookingDetails.booking.start), 'EEEE, MMMM d, yyyy')}</div>
                      <div><strong>Time:</strong> {format(new Date(bookingDetails.booking.start), 'h:mm a')} - {format(new Date(bookingDetails.booking.end), 'h:mm a')}</div>
                      <div><strong>Guest:</strong> {bookingDetails.booking.guestName || bookingDetails.booking.guestEmail}</div>
                      <div><strong>Email:</strong> {bookingDetails.booking.guestEmail}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={downloadCalendar}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Calendar File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            {bookingDetails.booking.status === 'SCHEDULED' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      Reschedule
                    </CardTitle>
                    <CardDescription>
                      Change your appointment to a different date or time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {canReschedule() ? (
                      <>
                        <p className="text-sm text-gray-600 mb-4">
                          You can reschedule up to {bookingDetails.service.rescheduleBuffer} hours before your appointment.
                        </p>
                        {bookingDetails.booking.rescheduleCount > 0 && (
                          <Alert className="mb-4">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              This booking has been rescheduled {bookingDetails.booking.rescheduleCount} time(s).
                            </AlertDescription>
                          </Alert>
                        )}
                        <Button 
                          onClick={() => setShowReschedule(true)}
                          className="w-full"
                        >
                          Reschedule Appointment
                        </Button>
                      </>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Reschedule is not available. You can only reschedule at least {bookingDetails.service.rescheduleBuffer} hours before your appointment.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <X className="w-5 h-5 mr-2 text-red-600" />
                      Cancel
                    </CardTitle>
                    <CardDescription>
                      Cancel your appointment completely
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {canCancel() ? (
                      <>
                        <p className="text-sm text-gray-600 mb-4">
                          You can cancel up to {bookingDetails.service.cancellationBuffer} hours before your appointment.
                        </p>
                        <Button 
                          onClick={() => setShowCancel(true)}
                          variant="destructive"
                          className="w-full"
                        >
                          Cancel Appointment
                        </Button>
                      </>
                    ) : (
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Cancellation is not available. You can only cancel at least {bookingDetails.service.cancellationBuffer} hours before your appointment.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {bookingDetails.booking.status === 'CANCELLED' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  This appointment has been cancelled. If you need to book again, please visit the booking page.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Reschedule Interface */}
        {showReschedule && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Reschedule Appointment</h2>
              <Button variant="outline" onClick={() => setShowReschedule(false)}>
                Back to Details
              </Button>
            </div>

            <div className="grid gap-8 lg:grid-cols-3">
              {/* Date Navigation */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Select New Date</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Array.from({ length: 7 }, (_, i) => {
                        const date = addDays(startDate, i);
                        const dayName = weekDays[date.getDay()];
                        const hasWorkingHours = workingHours[dayName];
                        const hasSlots = groupedSlots.has(format(date, 'yyyy-MM-dd'));
                        
                        return (
                          <button
                            key={i}
                            onClick={() => setSelectedDate(date)}
                            disabled={!hasWorkingHours || !hasSlots}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${
                              isSameDay(date, selectedDate)
                                ? 'bg-blue-50 border-blue-200 text-blue-900'
                                : hasWorkingHours && hasSlots
                                ? 'bg-white border-gray-200 hover:bg-gray-50'
                                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            <div className="font-medium">{format(date, 'EEEE')}</div>
                            <div className="text-sm text-gray-600">{format(date, 'MMM d')}</div>
                            {hasSlots && (
                              <div className="text-xs text-green-600 mt-1">
                                {groupedSlots.get(format(date, 'yyyy-MM-dd'))?.length} slots available
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="mt-6 space-y-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(addDays(startDate, -7))}
                        className="w-full"
                      >
                        Previous Week
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedDate(addDays(startDate, 7))}
                        className="w-full"
                      >
                        Next Week
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Time Slots */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Times</CardTitle>
                    <CardDescription>
                      {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading available times...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {groupedSlots.get(format(selectedDate, 'yyyy-MM-dd'))?.map((slot, index) => (
                            <Button
                              key={index}
                              variant={selectedSlot === slot ? "default" : "outline"}
                              onClick={() => setSelectedSlot(slot)}
                              className="p-3 h-auto flex flex-col items-center space-y-1"
                            >
                              <span className="font-medium">{format(new Date(slot.start), 'h:mm a')}</span>
                              <span className="text-xs text-gray-500">
                                {slot.memberIds.length} available
                              </span>
                            </Button>
                          )) || (
                            <div className="col-span-full text-center py-8 text-gray-500">
                              No available times for this date
                            </div>
                          )}
                        </div>

                        {selectedSlot && (
                          <div className="pt-4 border-t">
                            <Alert className="mb-4">
                              <Check className="h-4 w-4" />
                              <AlertDescription>
                                New time selected: {format(new Date(selectedSlot.start), 'EEEE, MMMM d, yyyy')} at {format(new Date(selectedSlot.start), 'h:mm a')}
                              </AlertDescription>
                            </Alert>
                            <Button 
                              onClick={handleConfirmReschedule}
                              disabled={rescheduleMutation.isPending}
                              className="w-full"
                            >
                              {rescheduleMutation.isPending ? 'Rescheduling...' : 'Confirm Reschedule'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation */}
        {showCancel && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Cancel Appointment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Are you sure you want to cancel your appointment? This action cannot be undone.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Appointment to Cancel</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div>Service: {bookingDetails.service.name}</div>
                  <div>Date: {format(new Date(bookingDetails.booking.start), 'EEEE, MMMM d, yyyy')}</div>
                  <div>Time: {format(new Date(bookingDetails.booking.start), 'h:mm a')} - {format(new Date(bookingDetails.booking.end), 'h:mm a')}</div>
                  <div>Provider: {bookingDetails.assignedUser.name}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCancel(false)}
                  className="flex-1"
                >
                  Keep Appointment
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmCancel}
                  disabled={cancelMutation.isPending}
                  className="flex-1"
                >
                  {cancelMutation.isPending ? 'Cancelling...' : 'Yes, Cancel'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}