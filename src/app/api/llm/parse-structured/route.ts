import { NextRequest, NextResponse } from 'next/server';
import { Ollama } from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config, validateConfig, getLLMProviderInfo } from '@/lib/config';
import { MessageParseRequest } from '@/types';
import { StructuredParseResponse, AVAILABILITY_SCHEMA, validateStructuredResponse } from '@/types/structured';

// Initialize clients
let ollamaClient: Ollama | null = null;
let genAI: GoogleGenerativeAI | null = null;

function getOllamaClient() {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: config.ollama.baseUrl });
  }
  return ollamaClient;
}

function getGeminiClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(config.gemini.apiKey);
  }
  return genAI;
}

async function parseWithStructuredOllama(request: MessageParseRequest): Promise<StructuredParseResponse> {
  const startTime = Date.now();
  const client = getOllamaClient();
  const currentDate = request.context?.currentDate ? 
    (typeof request.context.currentDate === 'string' ? new Date(request.context.currentDate) : request.context.currentDate) : 
    new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get week context
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)
  
  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentWeekDay = weekDays[currentDate.getDay()];
  const currentWeekDayName = weekDays[currentDate.getDay()];
  
  const prompt = `You are an expert AI assistant that extracts availability information from natural language messages with high precision.

CONTEXT:
- Current date/time: ${currentDate}
- Current day: ${currentWeekDayName}
- Timezone: ${timezone}
- User name: ${request.userName}
- Week context: ${weekStart.toDateString()} to ${weekEnd.toDateString()}
- Available days this week: ${weekDays.join(', ')}

MESSAGE TO ANALYZE:
"${request.message}"

TASK:
Extract availability information and return ONLY a valid JSON object matching this exact schema:

${JSON.stringify(AVAILABILITY_SCHEMA, null, 2)}

EXTRACTION RULES:
1. Parse specific time ranges (e.g., "2-4 PM tomorrow" → specific datetime slots)
2. Interpret relative dates based on current date and week context:
   - "today" = current date
   - "tomorrow" = next day
   - "this week" = any day from ${weekStart.toDateString()} to ${weekEnd.toDateString()}
   - "next week" = following week
   - Day names (Monday, Tuesday, etc.) = specific day in current or next week
3. Handle various time formats (12hr, 24hr, "morning", "afternoon", "evening")
4. Classify availability types:
   - "available"/"free"/"open" → available
   - "busy"/"meeting"/"occupied"/"booked" → busy
   - "prefer"/"would like"/"best time" → preferred  
   - "can't"/"unavailable"/"not free" → unavailable
5. Set confidence based on specificity (exact times = high, vague = low)
6. Extract originalText from the exact phrase that indicates availability
7. Add helpful notes for assumptions or clarifications
8. If no availability mentioned, return empty availability array
9. Handle recurring patterns by creating multiple slots for the week
10. Make reasonable duration assumptions (meetings = 1hr, "morning" = 3hrs, etc.)
11. Consider week context when interpreting "this week" or day names
12. For recurring patterns, create slots for each applicable day in the week
13. Handle complex constraints:
    - "every morning except Wednesdays" → create slots for Mon, Tue, Thu, Fri, Sat, Sun mornings
    - "I'm free on Tuesdays, but prefer early morning" → create Tuesday morning slot as preferred
    - "I have a meeting on Friday from 2-4 PM" → create Friday 2-4 PM slot as busy
    - "I can't do Fridays" → create Friday all-day slot as unavailable
14. For recurring patterns with exceptions, create individual slots for each applicable day
15. When multiple constraints are mentioned, create separate slots for each constraint
16. CRITICAL: Generate times in LOCAL timezone format (YYYY-MM-DDTHH:MM:SS) without Z suffix
17. Use the current timezone (${timezone}) for all time calculations

EXAMPLES:
Input: "I'm free tomorrow from 2-4 PM"
Output: {
  "availability": [{
    "startTime": "2025-01-15T14:00:00",
    "endTime": "2025-01-15T16:00:00", 
    "type": "available",
    "confidence": 0.95,
    "originalText": "free tomorrow from 2-4 PM",
    "notes": "Specific time range provided"
  }],
  "confidence": 0.95,
  "summary": "Available tomorrow afternoon for 2 hours",
  "errors": []
}

Input: "I have meetings all morning"
Output: {
  "availability": [{
    "startTime": "2025-01-15T09:00:00",
    "endTime": "2025-01-15T12:00:00",
    "type": "busy", 
    "confidence": 0.8,
    "originalText": "meetings all morning",
    "notes": "Assumed morning is 9 AM - 12 PM"
  }],
  "confidence": 0.8,
  "summary": "Busy during morning hours due to meetings",
  "errors": []
}

CRITICAL: Return ONLY the JSON object. No additional text, explanations, or formatting.`;

  const response = await client.chat({
    model: config.ollama.model,
    messages: [{ role: 'user', content: prompt }],
    stream: false,
  });

  const processingTime = Date.now() - startTime;
  return parseStructuredResponse(response.message.content, {
    processingTime,
    model: config.ollama.model,
    provider: 'ollama',
    structuredOutput: true
  });
}

