'use client';

import { useState, useCallback, useEffect } from 'react';
import { UserMessage, AvailabilitySlot, MessageParseRequest } from '@/types';
import { parseAvailabilityFromMessage } from '@/lib/llmService';

export function useMessages() {
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load availability from database
  const loadAvailability = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get time slots for the current week
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
      
      const response = await fetch(`/api/time-slots?startDate=${weekStart.toISOString()}&endDate=${weekEnd.toISOString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      const timeSlots = await response.json();
      
      // Convert database time slots to availability slots
      const availabilitySlots: AvailabilitySlot[] = timeSlots.map((slot: any) => ({
        id: slot.id,
        userId: slot.userId,
        userName: slot.user?.name || 'Unknown',
        startTime: new Date(slot.startTime),
        endTime: new Date(slot.endTime),
        type: slot.type,
        confidence: slot.confidence,
        originalText: slot.originalText || '',
        notes: slot.notes,
      }));
      
      setAvailability(availabilitySlots);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading availability:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load availability on mount
  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  // Add error boundary for debugging
  useEffect(() => {
    if (error) {
      console.error('useMessages error:', error);
    }
  }, [error]);

  const addMessage = useCallback(async (
    userId: string,
    userName: string,
    content: string,
    autoProcess: boolean = true
  ) => {
    const newMessage: UserMessage = {
      id: crypto.randomUUID(),
      userId,
      userName,
      content: content.trim(),
      timestamp: new Date(),
      processed: false,
      extractedAvailability: [],
    };

    // Add message to state first
    setMessages(prev => [...prev, newMessage]);

    if (autoProcess) {
      // Process the message directly without looking it up from state
      await processMessageDirect(newMessage);
    }

    return newMessage;
  }, []);

  const processMessage = useCallback(async (messageId: string) => {
    setIsProcessing(true);
    
    try {
      // Find the message from current state
      const messageToProcess = messages.find(m => m.id === messageId);

      if (!messageToProcess) {
        throw new Error('Message not found');
      }

      await processMessageDirect(messageToProcess);
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Mark message as processed even if failed
      setMessages(prev => prev.map(m => 
        m.id === messageId 
          ? { ...m, processed: true, extractedAvailability: [] }
          : m
      ));
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [messages]);

  const processMessageDirect = useCallback(async (message: UserMessage) => {
    setIsProcessing(true);
    
    try {
      const request: MessageParseRequest = {
        message: message.content,
        userName: message.userName,
        context: {
          previousMessages: messages.filter(m => m.userId === message.userId).slice(-5),
          currentDate: new Date(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };

      const response = await parseAvailabilityFromMessage(request);

      // Add user ID to extracted availability
      const extractedAvailability = response.availability.map(slot => ({
        ...slot,
        userId: message.userId,
      }));

      // Update the message
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, processed: true, extractedAvailability }
          : m
      ));

      // Save to database
      await saveAvailabilityToDatabase(extractedAvailability, message.userId);

      // Add to global availability
      setAvailability(prev => [...prev, ...extractedAvailability]);

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Mark message as processed even if failed
      setMessages(prev => prev.map(m => 
        m.id === message.id 
          ? { ...m, processed: true, extractedAvailability: [] }
          : m
      ));
      
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [messages]);

  const saveAvailabilityToDatabase = useCallback(async (slots: AvailabilitySlot[], userId: string) => {
    try {
      for (const slot of slots) {
        const timeSlotData = {
          userId,
          startTime: slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime),
          endTime: slot.endTime instanceof Date ? slot.endTime : new Date(slot.endTime),
          dayOfWeek: (slot.startTime instanceof Date ? slot.startTime : new Date(slot.startTime)).getDay(),
          recurring: false, // Could be enhanced to detect recurring patterns
          type: slot.type,
          confidence: slot.confidence,
          originalText: slot.originalText,
          notes: slot.notes,
        };

        await fetch('/api/time-slots', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(timeSlotData),
        });
      }
    } catch (error) {
      console.error('Error saving availability to database:', error);
    }
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message?.extractedAvailability) {
      // Remove associated availability slots
      setAvailability(prev => prev.filter(slot => 
        !message.extractedAvailability?.some(extractedSlot => extractedSlot.id === slot.id)
      ));
    }
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, [messages]);

  const updateAvailabilitySlot = useCallback(async (updatedSlot: AvailabilitySlot) => {
    try {
      // Update in database
      await fetch(`/api/time-slots/${updatedSlot.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: updatedSlot.type,
          confidence: updatedSlot.confidence,
          notes: updatedSlot.notes,
        }),
      });

      // Update in state
      setAvailability(prev => prev.map(slot => 
        slot.id === updatedSlot.id ? updatedSlot : slot
      ));
    } catch (error) {
      console.error('Error updating availability slot:', error);
    }
  }, []);

  const deleteAvailabilitySlot = useCallback(async (slotId: string) => {
    try {
      // Delete from database
      await fetch(`/api/time-slots/${slotId}`, {
        method: 'DELETE',
      });

      // Remove from state
      setAvailability(prev => prev.filter(slot => slot.id !== slotId));
    } catch (error) {
      console.error('Error deleting availability slot:', error);
    }
  }, []);

  const clearUserAvailability = useCallback(async (userId: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/time-slots?userId=${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear user availability');
      }

      setAvailability((prev) => prev.filter((slot) => slot.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error clearing user availability:', err);
      throw err;
    }
  }, []);

  const refreshAvailability = useCallback(() => {
    loadAvailability();
  }, [loadAvailability]);

  return {
    messages,
    availability,
    isProcessing,
    loading,
    error,
    addMessage,
    processMessage,
    deleteMessage,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    clearUserAvailability,
    refreshAvailability,
  };
}