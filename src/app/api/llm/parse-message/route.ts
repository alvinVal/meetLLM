import { NextRequest, NextResponse } from 'next/server';
import { Ollama } from 'ollama';
import { GoogleGenAI } from '@google/genai';
import { config, validateConfig, getLLMProviderInfo } from '@/lib/config';
import { MessageParseRequest, MessageParseResponse, AvailabilitySlot } from '@/types';

// Initialize clients
let ollamaClient: Ollama | null = null;
let genAI: GoogleGenAI | null = null;

function getOllamaClient() {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: config.ollama.baseUrl });
  }
  return ollamaClient;
}

function getGeminiClient() {
  if (!genAI) {
    genAI = new GoogleGenAI({
      apiKey: config.gemini.apiKey
    });
  }
  return genAI;
}

async function parseWithOllama(request: MessageParseRequest): Promise<MessageParseResponse> {
  const client = getOllamaClient();
  const currentDate = request.context?.currentDate ? new Date(request.context.currentDate) : new Date();
  const timezone = request.context?.timezone || 'UTC';

  // Get week context
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentWeekDayName = weekDays[currentDate.getDay()];

  const prompt = `You are an AI assistant that extracts availability information from natural language messages. 
Analyze the following message and extract any time-related availability information.

Current context:
- Current date/time: ${currentDate}
- Current day: ${currentWeekDayName}
- Timezone: ${timezone}
- User name: ${request.userName}
- Week context: ${weekStart.toDateString()} to ${weekEnd.toDateString()}
- Available days this week: ${weekDays.join(', ')}

Message to analyze:
"${request.message}"

Please extract availability information and return ONLY a JSON response with the following structure:
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
9. Return ONLY valid JSON, no additional text or explanations

Examples:
- "I'm free tomorrow from 2-4 PM" → available slot for tomorrow 2-4 PM
- "I have a meeting at 10 AM" → busy slot at 10 AM (assume 1 hour duration)
- "I prefer mornings" → preferred slot for morning hours (9-12 PM)
- "I can't do Fridays" → unavailable for Fridays
- "Available all day Monday" → available slot for full Monday (9 AM - 5 PM)

Return only the JSON object, nothing else.`;

  const response = await client.chat({
    model: config.ollama.model,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  });

  return parseAIResponse(response.message.content, request);
}

async function parseWithGemini(request: MessageParseRequest): Promise<MessageParseResponse> {
  const client = getGeminiClient();

  const currentDate = request.context?.currentDate ? 
    (typeof request.context.currentDate === 'string' ? new Date(request.context.currentDate) : request.context.currentDate) : 
    new Date();
  const timezone = request.context?.timezone || 'UTC';

  const prompt = `You are an AI assistant that extracts availability information from natural language messages. 
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
- "Available all day Monday" → available slot for full Monday`;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt
    });

    const text = response.text || '';
    return parseAIResponse(text, request);
  } catch (error) {
    console.error('Gemini parsing error:', error);
    return {
      availability: [],
      confidence: 0,
      summary: 'Error processing message',
      errors: [(error as Error).message],
    };
  }
}

function parseAIResponse(text: string, request: MessageParseRequest): MessageParseResponse {
  let parsedResponse: any;
  try {
    // Clean the response text to extract JSON - handle markdown code blocks
    let jsonText = text;
    
    // Remove markdown code blocks if present
    if (jsonText.includes('```json')) {
      const jsonMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else if (jsonText.includes('```')) {
      const jsonMatch = jsonText.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
    } else {
      // Try to find JSON object
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }
    }
    
    parsedResponse = JSON.parse(jsonText.trim());
  } catch (parseError) {
    console.error('Failed to parse AI response:', text);
    return {
      availability: [],
      confidence: 0,
      summary: 'Failed to parse availability information',
      errors: ['Could not parse AI response']
    };
  }

  // Transform the response to match our types
  const availability: AvailabilitySlot[] = (parsedResponse.availability || []).map((slot: any) => ({
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
}

export async function POST(request: NextRequest) {
  try {
    const body: MessageParseRequest = await request.json();
    
    if (!body.message || !body.userName) {
      return NextResponse.json(
        { error: 'Missing required fields: message and userName' },
        { status: 400 }
      );
    }

    validateConfig();
    const providerInfo = getLLMProviderInfo();

    let result: MessageParseResponse;

    if (providerInfo.provider === 'ollama') {
      result = await parseWithOllama(body);
    } else {
      result = await parseWithGemini(body);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in parse-message API:', error);
    
    // Check if it's a connection error for Ollama
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({
        availability: [],
        confidence: 0,
        summary: 'Ollama connection failed',
        errors: [
          'Could not connect to Ollama. Please ensure Ollama is running on ' + config.ollama.baseUrl,
          'Run "ollama serve" to start Ollama, or check if the model is available with "ollama list"'
        ]
      });
    }

    return NextResponse.json(
      {
        availability: [],
        confidence: 0,
        summary: 'Error processing message',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      },
      { status: 500 }
    );
  }
}
