export interface User {
  id: string;
  name: string;
  email?: string;
  color: string; // For UI display
  createdAt: Date;
}

export interface UserMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: Date;
  processed: boolean;
  extractedAvailability?: AvailabilitySlot[];
}

export interface AvailabilitySlot {
  id: string;
  userId: string;
  userName: string;
  startTime: Date;
  endTime: Date;
  type: 'available' | 'busy' | 'preferred' | 'unavailable';
  confidence: number; // 0-1, how confident the AI is about this extraction
  originalText: string; // The part of the message this was extracted from
  notes?: string;
}

export interface MessageParseRequest {
  message: string;
  userName: string;
  context?: {
    previousMessages?: UserMessage[];
    currentDate?: Date;
    timezone?: string;
  };
}

export interface MessageParseResponse {
  availability: AvailabilitySlot[];
  confidence: number;
  summary: string;
  errors?: string[];
}
