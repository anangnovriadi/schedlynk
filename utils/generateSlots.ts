import { Service, Availability, Holiday, Booking } from "@shared/schema";

export interface TimeSlot {
  start: Date;
  end: Date;
  memberIds: number[];
}

export interface SlotGenerationOptions {
  service: Service;
  dateRange: { start: Date; end: Date };
  teamHolidays: Holiday[];
  memberAvailabilities: Map<number, Availability[]>;
  existingBookings: Booking[];
  memberIds: number[];
}

/**
 * Generate available time slots for a service based on member availability,
 * working hours, holidays, and existing bookings
 */
export function generateSlots(options: SlotGenerationOptions): TimeSlot[] {
  const {
    service,
    dateRange,
    teamHolidays,
    memberAvailabilities,
    existingBookings,
    memberIds
  } = options;



  const slots: TimeSlot[] = [];
  const slotDurationMs = service.duration * 60 * 1000; // Convert minutes to milliseconds
  
  // Parse service working hours
  let workingHours: Record<string, { start: string; end: string }>;
  try {
    workingHours = JSON.parse(service.workingHours || '{}');
  } catch {
    // Default working hours if JSON is invalid
    workingHours = {
      mon: { start: '09:00', end: '17:00' },
      tue: { start: '09:00', end: '17:00' },
      wed: { start: '09:00', end: '17:00' },
      thu: { start: '09:00', end: '17:00' },
      fri: { start: '09:00', end: '17:00' }
    };
  }

  // Day name mapping
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  // Iterate through each day in the range
  const currentDate = new Date(dateRange.start);
  while (currentDate <= dateRange.end) {
    const dayOfWeek = currentDate.getDay();
    const dayName = dayNames[dayOfWeek];
    
    // Skip if no working hours defined for this day
    if (!workingHours[dayName]) {

      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    // Check if this date is a holiday
    const isHoliday = teamHolidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      return (
        holidayDate.toDateString() === currentDate.toDateString() ||
        (holiday.isRecurring && 
         holidayDate.getMonth() === currentDate.getMonth() &&
         holidayDate.getDate() === currentDate.getDate())
      );
    });

    if (isHoliday) {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    const dayWorkingHours = workingHours[dayName];
    const [startHour, startMinute] = dayWorkingHours.start.split(':').map(Number);
    const [endHour, endMinute] = dayWorkingHours.end.split(':').map(Number);

    const dayStart = new Date(currentDate);
    dayStart.setHours(startHour, startMinute, 0, 0);
    
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(endHour, endMinute, 0, 0);

    // Generate slots for this day

    const daySlots = generateDaySlots({
      dayStart,
      dayEnd,
      slotDurationMs,
      memberIds,
      memberAvailabilities,
      existingBookings,
      dayOfWeek
    });


    slots.push(...daySlots);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Filter slots that are in the past
  const now = new Date();
  
  return slots.filter(slot => slot.start.getTime() > now.getTime());
}

function generateDaySlots(options: {
  dayStart: Date;
  dayEnd: Date;
  slotDurationMs: number;
  memberIds: number[];
  memberAvailabilities: Map<number, Availability[]>;
  existingBookings: Booking[];
  dayOfWeek: number;
}): TimeSlot[] {
  const {
    dayStart,
    dayEnd,
    slotDurationMs,
    memberIds,
    memberAvailabilities,
    existingBookings,
    dayOfWeek
  } = options;

  const slots: TimeSlot[] = [];
  
  // Generate all possible time slots for the day
  let currentSlotStart = new Date(dayStart);
  
  while (currentSlotStart.getTime() + slotDurationMs <= dayEnd.getTime()) {
    const slotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);
    
    // Find available members for this slot
    const availableMembers = memberIds.filter(memberId => {
      // Check member's availability windows
      const memberAvails = memberAvailabilities.get(memberId) || [];
      const hasAvailability = memberAvails.some(avail => {
        // Check if this slot falls within member's availability window
        if (avail.dayOfWeek !== dayOfWeek) return false;
        
        if (!avail.startTime || !avail.endTime) return false;
        
        const [availStartHour, availStartMin] = avail.startTime.split(':').map(Number);
        const [availEndHour, availEndMin] = avail.endTime.split(':').map(Number);
        
        const availStart = new Date(currentSlotStart);
        availStart.setHours(availStartHour, availStartMin, 0, 0);
        
        const availEnd = new Date(currentSlotStart);
        availEnd.setHours(availEndHour, availEndMin, 0, 0);
        
        return currentSlotStart >= availStart && slotEnd <= availEnd;
      });

      if (!hasAvailability) return false;

      // Check if member has existing booking during this slot
      const hasConflict = existingBookings.some(booking => {
        if (booking.assignedUserId !== memberId) return false;
        if (booking.status !== 'SCHEDULED') return false;
        
        const bookingStart = new Date(booking.start);
        const bookingEnd = new Date(booking.end);
        
        // Check for overlap
        return !(slotEnd <= bookingStart || currentSlotStart >= bookingEnd);
      });

      return !hasConflict;
    });

    // Only add slot if at least one member is available
    if (availableMembers.length > 0) {
      slots.push({
        start: new Date(currentSlotStart),
        end: new Date(slotEnd),
        memberIds: availableMembers
      });
    }

    // Move to next slot (15-minute increment)
    currentSlotStart = new Date(currentSlotStart.getTime() + (15 * 60 * 1000));
  }

  return slots;
}

/**
 * Simple round-robin assignment from available members
 */
export function selectMemberForSlot(slot: TimeSlot, lastAssignedMember?: number): number {
  if (slot.memberIds.length === 0) {
    throw new Error('No available members for this slot');
  }

  if (!lastAssignedMember) {
    return slot.memberIds[0];
  }

  const currentIndex = slot.memberIds.indexOf(lastAssignedMember);
  const nextIndex = (currentIndex + 1) % slot.memberIds.length;
  
  return slot.memberIds[nextIndex];
}

/**
 * Validate if a slot is still available before booking
 */
export function validateSlotAvailability(
  slot: TimeSlot,
  service: Service,
  existingBookings: Booking[]
): boolean {
  const now = new Date();
  const bufferMs = service.cancellationBuffer * 60 * 60 * 1000;

  // Check if slot is not in the past or too close
  if (slot.start.getTime() <= now.getTime() + bufferMs) {
    return false;
  }

  // Check for conflicts with existing bookings
  const hasConflict = existingBookings.some(booking => {
    if (booking.status !== 'SCHEDULED') return false;
    
    const bookingStart = new Date(booking.start);
    const bookingEnd = new Date(booking.end);
    
    return !(slot.end <= bookingStart || slot.start >= bookingEnd);
  });

  return !hasConflict;
}