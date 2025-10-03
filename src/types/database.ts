// Database types that extend Prisma types with additional fields for the UI

export interface DatabaseUser {
  id: string;
  name: string;
  email?: string;
  color: string;
  availabilityText?: string;
  createdAt: Date;
  updatedAt: Date;
  timeSlots: DatabaseTimeSlot[];
  meetingParticipants: DatabaseMeetingParticipant[];
}

export interface DatabaseTimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  recurring: boolean;
  type: 'available' | 'busy' | 'preferred' | 'unavailable';
  confidence: number;
  originalText?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user?: DatabaseUser;
}

export interface DatabaseMeeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  participants: DatabaseMeetingParticipant[];
}

export interface DatabaseMeetingParticipant {
  id: string;
  meetingId: string;
  userId: string;
  createdAt: Date;
  meeting?: DatabaseMeeting;
  user?: DatabaseUser;
}

// Input types for creating/updating records
export interface CreateUserInput {
  name: string;
  email?: string;
  color?: string;
  availabilityText?: string;
}

export interface CreateTimeSlotInput {
  userId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  recurring?: boolean;
  type?: 'available' | 'busy' | 'preferred' | 'unavailable';
  confidence?: number;
  originalText?: string;
  notes?: string;
}

export interface CreateMeetingInput {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  userIds: string[];
}

// Response types for API endpoints
export interface UserWithAvailability extends DatabaseUser {
  timeSlots: DatabaseTimeSlot[];
}

export interface MeetingWithParticipants extends DatabaseMeeting {
  participants: DatabaseMeetingParticipant[];
}

// Query types
export interface DateRangeQuery {
  startDate: Date;
  endDate: Date;
}

export interface UserAvailabilityQuery extends DateRangeQuery {
  userId: string;
}

export interface MeetingConflictQuery extends DateRangeQuery {
  userIds: string[];
}
