# Google Gemini API Setup Guide

This AI Scheduler uses Google's Gemini AI to parse natural language messages and extract availability information. Follow these steps to set up the Gemini API integration.

## 1. Get Your Gemini API Key

1. **Visit Google AI Studio**: Go to [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

2. **Sign in**: Use your Google account to sign in

3. **Create API Key**: 
   - Click "Create API Key"
   - Choose "Create API key in new project" (recommended) or select an existing project
   - Copy the generated API key

## 2. Set Up Environment Variables

1. **Create Environment File**: In your project root, create a `.env.local` file:
   ```bash
   # In the ai_scheduler directory
   touch .env.local
   ```

2. **Add Your API Key**: Open `.env.local` and add:
   ```env
   GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

   Replace `your_actual_api_key_here` with the API key you copied from Google AI Studio.

## 3. Verify Setup

1. **Restart Development Server**: 
   ```bash
   # Stop the current server (Ctrl+C) and restart
   npm run dev
   ```

2. **Test the Integration**:
   - Go to [http://localhost:3000](http://localhost:3000)
   - Navigate to the "Messages" tab
   - Add a new user (e.g., "John")
   - Send a test message like: "I'm available tomorrow from 2-4 PM"
   - The AI should process the message and extract availability information

## 4. Troubleshooting

### Common Issues:

**"Missing required environment variables" Error**:
- Make sure `.env.local` exists in the project root
- Verify the API key is correctly set without quotes
- Restart the development server

**"Failed to process message" Error**:
- Check that your API key is valid
- Ensure you have internet connection
- Verify the Gemini API is accessible from your location

**API Key Not Working**:
- Make sure you copied the complete API key
- Check if there are any usage limits on your Google Cloud project
- Try generating a new API key

### Testing Your API Key:

You can test your API key directly by visiting Google AI Studio and trying the Gemini model there.

## 5. API Usage and Limits

- **Free Tier**: Gemini offers a generous free tier for testing and development
- **Rate Limits**: Be aware of API rate limits (usually sufficient for development)
- **Costs**: Monitor usage in Google Cloud Console if you exceed free limits

## 6. Security Notes

- **Never commit `.env.local`** to version control (it's already in `.gitignore`)
- **Use different API keys** for development and production
- **Rotate API keys** regularly for security

## 7. Example Messages to Test

Try these example messages to test the AI parsing:

```
"I'm free tomorrow from 9 AM to 5 PM"
"I have meetings all morning but available after 2 PM"
"I can't do Fridays, but any other weekday works"
"I prefer mornings, especially between 9-11 AM"
"I'm busy next week but available the week after"
"Available all day Monday and Tuesday"
"I have a dentist appointment at 3 PM tomorrow"
"Free for the next 2 hours"
```

## 8. Advanced Configuration

The Gemini integration can be customized in `src/lib/geminiClient.ts`:

- **Model Selection**: Change the model (currently using `gemini-1.5-flash`)
- **Prompt Engineering**: Modify the parsing prompt for better results
- **Response Processing**: Adjust how responses are parsed and validated

## Need Help?

If you encounter issues:

1. Check the browser console for error messages
2. Verify your API key in Google AI Studio
3. Ensure all environment variables are set correctly
4. Try the example messages to test functionality

The AI Scheduler should now be able to intelligently parse natural language availability messages and create optimized schedules based on user preferences!
