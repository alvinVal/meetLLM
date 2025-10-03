import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, validateConfig, getLLMProviderInfo } from './config';
import { MessageParseRequest, MessageParseResponse, AvailabilitySlot } from '@/types';

// Initialize Gemini AI
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient() {
  if (!genAI) {
    validateConfig();
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

// Main function that routes to the appropriate LLM provider
export async function parseAvailabilityFromMessage(
  request: MessageParseRequest
): Promise<MessageParseResponse> {
  // Only use Gemini for now
  return parseAvailabilityFromMessageGemini(request);
}

// Gemini-specific implementation
async function parseAvailabilityFromMessageGemini(
  request: MessageParseRequest
): Promise<MessageParseResponse> {
  try {
    const client = getGeminiClient();
    const model = client.getGenerativeModel({ model: config.gemini.model });

    const currentDate = request.context?.currentDate || new Date();
    const timezone = request.context?.timezone || 'UTC';

    const prompt = `
You are an AI assistant that extracts availability information from natural language messages. 
Analyze the following message and extract any time-related availability information.

Current context:
- Current date/time: ${currentDate.toISOString()}
- Timezone: ${timezone}
- User name: ${request.userName}

Message to analyze:
"${request.message}"

Please extract availability information and return a JSON response with the following structure:
{
  "availability": [
    {
      "startTime": "ISO 8601 datetime string",
      "endTime": "ISO 8601 datetime string", 
      "type": "available" | "busy" | "preferred" | "unavailable",
      "confidence": 0.0-1.0,
      "originalText": "the specific part of the message this was extracted from",
      "notes": "any additional context or assumptions made"
    }
  ],
  "confidence": 0.0-1.0,
  "summary": "brief summary of what was extracted",
  "errors": ["any parsing errors or ambiguities"]
}

Rules:
1. Extract specific time ranges when mentioned (e.g., "I'm free from 2-4 PM tomorrow")
2. Interpret relative dates (today, tomorrow, next week, etc.) based on current date
3. Handle different time formats (12hr, 24hr, casual like "morning", "afternoon")
4. Identify availability types:
   - "available"/"free" = available
   - "busy"/"meeting"/"occupied" = busy  
   - "prefer"/"would like" = preferred
   - "can't"/"unavailable" = unavailable
5. Set confidence based on how explicit the time information is
6. If no clear availability is mentioned, return empty availability array
7. Handle recurring patterns (daily, weekly, etc.) by creating multiple slots
8. Make reasonable assumptions about duration if end time isn't specified
9. Only return valid JSON, no additional text

Examples of what to extract:
- "I'm free tomorrow from 2-4 PM" → available slot
- "I have a meeting at 10 AM" → busy slot  
- "I prefer mornings" → preferred slot for morning hours
- "I can't do Fridays" → unavailable for Fridays
- "Available all day Monday" → available slot for full Monday
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let parsedResponse: any;
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsedResponse = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', text);
      return {
        availability: [],
        confidence: 0,
        summary: 'Failed to parse availability information',
        errors: ['Could not parse AI response']
      };
    }

    // Transform the response to match our types
    const availability: AvailabilitySlot[] = (parsedResponse.availability || []).map((slot: any, index: number) => ({
      id: crypto.randomUUID(),
      userId: '', // Will be set by caller
      userName: request.userName,
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      type: slot.type || 'available',
      confidence: slot.confidence || 0.5,
      originalText: slot.originalText || request.message,
      notes: slot.notes
    }));

    return {
      availability,
      confidence: parsedResponse.confidence || 0.5,
      summary: parsedResponse.summary || 'Extracted availability information',
      errors: parsedResponse.errors || []
    };

  } catch (error) {
    console.error('Error parsing message with Gemini:', error);
    return {
      availability: [],
      confidence: 0,
      summary: 'Error processing message',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

// Helper function to validate availability slots
export function validateAvailabilitySlots(slots: AvailabilitySlot[]): string[] {
  const errors: string[] = [];
  
  slots.forEach((slot, index) => {
    if (slot.startTime >= slot.endTime) {
      errors.push(`Slot ${index + 1}: Start time must be before end time`);
    }
    
    if (slot.confidence < 0 || slot.confidence > 1) {
      errors.push(`Slot ${index + 1}: Confidence must be between 0 and 1`);
    }
    
    if (!['available', 'busy', 'preferred', 'unavailable'].includes(slot.type)) {
      errors.push(`Slot ${index + 1}: Invalid availability type`);
    }
  });
  
  return errors;
}
