import { NextRequest, NextResponse } from 'next/server';
import { 
  createMeeting, 
  getAllMeetings,
  getMeetingsByDateRange 
} from '@/lib/database';
import { CreateMeetingInput } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let meetings;

    if (startDate && endDate) {
      meetings = await getMeetingsByDateRange(
        new Date(startDate),
        new Date(endDate)
      );
    } else {
      meetings = await getAllMeetings();
    }

    return NextResponse.json(meetings);
  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: CreateMeetingInput = await request.json();
    const meeting = await createMeeting(data);
    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create meeting' },
      { status: 500 }
    );
  }
}
