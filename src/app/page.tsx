'use client';

import { useState, useMemo } from 'react';
import MessageInput from '@/components/MessageInput';
import CalendarView from '@/components/CalendarView';
import LLMStatus from '@/components/LLMStatus';
import ParsedTimeBlocks from '@/components/ParsedTimeBlocks';
import TeamMemberPopup from '@/components/TeamMemberPopup';
import { useUsers } from '@/hooks/useUsers';
import { useMessages } from '@/hooks/useMessages';
import { useMeetings } from '@/hooks/useMeetings';
import { AvailabilitySlot, User } from '@/types';

export default function Home() {
  const { users, addUser, deleteUser } = useUsers();
  const {
    messages,
    availability,
    isProcessing,
    loading: messagesLoading,
    error: messagesError,
    addMessage,
    processMessage,
    deleteMessage,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    clearUserAvailability
  } = useMessages();
  const { meetings, createMeeting } = useMeetings();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [meetingDuration, setMeetingDuration] = useState(60); // in minutes
  const [latestParsedBlocks, setLatestParsedBlocks] = useState<AvailabilitySlot[]>([]);
  const [selectedTeamMember, setSelectedTeamMember] = useState<User | null>(null);
  const [showTeamMemberPopup, setShowTeamMemberPopup] = useState(false);

  // Convert meetings to schedule slots for calendar display
  const scheduleSlots = useMemo(() => {
    return meetings.map(meeting => ({
      id: meeting.id,
      startTime: meeting.startTime instanceof Date ? meeting.startTime : new Date(meeting.startTime),
      endTime: meeting.endTime instanceof Date ? meeting.endTime : new Date(meeting.endTime),
      type: 'meeting' as const,
      isBlocked: true,
      assignedUsers: meeting.participants?.map((p: any) => p.userId) || [],
    }));
  }, [meetings]);

  // Algorithm to find optimal meeting times
  const suggestedMeetingTimes = useMemo(() => {
    if (users.length < 2) return [];

    const suggestions: Array<{
      startTime: Date;
      endTime: Date;
      availableUsers: string[];
      score: number;
      reason: string;
    }> = [];

    // Get all available time slots
    const availableSlots = availability.filter(slot => slot.type === 'available' || slot.type === 'preferred');
    
    // Group by overlapping time ranges
    const timeGroups = new Map<string, AvailabilitySlot[]>();

    availableSlots.forEach(slot => {
      // Ensure dates are Date objects
      const startTime = slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime);
      const endTime = slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime);
      
      // Create a more flexible grouping key based on date and hour ranges
      const dateKey = startTime.toISOString().split('T')[0];
      const startHour = startTime.getHours();
      const endHour = endTime.getHours();
      
      // Group by date and hour ranges (e.g., morning, afternoon, evening)
      let timeRange = '';
      if (startHour >= 6 && endHour <= 12) timeRange = 'morning';
      else if (startHour >= 12 && endHour <= 18) timeRange = 'afternoon';
      else if (startHour >= 18 && endHour <= 23) timeRange = 'evening';
      else timeRange = 'other';
      
      const key = `${dateKey}-${timeRange}`;
      if (!timeGroups.has(key)) {
        timeGroups.set(key, []);
      }
      timeGroups.get(key)!.push(slot);
    });

    // Find overlapping time slots
    timeGroups.forEach((slots, key) => {
      if (slots.length >= 2) {
        const uniqueUsers = new Set(slots.map(slot => slot.userId));
        if (uniqueUsers.size >= 2) {
          // Find the intersection of all time slots
          const startTime = new Date(Math.max(...slots.map(slot => {
            const slotStart = slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime);
            return slotStart.getTime();
          })));
          const endTime = new Date(Math.min(...slots.map(slot => {
            const slotEnd = slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime);
            return slotEnd.getTime();
          })));

          // Check if there's enough time for the meeting
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = durationMs / (1000 * 60);

          if (durationMinutes >= meetingDuration) {
            const score = uniqueUsers.size * 10 + (slots.filter(s => s.type === 'preferred').length * 5);
            const reason = `${uniqueUsers.size} users available${slots.some(s => s.type === 'preferred') ? ' (some preferred)' : ''}`;

            suggestions.push({
              startTime,
              endTime: new Date(startTime.getTime() + meetingDuration * 60 * 1000),
              availableUsers: Array.from(uniqueUsers),
              score,
              reason
            });
          }
        }
      }
    });

    // If no suggestions found with the grouping approach, try a more flexible approach
    if (suggestions.length === 0 && availableSlots.length >= 2) {
      // Find any two slots that have any overlap
      for (let i = 0; i < availableSlots.length; i++) {
        for (let j = i + 1; j < availableSlots.length; j++) {
          const slot1 = availableSlots[i];
          const slot2 = availableSlots[j];
          
          if (slot1.userId !== slot2.userId) {
            const start1 = slot1.startTime instanceof Date ? slot1.startTime : new Date(slot1.startTime);
            const end1 = slot1.endTime instanceof Date ? slot1.endTime : new Date(slot1.endTime);
            const start2 = slot2.startTime instanceof Date ? slot2.startTime : new Date(slot2.startTime);
            const end2 = slot2.endTime instanceof Date ? slot2.endTime : new Date(slot2.endTime);
            
            // Check if slots overlap
            if (start1 < end2 && start2 < end1) {
              const overlapStart = new Date(Math.max(start1.getTime(), start2.getTime()));
              const overlapEnd = new Date(Math.min(end1.getTime(), end2.getTime()));
              const overlapDuration = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60);
              
              if (overlapDuration >= meetingDuration) {
                const score = 2 * 10 + ((slot1.type === 'preferred' ? 1 : 0) + (slot2.type === 'preferred' ? 1 : 0)) * 5;
                const reason = `2 users available${slot1.type === 'preferred' || slot2.type === 'preferred' ? ' (some preferred)' : ''}`;
                
                suggestions.push({
                  startTime: overlapStart,
                  endTime: new Date(overlapStart.getTime() + meetingDuration * 60 * 1000),
                  availableUsers: [slot1.userId, slot2.userId],
                  score,
                  reason
                });
              }
            }
          }
        }
      }
    }

    return suggestions.sort((a, b) => b.score - a.score).slice(0, 5); // Top 5 suggestions
  }, [availability, users, meetingDuration]);

  const handleSendMessage = async (userId: string, userName: string, message: string) => {
    const newMessage = await addMessage(userId, userName, message, true);
    // Update latest parsed blocks with the new message's extracted availability
    if (newMessage.extractedAvailability) {
      setLatestParsedBlocks(newMessage.extractedAvailability);
    }
  };

  const handleReprocessMessage = async (messageId: string) => {
    try {
      await processMessage(messageId);
    } catch (error) {
      console.error('Failed to reprocess message:', error);
      alert('Failed to reprocess message. Please check your Gemini API key.');
    }
  };

  const handleCreateMeeting = async (suggestion: typeof suggestedMeetingTimes[0]) => {
    try {
      // Get user names for the meeting title
      const userNames = suggestion.availableUsers
        .map(userId => users.find(u => u.id === userId)?.name || 'Unknown')
        .join(', ');

      const meetingData = {
        title: `Meeting with ${userNames}`,
        description: `Scheduled meeting for ${userNames}. ${suggestion.reason}`,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        location: 'TBD',
        userIds: suggestion.availableUsers,
      };

      await createMeeting(meetingData);
      alert(`Meeting created successfully for ${suggestion.startTime.toLocaleDateString()} at ${suggestion.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      alert('Failed to create meeting. Please try again.');
    }
  };

  const handleClearUserAvailability = async (userId: string, userName: string) => {
    if (confirm(`Are you sure you want to clear all availability slots for ${userName}?`)) {
      try {
        await clearUserAvailability(userId);
        alert(`All availability slots cleared for ${userName}`);
      } catch (error) {
        console.error('Failed to clear user availability:', error);
        alert('Failed to clear user availability. Please try again.');
      }
    }
  };

  const handleDeleteParsedBlock = async (blockId: string) => {
    try {
      await deleteAvailabilitySlot(blockId);
      setLatestParsedBlocks(prev => prev.filter(block => block.id !== blockId));
    } catch (error) {
      console.error('Failed to delete parsed block:', error);
      alert('Failed to delete time block. Please try again.');
    }
  };

  const handleTeamMemberClick = (user: User) => {
    setSelectedTeamMember(user);
    setShowTeamMemberPopup(true);
  };

  const handleCloseTeamMemberPopup = () => {
    setShowTeamMemberPopup(false);
    setSelectedTeamMember(null);
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      // Clear all availability slots for the user first
      await clearUserAvailability(userId);
      // Delete the user
      await deleteUser(userId);
      alert('User deleted successfully');
    } catch (error) {
      console.error('Failed to delete user:', error);
      alert('Failed to delete user. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="4" y="3" width="16" height="14" rx="2" fill="white"/>
                  <rect x="4" y="3" width="16" height="3" fill="#E5E7EB"/>
                  <line x1="6" y1="4.5" x2="6" y2="5.5" stroke="#6B7280" strokeWidth="0.5"/>
                  <line x1="18" y1="4.5" x2="18" y2="5.5" stroke="#6B7280" strokeWidth="0.5"/>
                  <circle cx="7" cy="9" r="1" fill="#3B82F6"/>
                  <circle cx="12" cy="9" r="1" fill="#10B981"/>
                  <circle cx="17" cy="9" r="1" fill="#F59E0B"/>
                  <line x1="5" y1="11" x2="19" y2="11" stroke="#6B7280" strokeWidth="0.5"/>
                  <line x1="5" y1="13" x2="19" y2="13" stroke="#6B7280" strokeWidth="0.5"/>
                  <path d="M20 1L21 3L23 4L21 5L20 7L19 5L17 4L19 3L20 1Z" fill="#FBBF24"/>
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">meetLLM</h1>
                <p className="text-sm text-gray-600">Talk to me and find out when to meet</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                {users.length} team members • {availability.length} availability slots
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Error Display */}
          {messagesError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error loading availability data</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{messagesError}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="xl:col-span-3">
            <div className="space-y-6">
              {/* Message Input */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Add Availability</h2>
                <MessageInput
                  users={users}
                  onAddUser={addUser}
                  onSendMessage={handleSendMessage}
                  isProcessing={isProcessing}
                />
              </div>

              {/* Parsed Time Blocks */}
              <ParsedTimeBlocks
                timeBlocks={latestParsedBlocks}
                users={users}
                onDeleteBlock={handleDeleteParsedBlock}
                isProcessing={isProcessing}
              />

              {/* Calendar View */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <CalendarView
                  availability={availability}
                  schedule={scheduleSlots}
                  users={users}
                  onNavigate={(date) => setSelectedDate(date)}
                  onSelectSlot={(slotInfo) => {
                    console.log('Selected slot:', slotInfo);
                  }}
                  onSelectEvent={(event) => {
                    console.log('Selected event:', event);
                  }}
                />
              </div>
            </div>

            {/* Meeting Suggestions - Separate from calendar */}
            {suggestedMeetingTimes.length > 0 && (
              <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Suggested Meeting Times</h2>
                <div className="space-y-3">
                  {suggestedMeetingTimes.map((suggestion, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-lg">
                              {suggestion.startTime.toLocaleDateString()} at {suggestion.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({meetingDuration} min)
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Available users:</span>
                            <div className="flex gap-1">
                              {suggestion.availableUsers.map(userId => {
                                const user = users.find(u => u.id === userId);
                                return user ? (
                                  <div key={userId} className="flex items-center gap-1">
                                    <div
                                      className="w-3 h-3 rounded-full"
                                      style={{ backgroundColor: user.color }}
                                    />
                                    <span className="text-sm">{user.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCreateMeeting(suggestion)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          Schedule Meeting
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No suggestions message */}
            {suggestedMeetingTimes.length === 0 && users.length >= 2 && (
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">No meeting times found</h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>No overlapping availability found for the selected meeting duration. Try:</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>Adding more availability messages from users</li>
                        <li>Reducing the meeting duration</li>
                        <li>Checking if users have conflicting schedules</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

        </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* LLM Status */}
            <LLMStatus />

                {/* Users */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Team Members ({users.length})</h3>
                  {users.length === 0 ? (
                    <p className="text-sm text-gray-500">No team members yet. Add a message to create users.</p>
                  ) : (
                    <div className="space-y-2">
                      {users.map((user) => {
                        const userSlots = availability.filter(a => a.userId === user.id);
                        return (
                          <div 
                            key={user.id} 
                            onClick={() => handleTeamMemberClick(user)}
                            className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                          >
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: user.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600">{user.name}</span>
                              <div className="text-xs text-gray-500">
                                {userSlots.length} availability slot{userSlots.length !== 1 ? 's' : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {userSlots.length > 0 && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleClearUserAvailability(user.id, user.name);
                                  }}
                                  className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                  title={`Clear all availability for ${user.name}`}
                                >
                                  Clear
                                </button>
                              )}
                              <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

            {/* Meeting Settings */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Meeting Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Meeting Duration
                  </label>
                  <select
                    value={meetingDuration}
                    onChange={(e) => setMeetingDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={90}>1.5 hours</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Availability Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Availability Overview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Users:</span>
                  <span className="font-medium">{users.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Messages:</span>
                  <span className="font-medium">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Availability Slots:</span>
                  <span className="font-medium">{availability.length}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-600">Available:</span>
                  <span className="font-medium text-green-600">
                    {availability.filter(a => a.type === 'available').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Busy:</span>
                  <span className="font-medium text-red-600">
                    {availability.filter(a => a.type === 'busy').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preferred:</span>
                  <span className="font-medium text-blue-600">
                    {availability.filter(a => a.type === 'preferred').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Suggestions:</span>
                  <span className="font-medium text-purple-600">
                    {suggestedMeetingTimes.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Tips */}
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">Quick Tips</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Send messages like "I'm free Tuesday morning"</p>
                <p>• Use "prefer" for preferred times</p>
                <p>• Mention specific times for accuracy</p>
                <p>• Add constraints like "except Wednesdays"</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Member Popup */}
      {selectedTeamMember && (
        <TeamMemberPopup
          user={selectedTeamMember}
          userSlots={availability.filter(a => a.userId === selectedTeamMember.id)}
          isOpen={showTeamMemberPopup}
          onClose={handleCloseTeamMemberPopup}
          onDeleteUser={handleDeleteUser}
          onDeleteSlot={deleteAvailabilitySlot}
          onClearAllSlots={clearUserAvailability}
        />
      )}
    </div>
  );
}