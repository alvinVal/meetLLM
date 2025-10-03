import { db } from './db';
import { User, TimeSlot, Meeting, MeetingParticipant } from '@prisma/client';

// User operations
export async function createUser(data: {
  name: string;
  email?: string;
  color?: string;
  availabilityText?: string;
}): Promise<User> {
  return await db.user.create({
    data: {
      name: data.name,
      email: data.email,
      color: data.color || '#6B7280',
      availabilityText: data.availabilityText,
    },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return await db.user.findUnique({
    where: { id },
    include: {
      timeSlots: true,
      meetingParticipants: {
        include: {
          meeting: true,
        },
      },
    },
  });
}

export async function getAllUsers(): Promise<User[]> {
  return await db.user.findMany({
    include: {
      timeSlots: true,
      meetingParticipants: {
        include: {
          meeting: true,
        },
      },
    },
  });
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return await db.user.update({
    where: { id },
    data,
  });
}

export async function deleteUser(id: string): Promise<void> {
  await db.user.delete({
    where: { id },
  });
}

// TimeSlot operations
export async function createTimeSlot(data: {
  userId: string;
  startTime: Date;
  endTime: Date;
  dayOfWeek: number;
  recurring?: boolean;
  type?: string;
  confidence?: number;
  originalText?: string;
  notes?: string;
}): Promise<TimeSlot> {
  return await db.timeSlot.create({
    data: {
      userId: data.userId,
      startTime: data.startTime,
      endTime: data.endTime,
      dayOfWeek: data.dayOfWeek,
      recurring: data.recurring || false,
      type: data.type || 'available',
      confidence: data.confidence || 0.5,
      originalText: data.originalText,
      notes: data.notes,
    },
  });
}

export async function getTimeSlotsByUser(userId: string): Promise<TimeSlot[]> {
  return await db.timeSlot.findMany({
    where: { userId },
    orderBy: { startTime: 'asc' },
  });
}

export async function getTimeSlotsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<TimeSlot[]> {
  return await db.timeSlot.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: true,
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function updateTimeSlot(id: string, data: Partial<TimeSlot>): Promise<TimeSlot> {
  return await db.timeSlot.update({
    where: { id },
    data,
  });
}

export async function deleteTimeSlot(id: string): Promise<void> {
  try {
    await db.timeSlot.delete({
      where: { id },
    });
  } catch (error: any) {
    // If the record doesn't exist, that's fine - it's already deleted
    if (error.code === 'P2025') {
      console.log(`Time slot ${id} was already deleted or doesn't exist`);
      return;
    }
    throw error;
  }
}

export async function deleteTimeSlotsByUserId(userId: string): Promise<void> {
  await db.timeSlot.deleteMany({
    where: { userId },
  });
}

// Meeting operations
export async function createMeeting(data: {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  userIds: string[];
}): Promise<Meeting> {
  return await db.meeting.create({
    data: {
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      location: data.location,
      participants: {
        create: data.userIds.map(userId => ({
          userId,
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function getMeetingById(id: string): Promise<Meeting | null> {
  return await db.meeting.findUnique({
    where: { id },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function getAllMeetings(): Promise<Meeting[]> {
  return await db.meeting.findMany({
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getMeetingsByDateRange(
  startDate: Date,
  endDate: Date
): Promise<Meeting[]> {
  return await db.meeting.findMany({
    where: {
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function updateMeeting(id: string, data: Partial<Meeting>): Promise<Meeting> {
  return await db.meeting.update({
    where: { id },
    data,
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
}

export async function deleteMeeting(id: string): Promise<void> {
  await db.meeting.delete({
    where: { id },
  });
}

// Utility functions
export async function getUserAvailability(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<TimeSlot[]> {
  return await db.timeSlot.findMany({
    where: {
      userId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { startTime: 'asc' },
  });
}

export async function getConflictingMeetings(
  startTime: Date,
  endTime: Date,
  userIds: string[]
): Promise<Meeting[]> {
  return await db.meeting.findMany({
    where: {
      status: 'scheduled',
      OR: [
        {
          startTime: {
            lt: endTime,
            gte: startTime,
          },
        },
        {
          endTime: {
            gt: startTime,
            lte: endTime,
          },
        },
      ],
      participants: {
        some: {
          userId: {
            in: userIds,
          },
        },
      },
    },
    include: {
      participants: {
        include: {
          user: true,
        },
      },
    },
  });
}

