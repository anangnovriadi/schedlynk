import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useLocation } from 'wouter';
import { format, addDays, startOfWeek, isSameDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isBefore, startOfDay, isSameMonth } from 'date-fns';
import { Calendar, Clock, User, Mail, Phone, Check, ChevronLeft, ChevronRight, Video, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PublicBookingInfo {
  team: {
    id: number;
    name: string;
    slug: string;
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
  serviceMembers: Array<{
    id: number;
    order: number;
    user: {
      id: number;
      name: string;
      email: string;
    };
  }>;
}

interface TimeSlot {
  start: Date;
  end: Date;
  memberIds: number[];
}

export default function PublicBookingPage() {
  const params = useParams<{ teamSlug: string; serviceSlug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState<'calendar' | 'details' | 'confirmation'>('calendar');
  const [bookingResult, setBookingResult] = useState<any>(null);

  // Get booking information
  const { data: bookingInfo, isLoading, error } = useQuery<PublicBookingInfo>({
    queryKey: ['/api/public/book', params.teamSlug, params.serviceSlug],
    enabled: !!params.teamSlug && !!params.serviceSlug
  });

  // Get available slots for current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  
  const { data: slotsData, isLoading: slotsLoading } = useQuery<{ slots: TimeSlot[] }>({
    queryKey: ['/api/public/book', params.teamSlug, params.serviceSlug, 'slots', monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () => {
      const url = `/api/public/book/${params.teamSlug}/${params.serviceSlug}/slots?startDate=${monthStart.toISOString()}&endDate=${monthEnd.toISOString()}`;
      return fetch(url).then(res => res.json());
    },
    enabled: !!bookingInfo
  });
  
  // Get specific day slots when date is selected
  const daySlots = selectedDate && slotsData ? 
    { slots: slotsData.slots.filter(slot => isSameDay(new Date(slot.start), selectedDate)) } : 
    null;

  // Create booking mutation
  const createBookingMutation = useMutation({
    mutationFn: (bookingData: { start: string; end: string; guestEmail: string; guestName: string }) =>
      fetch(`/api/public/book/${params.teamSlug}/${params.serviceSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      }).then(res => res.json()),
    onSuccess: (data) => {
      setBookingResult(data);
      setCurrentStep('confirmation');
      toast({
        title: "Booking confirmed!",
        description: "Check your email for confirmation details."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Booking failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setCurrentStep('details');
  };

  const handleBookingSubmit = () => {
    if (!selectedSlot || !guestEmail) return;

    createBookingMutation.mutate({
      start: selectedSlot.start.toISOString(),
      end: selectedSlot.end.toISOString(),
      guestEmail,
      guestName: guestName || guestEmail
    });
  };

  const handleBackToCalendar = () => {
    setCurrentStep('calendar');
    setSelectedSlot(null);
    setSelectedDate(null);
  };

  const nextMonth = () => {
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    setCurrentDate(nextDate);
  };

  const prevMonth = () => {
    const prevDate = new Date(currentDate);
    prevDate.setMonth(prevDate.getMonth() - 1);
    
    // Don't allow going to past months
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const targetMonth = new Date(prevDate.getFullYear(), prevDate.getMonth(), 1);
    
    if (targetMonth >= currentMonth) {
      setCurrentDate(prevDate);
    }
  };

  const getMonthDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
    const calendarEnd = startOfWeek(addDays(monthEnd, 7), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  };

  const getAvailableSlots = (date: Date) => {
    if (!slotsData) return [];
    return slotsData.slots.filter(slot => isSameDay(new Date(slot.start), date));
  };

  const hasAvailableSlots = (date: Date) => {
    return getAvailableSlots(date).length > 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking page...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
          <p className="text-gray-600">The requested service could not be found.</p>
          <p className="text-xs text-gray-500 mt-2">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!bookingInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Service Not Found</h1>
          <p className="text-gray-600">The requested service could not be found.</p>
        </div>
      </div>
    );
  }

  const monthDays = getMonthDays();
  
  // Check if we can navigate to previous month
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const displayMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const canGoPrev = displayMonth > currentMonth;

  return (
    <div className="min-h-screen bg-white">
      {/* Main Layout */}
      <div className="flex flex-col md:flex-row h-screen">
        {/* Left Sidebar */}
         <div className="w-full md:w-80 bg-white border-b md:border-b-0 md:border-r border-gray-200 flex flex-col">
          {/* Service Info */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-gray-900">{bookingInfo.team.name}</h2>
              </div>
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-2">{bookingInfo.service.name}</h1>
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <Clock className="w-4 h-4 mr-1" />
              {bookingInfo.service.duration}m
            </div>
            <div className="flex items-center text-sm text-gray-600 mb-4">
              <Video className="w-4 h-4 mr-1" />
              Cal Video
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <MapPin className="w-4 h-4 mr-1" />
              Asia/Kolkata
            </div>
          </div>

          {/* Time Slots */}
          <div className="flex-1 p-6">
            {selectedDate ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-900">
                    {format(selectedDate, 'EEE d')}
                  </h3>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">12h</Button>
                    <Button variant="outline" size="sm">24h</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {daySlots?.slots.map((slot, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start h-10 text-left"
                      onClick={() => handleSlotSelect({
                        ...slot,
                        start: new Date(slot.start),
                        end: new Date(slot.end)
                      })}
                    >
                      <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                      {format(new Date(slot.start), 'h:mm a')}
                    </Button>
                  ))}
                  {(!daySlots || daySlots.slots.length === 0) && (
                    <p className="text-sm text-gray-500">No available times</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Select a date to see available times</p>
            )}
          </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col">
          {/* Calendar Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <div className="flex space-x-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={prevMonth}
                  disabled={!canGoPrev}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="flex-1 p-6">
            <div className="grid grid-cols-7 gap-1 mb-4">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map((date, index) => {
                const isPast = isBefore(date, startOfDay(new Date()));
                const isSelected = selectedDate && isSameDay(date, selectedDate);
                const hasSlots = hasAvailableSlots(date);
                const isCurrentDay = isToday(date);
                const isCurrentMonth = isSameMonth(date, currentDate);
                
                return (
                  <button
                    key={index}
                    onClick={() => !isPast && hasSlots && isCurrentMonth && handleDateSelect(date)}
                    disabled={isPast || !hasSlots || !isCurrentMonth}
                    className={`
                      relative aspect-square p-2 text-sm rounded-lg transition-colors
                      ${isSelected ? 'bg-black text-white' : ''}
                      ${isCurrentDay && !isSelected ? 'bg-gray-100' : ''}
                      ${hasSlots && !isPast && !isSelected && isCurrentMonth ? 'hover:bg-gray-50' : ''}
                      ${isPast || !hasSlots || !isCurrentMonth ? 'text-gray-300 cursor-not-allowed' : 'text-gray-900 cursor-pointer'}
                      ${!isCurrentMonth ? 'text-gray-200' : ''}
                    `}
                  >
                    {format(date, 'd')}
                    {hasSlots && !isPast && isCurrentMonth && (
                      <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      {currentStep === 'details' && selectedSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Enter your details</CardTitle>
              <CardDescription>
                {format(selectedSlot.start, 'EEEE, MMMM d')} at {format(selectedSlot.start, 'h:mm a')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Label>Name</Label>
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div className="space-y-3">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Your email"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label>Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional information"
                  rows={3}
                />
              </div>
            </CardContent>
            <div className="flex justify-between p-6 pt-0">
              <Button variant="outline" onClick={handleBackToCalendar}>
                Back
              </Button>
              <Button 
                onClick={handleBookingSubmit}
                disabled={!guestEmail || createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? 'Booking...' : 'Schedule Event'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation */}
      {currentStep === 'confirmation' && bookingResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Check className="w-5 h-5 text-green-600 mr-2" />
                Booking Confirmed!
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Your appointment has been scheduled. Check your email for confirmation details and calendar invite.
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{bookingInfo.service.name}</h4>
                <p className="text-sm text-gray-600">
                  {bookingResult.booking && format(parseISO(bookingResult.booking.start), 'EEEE, MMMM d, yyyy')} at {bookingResult.booking && format(parseISO(bookingResult.booking.start), 'h:mm a')}
                </p>
              </div>
            </CardContent>
            <div className="p-6 pt-0">
              <Button 
                className="w-full" 
                onClick={() => setLocation('/')}
              >
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}