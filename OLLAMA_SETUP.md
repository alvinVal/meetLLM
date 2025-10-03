# Ollama Local LLM Setup Guide

This guide will help you set up Ollama to run the AI Scheduler locally without needing a cloud API.

## 1. Verify Ollama Installation

Since you mentioned you already have Ollama installed, let's verify it's working:

```bash
# Check if Ollama is installed
ollama --version

# List available models
ollama list
```

## 2. Start Ollama Server

Make sure Ollama is running:

```bash
# Start Ollama server (if not already running)
ollama serve
```

This should start Ollama on `http://localhost:11434` (default port).

## 3. Pull Required Model

The AI Scheduler is configured to use `llama3.2` by default. Pull it if you don't have it:

```bash
# Pull the default model (this may take a few minutes)
ollama pull llama3.2

# Alternative: Use a smaller/faster model
# ollama pull llama3.2:1b
```

## 4. Configure Environment Variables

Create a `.env.local` file in your project root with:

```env
# Use Ollama as the LLM provider
LLM_PROVIDER=ollama

# Ollama configuration (these are the defaults)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# App configuration
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

## 5. Test the Setup

1. **Start your Next.js app** (if not already running):
   ```bash
   npm run dev
   ```

2. **Visit the app** at [http://localhost:3001](http://localhost:3001)

3. **Check the LLM Status** in the sidebar - it should show:
   - 🏠 Ollama LLM
   - Green status indicator
   - Available models list

## 6. Test Message Processing

Try sending a test message:

1. Go to the "Messages" tab
2. Add a new user (e.g., "Test User")
3. Send a message like: `"I'm available tomorrow from 2-4 PM"`
4. Watch the AI process and extract availability information

## Troubleshooting

### "Could not connect to Ollama" Error

**Problem**: The app can't reach Ollama
**Solutions**:
1. Make sure Ollama is running: `ollama serve`
2. Check if the port is correct (default: 11434)
3. Try: `curl http://localhost:11434/api/tags` to test connectivity

### "Model not found" Error

**Problem**: The specified model isn't available
**Solutions**:
1. List available models: `ollama list`
2. Pull the required model: `ollama pull llama3.2`
3. Or change the model in `.env.local`: `OLLAMA_MODEL=your_available_model`

### Slow Processing

**Problem**: Message processing takes a long time
**Solutions**:
1. Use a smaller model: `ollama pull llama3.2:1b`
2. Update `.env.local`: `OLLAMA_MODEL=llama3.2:1b`
3. Ensure you have enough RAM (8GB+ recommended)

### Poor Extraction Quality

**Problem**: AI doesn't extract availability correctly
**Solutions**:
1. Try a larger model: `ollama pull llama3.1:8b`
2. Use more specific language in messages
3. Check the confidence scores in extracted data

## Alternative Models

You can experiment with different models:

```bash
# Smaller/faster models
ollama pull llama3.2:1b          # 1.3GB - Fast but less accurate
ollama pull phi3.5               # 2.2GB - Good balance

# Larger/more accurate models  
ollama pull llama3.1:8b          # 4.7GB - More accurate
ollama pull mistral:7b           # 4.1GB - Good alternative

# Specialized models
ollama pull codellama:7b         # Good for structured data
```

Then update your `.env.local`:
```env
OLLAMA_MODEL=your_chosen_model
```

## Performance Tips

1. **RAM**: Ensure you have enough RAM for your chosen model
2. **CPU**: More CPU cores = faster processing
3. **Model Size**: Smaller models are faster but may be less accurate
4. **Keep Ollama Running**: Don't stop/start Ollama frequently

## Switching to Gemini Later

If you want to switch to Gemini later:

1. Get a Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Update `.env.local`:
   ```env
   LLM_PROVIDER=gemini
   GOOGLE_GEMINI_API_KEY=your_api_key_here
   ```
3. Restart your Next.js app

The app will automatically switch providers and show the new status in the sidebar.

## Need Help?

- **Ollama Docs**: [https://ollama.ai/](https://ollama.ai/)
- **Model Library**: [https://ollama.ai/library](https://ollama.ai/library)
- **Check Ollama Status**: Visit [http://localhost:11434](http://localhost:11434) in your browser

Your AI Scheduler should now work completely offline with local AI processing! 🚀
