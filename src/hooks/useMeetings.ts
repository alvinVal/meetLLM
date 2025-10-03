'use client';

import { useState, useCallback, useEffect } from 'react';
import { Meeting } from '@/types';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load meetings from database
  const loadMeetings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/meetings');
      if (!response.ok) {
        throw new Error('Failed to fetch meetings');
      }
      const data = await response.json();
      setMeetings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load meetings on mount
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  const createMeeting = useCallback(async (meetingData: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    userIds: string[];
  }) => {
    try {
      setError(null);
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        throw new Error('Failed to create meeting');
      }

      const newMeeting = await response.json();
      setMeetings(prev => [...prev, newMeeting]);
      return newMeeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error creating meeting:', err);
      throw err;
    }
  }, []);

  const updateMeeting = useCallback(async (meetingId: string, updates: Partial<Meeting>) => {
    try {
      setError(null);
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update meeting');
      }

      const updatedMeeting = await response.json();
      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId ? updatedMeeting : meeting
      ));
      return updatedMeeting;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error updating meeting:', err);
      throw err;
    }
  }, []);

  const deleteMeeting = useCallback(async (meetingId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }

      setMeetings(prev => prev.filter(meeting => meeting.id !== meetingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error deleting meeting:', err);
      throw err;
    }
  }, []);

  const getMeetingById = useCallback((meetingId: string) => {
    return meetings.find(meeting => meeting.id === meetingId);
  }, [meetings]);

  const refreshMeetings = useCallback(() => {
    loadMeetings();
  }, [loadMeetings]);

  return {
    meetings,
    loading,
    error,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    getMeetingById,
    refreshMeetings,
  };
}
