import { MessageParseRequest, MessageParseResponse } from '@/types';
import { StructuredParseResponse } from '@/types/structured';

// Client-side service that calls our API routes
export async function parseAvailabilityFromMessage(
  request: MessageParseRequest,
  useStructured: boolean = false
): Promise<MessageParseResponse> {
  try {
    const endpoint = useStructured ? '/api/llm/parse-structured' : '/api/llm/parse-message';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    // Convert structured response to regular response format if needed
    if (useStructured) {
      const structuredResult = result as StructuredParseResponse;
      return {
        availability: structuredResult.availability.map(slot => ({
          id: crypto.randomUUID(),
          userId: '', // Will be set by caller
          userName: request.userName,
          startTime: new Date(slot.startTime),
          endTime: new Date(slot.endTime),
          type: slot.type,
          confidence: slot.confidence,
          originalText: slot.originalText,
          notes: slot.notes
        })),
        confidence: structuredResult.confidence,
        summary: structuredResult.summary,
        errors: structuredResult.errors
      };
    }
    
    return result as MessageParseResponse;
  } catch (error) {
    console.error('Error calling parse-message API:', error);
    return {
      availability: [],
      confidence: 0,
      summary: 'Failed to process message',
      errors: [error instanceof Error ? error.message : 'Network error']
    };
  }
}

// Get current LLM status
export async function getLLMStatus() {
  try {
    const response = await fetch('/api/llm/status');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting LLM status:', error);
    return {
      provider: 'unknown',
      model: 'unknown',
      isLocal: false,
      available: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

// Helper to validate availability slots
export function validateAvailabilitySlots(slots: any[]): string[] {
  const errors: string[] = [];
  
  slots.forEach((slot, index) => {
    if (!slot.startTime || !slot.endTime) {
      errors.push(`Slot ${index + 1}: Missing start or end time`);
      return;
    }
    
    const startTime = new Date(slot.startTime);
    const endTime = new Date(slot.endTime);
    
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      errors.push(`Slot ${index + 1}: Invalid date format`);
      return;
    }
    
    if (startTime >= endTime) {
      errors.push(`Slot ${index + 1}: Start time must be before end time`);
    }
    
    if (slot.confidence !== undefined && (slot.confidence < 0 || slot.confidence > 1)) {
      errors.push(`Slot ${index + 1}: Confidence must be between 0 and 1`);
    }
    
    if (slot.type && !['available', 'busy', 'preferred', 'unavailable'].includes(slot.type)) {
      errors.push(`Slot ${index + 1}: Invalid availability type`);
    }
  });
  
  return errors;
}
