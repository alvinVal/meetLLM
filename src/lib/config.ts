// Configuration for the AI Scheduler
export type LLMProvider = 'gemini' | 'ollama';

export const config = {
  llm: {
    provider: (process.env.LLM_PROVIDER || 'gemini') as LLMProvider,
  },
  gemini: {
    apiKey: process.env.GOOGLE_GEMINI_API_KEY || 'AIzaSyD7NxkVradwtUAXEOIV6xFAcY3T3uOpeMA',
    model: 'gemini-2.5-flash',
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  },
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

// Validate required environment variables based on provider
export function validateConfig() {
  const missing = [];
  
  if (config.llm.provider === 'gemini' && !config.gemini.apiKey) {
    missing.push('GOOGLE_GEMINI_API_KEY');
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for ${config.llm.provider}: ${missing.join(', ')}\n` +
      'Please create a .env.local file with the required variables.\n' +
      'See README.md for setup instructions.'
    );
  }
}

// Get current LLM provider info
export function getLLMProviderInfo() {
  return {
    provider: config.llm.provider,
    model: config.llm.provider === 'gemini' ? config.gemini.model : config.ollama.model,
    isLocal: config.llm.provider === 'ollama',
  };
}
