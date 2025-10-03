import { NextRequest, NextResponse } from 'next/server';
import { 
  createTimeSlot, 
  getTimeSlotsByDateRange,
  getTimeSlotsByUser,
  deleteTimeSlotsByUserId
} from '@/lib/database';
import { CreateTimeSlotInput } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let timeSlots;

    if (userId) {
      timeSlots = await getTimeSlotsByUser(userId);
    } else if (startDate && endDate) {
      timeSlots = await getTimeSlotsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      return NextResponse.json(
        { error: 'Either userId or date range must be provided' },
        { status: 400 }
      );
    }

    return NextResponse.json(timeSlots);
  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time slots' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateTimeSlotInput = await request.json();
    const timeSlot = await createTimeSlot(data);
    return NextResponse.json(timeSlot, { status: 201 });
  } catch (error) {
    console.error('Error creating time slot:', error);
    return NextResponse.json(
      { error: 'Failed to create time slot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await deleteTimeSlotsByUserId(userId);
    return NextResponse.json({ message: 'All time slots cleared for user' });
  } catch (error) {
    console.error('Error clearing time slots:', error);
    return NextResponse.json(
      { error: 'Failed to clear time slots' },
      { status: 500 }
    );
  }
}