async function parseWithStructuredGemini(request: MessageParseRequest): Promise<StructuredParseResponse> {
  const startTime = Date.now();
  const client = getGeminiClient();

  const currentDate = request.context?.currentDate ? 
    (typeof request.context.currentDate === 'string' ? new Date(request.context.currentDate) : request.context.currentDate) : 
    new Date();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Get week context
  const weekStart = new Date(currentDate);
  weekStart.setDate(currentDate.getDate() - currentDate.getDay()); // Start of week (Sunday)

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // End of week (Saturday)

  const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentWeekDayName = weekDays[currentDate.getDay()];

  const prompt = `You are an expert AI assistant that extracts availability information from natural language messages with high precision.

CONTEXT:
- Current date/time: ${currentDate.toISOString()}
- Current day: ${currentWeekDayName}
- Timezone: ${timezone}
- User name: ${request.userName}
- Week context: ${weekStart.toDateString()} to ${weekEnd.toDateString()}
- Available days this week: ${weekDays.join(', ')}

MESSAGE TO ANALYZE:
"${request.message}"

TASK:
Extract availability information and return ONLY a valid JSON object matching this exact schema:

${JSON.stringify(AVAILABILITY_SCHEMA, null, 2)}

EXTRACTION RULES:
1. Parse specific time ranges (e.g., "2-4 PM tomorrow" → specific datetime slots)
2. Interpret relative dates based on current date and week context:
   - "today" = current date
   - "tomorrow" = next day
   - "this week" = any day from ${weekStart.toDateString()} to ${weekEnd.toDateString()}
   - "next week" = following week
   - Day names (Monday, Tuesday, etc.) = specific day in current or next week
3. Handle various time formats (12hr, 24hr, "morning", "afternoon", "evening")
4. Classify availability types:
   - "available"/"free"/"open" → available
   - "busy"/"meeting"/"occupied"/"booked" → busy
   - "prefer"/"would like"/"best time" → preferred
   - "can't"/"unavailable"/"not free" → unavailable
5. Set confidence based on specificity (exact times = high, vague = low)
6. Extract originalText from the exact phrase that indicates this availability
7. Add helpful notes for assumptions or clarifications
8. If no availability mentioned, return empty availability array
9. Handle recurring patterns by creating multiple slots for the week
10. Make reasonable duration assumptions (meetings = 1hr, "morning" = 3hrs, etc.)
11. Consider week context when interpreting "this week" or day names
12. For recurring patterns, create slots for each applicable day in the week
13. Handle complex constraints:
    - "every morning except Wednesdays" → create slots for Mon, Tue, Thu, Fri, Sat, Sun mornings
    - "I'm free on Tuesdays, but prefer early morning" → create Tuesday morning slot as preferred
    - "I have a meeting on Friday from 2-4 PM" → create Friday 2-4 PM slot as busy
    - "I can't do Fridays" → create Friday all-day slot as unavailable
14. For recurring patterns with exceptions, create individual slots for each applicable day
15. When multiple constraints are mentioned, create separate slots for each constraint

EXAMPLES:
Input: "I'm free tomorrow from 2-4 PM"
Output: {
  "availability": [{
    "startTime": "2025-01-15T14:00:00",
    "endTime": "2025-01-15T16:00:00",
    "type": "available",
    "confidence": 0.95,
    "originalText": "tomorrow from 2-4 PM",
    "notes": "Specific time range provided"
  }],
  "confidence": 0.95,
  "summary": "Available tomorrow afternoon for 2 hours"
}

Input: "I have a meeting on Monday morning"
Output: {
  "availability": [{
    "startTime": "2025-01-20T09:00:00",
    "endTime": "2025-01-20T12:00:00",
    "type": "busy",
    "confidence": 0.8,
    "originalText": "meeting on Monday morning",
    "notes": "Assumed Monday is next Monday, morning is 9 AM - 12 PM"
  }],
  "confidence": 0.8,
  "summary": "Busy next Monday morning"
}

Input: "I am available every morning from 9 to 11 AM, except on Wednesdays"
Output: {
  "availability": [{
    "startTime": "2025-01-20T09:00:00",
    "endTime": "2025-01-20T11:00:00",
    "type": "available",
    "confidence": 0.9,
    "originalText": "every morning from 9 to 11 AM, except on Wednesdays",
    "notes": "Monday morning - recurring pattern with Wednesday exception"
  }, {
    "startTime": "2025-01-21T09:00:00",
    "endTime": "2025-01-21T11:00:00",
    "type": "available",
    "confidence": 0.9,
    "originalText": "every morning from 9 to 11 AM, except on Wednesdays",
    "notes": "Tuesday morning - recurring pattern with Wednesday exception"
  }, {
    "startTime": "2025-01-23T09:00:00",
    "endTime": "2025-01-23T11:00:00",
    "type": "available",
    "confidence": 0.9,
    "originalText": "every morning from 9 to 11 AM, except on Wednesdays",
    "notes": "Thursday morning - recurring pattern with Wednesday exception"
  }, {
    "startTime": "2025-01-24T09:00:00",
    "endTime": "2025-01-24T11:00:00",
    "type": "available",
    "confidence": 0.9,
    "originalText": "every morning from 9 to 11 AM, except on Wednesdays",
    "notes": "Friday morning - recurring pattern with Wednesday exception"
  }],
  "confidence": 0.9,
  "summary": "Available every morning 9-11 AM except Wednesdays"
}

Input: "I'm free on Tuesdays, but if possible, I prefer an early morning slot"
Output: {
  "availability": [{
    "startTime": "2025-01-21T08:00:00",
    "endTime": "2025-01-21T12:00:00",
    "type": "preferred",
    "confidence": 0.8,
    "originalText": "free on Tuesdays, but if possible, I prefer an early morning slot",
    "notes": "Tuesday with early morning preference (8 AM - 12 PM)"
  }],
  "confidence": 0.8,
  "summary": "Available Tuesday with early morning preference"
}

Input: "I already have a meeting booked on Friday from 2 to 4 PM"
Output: {
  "availability": [{
    "startTime": "2025-01-24T14:00:00",
    "endTime": "2025-01-24T16:00:00",
    "type": "busy",
    "confidence": 0.95,
    "originalText": "meeting booked on Friday from 2 to 4 PM",
    "notes": "Specific meeting time provided"
  }],
  "confidence": 0.95,
  "summary": "Busy Friday afternoon 2-4 PM"
}
`;

  try {
    const model = client.getGenerativeModel({ 
      model: config.gemini.model,
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const processingTime = Date.now() - startTime;
    return parseStructuredResponse(text, {
      processingTime,
      model: config.gemini.model,
      provider: 'gemini',
      structuredOutput: true
    });
  } catch (error) {
    console.error('Gemini structured parsing error:', error);
    return {
      availability: [],
      confidence: 0,
      summary: 'Error processing message',
      errors: [(error as Error).message],
      metadata: {
        processingTime: Date.now() - startTime,
        model: "gemini-2.0-flash-exp",
        provider: 'gemini',
        structuredOutput: true,
        error: true
      }
    };
  }
}

function parseStructuredResponse(text: string, metadata: any): StructuredParseResponse {
  let parsedResponse: any;
  
  try {
    // Clean and parse JSON - handle markdown code blocks
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
    console.error('Failed to parse structured response:', text);
    console.error('Parse error:', parseError);
    return {
      availability: [],
      confidence: 0,
      summary: 'Failed to parse structured response',
      errors: ['JSON parsing failed: ' + (parseError instanceof Error ? parseError.message : 'Unknown error')],
      metadata
    };
  }

  // Validate the structured response
  const validation = validateStructuredResponse(parsedResponse);
  
  if (!validation.valid) {
    console.error('Invalid structured response:', validation.errors);
    return {
      availability: [],
      confidence: 0,
      summary: 'Invalid response structure',
      errors: validation.errors,
      metadata
    };
  }

  // Return validated structured response
  return {
    availability: parsedResponse.availability || [],
    confidence: parsedResponse.confidence || 0,
    summary: parsedResponse.summary || 'Processed availability information',
    errors: parsedResponse.errors || [],
    metadata
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

    let result: StructuredParseResponse;

    if (providerInfo.provider === 'ollama') {
      result = await parseWithStructuredOllama(body);
    } else {
      result = await parseWithStructuredGemini(body);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in parse-structured API:', error);
    
    // Check if it's a connection error for Ollama
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      return NextResponse.json({
        availability: [],
        confidence: 0,
        summary: 'Ollama connection failed',
        errors: [
          'Could not connect to Ollama. Please ensure Ollama is running on ' + config.ollama.baseUrl,
          'Run "ollama serve" to start Ollama'
        ],
        metadata: {
          provider: 'ollama',
          structuredOutput: true,
          error: true
        }
      });
    }

    return NextResponse.json(
      {
        availability: [],
        confidence: 0,
        summary: 'Error processing message',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          structuredOutput: true,
          error: true
        }
      },
      { status: 500 }
    );
  }
}
