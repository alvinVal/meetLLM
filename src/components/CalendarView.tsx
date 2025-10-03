'use client';

import { useState, useMemo } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import { AvailabilitySlot, User, ScheduleSlot } from '@/types';
import { safeParseDate, formatDateTime } from '@/lib/dateUtils';

// Setup moment localizer
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  availability: AvailabilitySlot[];
  schedule: ScheduleSlot[];
  users: User[];
  onNavigate?: (date: Date) => void;
  onSelectSlot?: (slotInfo: { start: Date; end: Date; slots: AvailabilitySlot[] }) => void;
  onSelectEvent?: (event: any) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    type: 'availability' | 'schedule';
    slot: AvailabilitySlot | ScheduleSlot;
    user?: User;
  };
}

export default function CalendarView({ 
  availability, 
  schedule, 
  users, 
  onNavigate,
  onSelectSlot,
  onSelectEvent 
}: CalendarViewProps) {
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get user by ID
  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  // Convert availability slots to calendar events
  const availabilityEvents: CalendarEvent[] = useMemo(() => {
    return availability.map(slot => {
      const start = safeParseDate(slot.startTime);
      const end = safeParseDate(slot.endTime);
      const user = getUserById(slot.userId);

      if (!start || !end) return null;

      const getEventTitle = () => {
        const userName = user?.name || slot.userName || 'Unknown';
        const timeRange = `${formatDateTime(slot.startTime)} - ${formatDateTime(slot.endTime)}`;
        
        switch (slot.type) {
          case 'available':
            return `${userName} - Available (${timeRange})`;
          case 'busy':
            return `${userName} - Busy (${timeRange})`;
          case 'preferred':
            return `${userName} - Preferred Time (${timeRange})`;
          case 'unavailable':
            return `${userName} - Unavailable (${timeRange})`;
          default:
            return `${userName} - ${slot.type} (${timeRange})`;
        }
      };

      return {
        id: slot.id,
        title: getEventTitle(),
        start,
        end,
        resource: {
          type: 'availability',
          slot,
          user
        }
      };
    }).filter(Boolean) as CalendarEvent[];
  }, [availability, users]);

  // Convert schedule slots to calendar events
  const scheduleEvents: CalendarEvent[] = useMemo(() => {
    return schedule.map(slot => {
      const start = safeParseDate(slot.startTime);
      const end = safeParseDate(slot.endTime);

      if (!start || !end) return null;

      const getScheduleTitle = () => {
        const timeRange = `${formatDateTime(slot.startTime)} - ${formatDateTime(slot.endTime)}`;
        
        if (slot.assignedUsers && slot.assignedUsers.length > 0) {
          const assignedUserNames = slot.assignedUsers
            .map(userId => getUserById(userId)?.name || 'Unknown')
            .join(', ');
          return `Scheduled: ${assignedUserNames} (${timeRange})`;
        }
        
        return `Scheduled Task (${timeRange})`;
      };

      return {
        id: slot.id,
        title: getScheduleTitle(),
        start,
        end,
        resource: {
          type: 'schedule',
          slot
        }
      };
    }).filter(Boolean) as CalendarEvent[];
  }, [schedule, users]);

  // Combine all events
  const allEvents = [...availabilityEvents, ...scheduleEvents];

  // Get event style based on type and availability
  const getEventStyle = (event: CalendarEvent) => {
    const { type, slot } = event.resource;
    
    if (type === 'availability') {
      const availabilitySlot = slot as AvailabilitySlot;
      switch (availabilitySlot.type) {
        case 'available':
          return { style: { backgroundColor: '#10B981', color: 'white' } }; // green
        case 'busy':
          return { style: { backgroundColor: '#EF4444', color: 'white' } }; // red
        case 'preferred':
          return { style: { backgroundColor: '#3B82F6', color: 'white' } }; // blue
        case 'unavailable':
          return { style: { backgroundColor: '#6B7280', color: 'white' } }; // gray
        default:
          return { style: { backgroundColor: '#F59E0B', color: 'white' } }; // amber
      }
    } else {
      // Schedule events
      return { style: { backgroundColor: '#8B5CF6', color: 'white' } }; // purple
    }
  };

  // Handle view change
  const handleViewChange = (view: View) => {
    setCurrentView(view);
  };

  // Handle date navigation
  const handleNavigate = (date: Date) => {
    setCurrentDate(date);
    onNavigate?.(date);
  };

  // Handle slot selection (for adding new availability)
  const handleSelectSlot = (slotInfo: any) => {
    const { start, end } = slotInfo;
    
    // Find overlapping availability slots
    const overlappingSlots = availability.filter(slot => {
      const slotStart = safeParseDate(slot.startTime);
      const slotEnd = safeParseDate(slot.endTime);
      if (!slotStart || !slotEnd) return false;
      
      return (start < slotEnd && end > slotStart);
    });

    onSelectSlot?.({ start, end, slots: overlappingSlots });
  };

  // Handle event selection
  const handleSelectEvent = (event: CalendarEvent) => {
    onSelectEvent?.(event);
  };

  // Custom event component
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const { type, slot, user } = event.resource;
    
    return (
      <div className="text-xs p-1">
        <div className="font-medium truncate">
          {type === 'availability' ? '👤' : '📅'} {event.title}
        </div>
        {type === 'availability' && (slot as AvailabilitySlot).confidence && (
          <div className="opacity-75">
            {Math.round((slot as AvailabilitySlot).confidence * 100)}% confidence
          </div>
        )}
      </div>
    );
  };

  // Custom day cell component to de-emphasize past dates
  const DayCellWrapper = ({ children, value }: { children: React.ReactNode; value: Date }) => {
    const today = new Date();
    const isPast = value < today.setHours(0, 0, 0, 0);
    
    return (
      <div className={`h-full ${isPast ? 'opacity-40' : ''}`}>
        {children}
      </div>
    );
  };

  // Custom time slot component for week view
  const TimeSlotWrapper = ({ children, value }: { children: React.ReactNode; value: Date }) => {
    const today = new Date();
    const isPast = value < today;
    
    return (
      <div className={`h-full ${isPast ? 'opacity-30' : ''}`}>
        {children}
      </div>
    );
  };

  return (
    <div className="w-full">

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '700px', minHeight: '700px' }}
          view={currentView}
          date={currentDate}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          popup
          eventPropGetter={getEventStyle}
          components={{
            event: EventComponent,
            dateCellWrapper: DayCellWrapper,
            timeSlotWrapper: TimeSlotWrapper
          }}
          messages={{
            next: 'Next',
            previous: 'Previous',
            today: 'Today',
            month: 'Month',
            week: 'Week',
            day: 'Day',
            agenda: 'Agenda',
            date: 'Date',
            time: 'Time',
            event: 'Event',
            noEventsInRange: 'No events in this range',
            showMore: (total) => `+${total} more`
          }}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#10B981' }}></div>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#EF4444' }}></div>
          <span>Busy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
          <span>Preferred</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#6B7280' }}></div>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
          <span>Scheduled</span>
        </div>
      </div>
    </div>
  );
}
