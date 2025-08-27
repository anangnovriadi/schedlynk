import { Booking, Service, User, Team } from '@shared/schema';

export interface ICSCalendarOptions {
  booking: Booking;
  service: Service;
  assignedUser: User;
  team: Team;
  rescheduleUrl: string;
  cancelUrl: string;
}

/**
 * Generate ICS calendar content for a booking
 */
export function generateICSCalendar(options: ICSCalendarOptions): string {
  const { booking, service, assignedUser, team, rescheduleUrl, cancelUrl } = options;
  
  const startDate = new Date(booking.start);
  const endDate = new Date(booking.end);
  
  // Format dates for ICS (YYYYMMDDTHHMMSS format in UTC)
  const formatICSDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };
  
  // Generate unique ID for the event
  const uid = `booking-${booking.id}-${Date.now()}@scheduler-lite.com`;
  
  // Create timestamp for DTSTAMP (when the calendar was created)
  const now = new Date();
  const dtstamp = formatICSDate(now);
  
  // Create description with booking details and management links
  const description = [
    `Booking Details:`,
    `Service: ${service.name}`,
    `Duration: ${service.duration} minutes`,
    `Provider: ${assignedUser.name}`,
    `Team: ${team.name}`,
    '',
    'Manage your booking:',
    `Reschedule: ${rescheduleUrl}`,
    `Cancel: ${cancelUrl}`,
    '',
    'Important:',
    `- Cancellations must be made at least ${service.cancellationBuffer} hours in advance`,
    `- Reschedules can be made up to ${service.rescheduleBuffer} hours before your appointment`
  ].join('\\n');
  
  // Create location/organizer info
  const organizerEmail = assignedUser.email;
  const organizerName = assignedUser.name;
  
  // Build the ICS content
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Scheduler Lite//Booking System//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${service.name} with ${assignedUser.name}`,
    `DESCRIPTION:${description}`,
    `ORGANIZER;CN=${organizerName}:MAILTO:${organizerEmail}`,
    `LOCATION:${team.name}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'SEQUENCE:0',
    'CLASS:PUBLIC',
    // Add attendee if guest email is available
    ...(booking.guestEmail ? [`ATTENDEE;CN=${booking.guestName || booking.guestEmail};RSVP=TRUE:MAILTO:${booking.guestEmail}`] : []),
    // Add alarm for 30 minutes before
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'DESCRIPTION:Reminder: Your appointment is in 30 minutes',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  
  return icsContent;
}

/**
 * Generate a filename for the ICS file
 */
export function generateICSFilename(booking: Booking, service: Service): string {
  const startDate = new Date(booking.start);
  const dateStr = startDate.toISOString().split('T')[0];
  const timeStr = startDate.toISOString().split('T')[1].slice(0, 5).replace(':', '');
  
  return `${service.name.replace(/\s+/g, '_')}_${dateStr}_${timeStr}.ics`;
}