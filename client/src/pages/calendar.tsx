import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, endOfDay } from "date-fns";
import { useTeam } from "@/hooks/use-team";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Booking {
  id: number;
  start: string;
  end: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  guestEmail: string;
  guestName: string;
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

type ViewType = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const { currentTeam } = useTeam();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  
  useDocumentTitle("Calendar");

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/teams", currentTeam?.id, "bookings"],
    enabled: !!currentTeam,
  });

  const getBookingsForDate = (date: Date) => {
    return bookings.filter(booking => 
      isSameDay(new Date(booking.start), date) && booking.status !== 'CANCELLED'
    );
  };

  const getBookingsForDateRange = (start: Date, end: Date) => {
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.start);
      return bookingDate >= start && bookingDate <= end && booking.status !== 'CANCELLED';
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewType === 'month') {
      setCurrentDate(direction === 'next' ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else if (viewType === 'week') {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 7) : addDays(currentDate, -7));
    } else {
      setCurrentDate(direction === 'next' ? addDays(currentDate, 1) : addDays(currentDate, -1));
    }
  };

  const getDateRangeTitle = () => {
    switch (viewType) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'week':
        const weekStart = startOfWeek(currentDate);
        const weekEnd = endOfWeek(currentDate);
        return `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`;
      case 'day':
        return format(currentDate, 'EEEE, MMMM dd, yyyy');
      default:
        return '';
    }
  };

  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = '';

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;
        const dayBookings = getBookingsForDate(cloneDay);

        days.push(
          <div
            key={day.toString()}
            className={cn(
              "min-h-24 p-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
              !isSameMonth(day, monthStart) && "bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500",
              isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}
            onClick={() => {
              setCurrentDate(cloneDay);
              setViewType('day');
            }}
          >
            <div className="font-medium text-sm mb-1 dark:text-white">{formattedDate}</div>
            <div className="space-y-1">
              {dayBookings.slice(0, 3).map((booking) => (
                <div
                  key={booking.id}
                  className="text-xs p-1 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/70 transition-colors"
                  title={`${booking.service.name} - ${booking.guestName} (Click for details)`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBooking(booking);
                  }}
                >
                  {format(new Date(booking.start), 'HH:mm')} {booking.service.name}
                </div>
              ))}
              {dayBookings.length > 3 && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  +{dayBookings.length - 3} more
                </div>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {days}
        </div>
      );
      days = [];
    }

    return (
      <div>
        {/* Header */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          {rows}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(currentDate);
    const weekBookings = getBookingsForDateRange(weekStart, endOfWeek(currentDate));
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayBookings = getBookingsForDate(day);
      
      days.push(
        <div key={day.toString()} className="flex-1 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
          <div 
            className={cn(
              "p-3 text-center border-b border-gray-200 dark:border-gray-700 font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
              isSameDay(day, new Date()) && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
            )}
            onClick={() => {
              setCurrentDate(day);
              setViewType('day');
            }}
          >
            <div className="text-sm dark:text-gray-300">{format(day, 'EEE')}</div>
            <div className="text-lg dark:text-white">{format(day, 'd')}</div>
          </div>
          <div className="p-2 space-y-2 min-h-96">
            {dayBookings.map((booking) => (
              <div
                key={booking.id}
                className="p-2 rounded bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/70 transition-colors"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="font-medium text-sm dark:text-white">{booking.service.name}</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {format(new Date(booking.start), 'HH:mm')} - {format(new Date(booking.end), 'HH:mm')}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">{booking.guestName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">with {booking.assignedUser.name}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-800">
        <div className="flex">
          {days}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDate(currentDate);
    
    return (
      <div className="space-y-4">
        {dayBookings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-gray-500 dark:text-gray-400">
              No bookings scheduled for this day.
            </CardContent>
          </Card>
        ) : (
          dayBookings.map((booking) => (
            <Card 
              key={booking.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBooking(booking)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="font-semibold text-lg dark:text-white">{booking.service.name}</h3>
                      <Badge variant={booking.status === 'COMPLETED' ? 'secondary' : 'default'}>
                        {booking.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(booking.start), "h:mm a")} - {format(new Date(booking.end), "h:mm a")}
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {booking.assignedUser.name}
                      </div>
                      <div className="text-sm">
                        <span className="font-medium">Guest:</span> {booking.guestName}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  if (!currentTeam) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">No Team Selected</h1>
          <p className="text-gray-600 dark:text-gray-400">Please select a team to view the calendar.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your team's appointments</p>
          </div>
          
          {/* View Type Selector */}
          <div className="flex gap-2">
            {(['month', 'week', 'day'] as ViewType[]).map((view) => (
              <Button
                key={view}
                variant={viewType === view ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewType(view)}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Header */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-semibold">{getDateRangeTitle()}</h2>
              <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Content */}
      <div>
        {viewType === 'month' && renderMonthView()}
        {viewType === 'week' && renderWeekView()}
        {viewType === 'day' && renderDayView()}
      </div>

      {/* Booking Details Dialog */}
      <Dialog open={!!selectedBooking} onOpenChange={() => setSelectedBooking(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              View appointment information and details
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold dark:text-white">{selectedBooking.service.name}</h3>
                <Badge variant={selectedBooking.status === 'COMPLETED' ? 'secondary' : 'default'}>
                  {selectedBooking.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Date & Time</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CalendarIcon className="h-4 w-4" />
                      {format(new Date(selectedBooking.start), "EEEE, MMMM dd, yyyy")}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Clock className="h-4 w-4" />
                      {format(new Date(selectedBooking.start), "h:mm a")} - {format(new Date(selectedBooking.end), "h:mm a")}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Assigned Team Member</h4>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <User className="h-4 w-4" />
                      {selectedBooking.assignedUser.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedBooking.assignedUser.email}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Guest Information</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      <div className="font-medium">{selectedBooking.guestName}</div>
                      <div className="text-gray-500 dark:text-gray-400">{selectedBooking.guestEmail}</div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 dark:text-white">Service Description</h4>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {selectedBooking.service.description || "No description available"}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                <Button variant="outline" onClick={() => setSelectedBooking(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}