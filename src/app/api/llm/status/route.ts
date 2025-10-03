import { NextResponse } from 'next/server';
import { Ollama } from 'ollama';
import { config, getLLMProviderInfo } from '@/lib/config';

let ollamaClient: Ollama | null = null;

function getOllamaClient() {
  if (!ollamaClient) {
    ollamaClient = new Ollama({ host: config.ollama.baseUrl });
  }
  return ollamaClient;
}

async function checkOllamaStatus() {
  try {
    const client = getOllamaClient();
    const models = await client.list();
    
    return {
      available: true,
      models: models.models.map(m => m.name),
    };
  } catch (error) {
    return {
      available: false,
      models: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function GET() {
  try {
    const providerInfo = getLLMProviderInfo();
    
    if (providerInfo.provider === 'ollama') {
      const ollamaStatus = await checkOllamaStatus();
      return NextResponse.json({
        provider: 'ollama',
        model: config.ollama.model,
        isLocal: true,
        available: ollamaStatus.available,
        availableModels: ollamaStatus.models,
        error: ollamaStatus.error,
        baseUrl: config.ollama.baseUrl,
      });
    } else {
      return NextResponse.json({
        provider: 'gemini',
        model: config.gemini.model,
        isLocal: false,
        available: !!config.gemini.apiKey,
        error: !config.gemini.apiKey ? 'API key not configured' : undefined,
      });
    }
  } catch (error) {
    console.error('Error checking LLM status:', error);
    return NextResponse.json(
      {
        provider: 'unknown',
        model: 'unknown',
        isLocal: false,
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
