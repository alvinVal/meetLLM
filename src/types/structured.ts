// Structured output schemas for better AI parsing reliability

export interface StructuredAvailabilitySlot {
  startTime: string; // ISO 8601 datetime string
  endTime: string;   // ISO 8601 datetime string
  type: 'available' | 'busy' | 'preferred' | 'unavailable';
  confidence: number; // 0.0 to 1.0
  originalText: string;
  notes?: string;
}

export interface StructuredParseResponse {
  availability: StructuredAvailabilitySlot[];
  confidence: number; // Overall confidence 0.0 to 1.0
  summary: string;
  errors: string[];
  metadata: {
    processingTime?: number;
    model?: string;
    provider?: string;
    structuredOutput: boolean;
    error?: boolean;
  };
}

// JSON Schema for structured output (for models that support it)
export const AVAILABILITY_SCHEMA = {
  type: "object",
  properties: {
    availability: {
      type: "array",
      items: {
        type: "object",
        properties: {
          startTime: {
            type: "string",
            format: "date-time",
            description: "ISO 8601 datetime string for when availability starts"
          },
          endTime: {
            type: "string", 
            format: "date-time",
            description: "ISO 8601 datetime string for when availability ends"
          },
          type: {
            type: "string",
            enum: ["available", "busy", "preferred", "unavailable"],
            description: "Type of availability"
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1,
            description: "Confidence level for this extraction (0.0 to 1.0)"
          },
          originalText: {
            type: "string",
            description: "The exact text from the message that this slot was extracted from"
          },
          notes: {
            type: "string",
            description: "Any additional context, assumptions, or clarifications"
          }
        },
        required: ["startTime", "endTime", "type", "confidence", "originalText"]
      }
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "Overall confidence in the entire parsing result"
    },
    summary: {
      type: "string",
      description: "Brief summary of what availability information was extracted"
    },
    errors: {
      type: "array",
      items: {
        type: "string"
      },
      description: "Any parsing errors, ambiguities, or warnings"
    }
  },
  required: ["availability", "confidence", "summary", "errors"]
};

// Validation functions
export function validateStructuredResponse(response: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!response || typeof response !== 'object') {
    return { valid: false, errors: ['Response must be an object'] };
  }

  // Check required fields
  if (!Array.isArray(response.availability)) {
    errors.push('availability must be an array');
  }
  
  if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
    errors.push('confidence must be a number between 0 and 1');
  }
  
  if (typeof response.summary !== 'string') {
    errors.push('summary must be a string');
  }
  
  if (!Array.isArray(response.errors)) {
    errors.push('errors must be an array');
  }

  // Validate availability slots
  if (Array.isArray(response.availability)) {
    response.availability.forEach((slot: any, index: number) => {
      if (!slot.startTime || !slot.endTime) {
        errors.push(`Slot ${index + 1}: Missing startTime or endTime`);
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
      
      if (typeof slot.confidence !== 'number' || slot.confidence < 0 || slot.confidence > 1) {
        errors.push(`Slot ${index + 1}: Invalid confidence value`);
      }
      
      if (!['available', 'busy', 'preferred', 'unavailable'].includes(slot.type)) {
        errors.push(`Slot ${index + 1}: Invalid availability type`);
      }
      
      if (typeof slot.originalText !== 'string') {
        errors.push(`Slot ${index + 1}: originalText must be a string`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
