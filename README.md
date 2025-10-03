# meetLLM

A modern, AI-powered meeting scheduler that understands natural language and helps teams find optimal meeting times. Built with Next.js, TypeScript, Tailwind CSS, and powered by Google Gemini AI.

## Features

### 🧠 Natural Language Processing
- **Message Parsing**: Send messages in plain English like "I'm free tomorrow from 2-4 PM"
- **Google Gemini AI**: Powered by Google's advanced Gemini AI for accurate availability extraction
- **Multi-User Support**: Handle availability messages from multiple team members
- **Smart Interpretation**: Understands relative dates, time ranges, and availability preferences
- **Confidence Scoring**: AI provides confidence levels for extracted availability data
- **Real-time Feedback**: See exactly what the AI understood from your message

### 👥 Team Management
- **User Profiles**: Automatically create user profiles from messages
- **Color-Coded Users**: Visual distinction between different users
- **Interactive Management**: Click on team members to view and manage their availability
- **User Deletion**: Remove team members and all their associated data
- **Availability Overview**: Track each user's availability slots and preferences

### 📅 Intelligent Meeting Scheduling
- **Smart Suggestions**: AI automatically suggests optimal meeting times based on overlapping availability
- **Meeting Creation**: One-click meeting scheduling with automatic participant assignment
- **Calendar Integration**: Visual calendar showing all availability and scheduled meetings
- **Conflict Detection**: Identify and avoid scheduling conflicts
- **Flexible Duration**: Support for different meeting durations (30min, 1hr, 1.5hr, 2hr)

### 🎨 Modern UI/UX
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Clean Interface**: Modern, intuitive design with Tailwind CSS
- **Real-time Updates**: Immediate visual feedback for all actions
- **Interactive Calendar**: Week view with color-coded availability blocks
- **Professional Branding**: Clean meetLLM branding with custom logo

### 🗄️ Database Integration
- **Prisma ORM**: Type-safe database operations with Prisma
- **SQLite Database**: Lightweight, file-based database for development
- **Data Persistence**: All users, meetings, and availability data is saved
- **Real-time Sync**: Database updates are reflected immediately in the UI
- **CRUD Operations**: Full Create, Read, Update, Delete functionality for all entities

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite with Prisma ORM
- **AI**: Google Gemini API
- **Calendar**: react-big-calendar
- **Date Handling**: date-fns, moment.js

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai_scheduler
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
   LLM_PROVIDER=gemini
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Adding Team Members
1. Click "Add New User" in the sidebar
2. Enter the team member's name and email (optional)
3. The system automatically assigns a unique color

### Inputting Availability
1. Select a team member from the dropdown
2. Type a natural language message about their availability
3. Examples:
   - "I'm available tomorrow from 2-4 PM"
   - "I have meetings all morning but free after lunch"
   - "I can't do Fridays, but any other day works"
   - "I prefer mornings, especially 9-11 AM"

### Viewing and Managing Availability
1. **Calendar View**: See all availability as color-coded blocks
   - Green: Available
   - Red: Busy
   - Blue: Preferred times
   - Purple: Scheduled meetings

2. **Parsed Time Blocks**: Review what the AI extracted from messages
   - See confidence scores
   - Delete incorrect blocks
   - View original text

3. **Team Management**: Click on team members to:
   - View detailed availability
   - Delete individual time slots
   - Clear all availability
   - Delete the team member

### Scheduling Meetings
1. The system automatically suggests optimal meeting times
2. Click "Schedule Meeting" on any suggestion
3. Meetings appear as purple blocks on the calendar
4. All participants are automatically assigned

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `PUT /api/users/[id]` - Update a user
- `DELETE /api/users?userId=[id]` - Delete a user

### Availability
- `GET /api/time-slots` - Get time slots (by user or date range)
- `POST /api/time-slots` - Create a time slot
- `PUT /api/time-slots/[id]` - Update a time slot
- `DELETE /api/time-slots/[id]` - Delete a time slot
- `DELETE /api/time-slots?userId=[id]` - Clear all slots for a user

### Meetings
- `GET /api/meetings` - Get all meetings
- `POST /api/meetings` - Create a meeting
- `PUT /api/meetings/[id]` - Update a meeting
- `DELETE /api/meetings/[id]` - Delete a meeting

### AI Processing
- `POST /api/llm/parse-structured` - Parse natural language messages
- `GET /api/llm/status` - Get AI service status

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_GEMINI_API_KEY` | Your Google Gemini API key | Required |
| `LLM_PROVIDER` | AI provider to use | `gemini` |
| `NEXT_PUBLIC_APP_URL` | Application URL | `http://localhost:3000` |

### AI Provider Options

- **Gemini** (Recommended): Uses Google Gemini API
- **Ollama** (Local): Uses local Ollama installation

## Database Schema

### Users
- `id`: Unique identifier
- `name`: User's display name
- `email`: Optional email address
- `color`: UI color for visual distinction
- `createdAt`: Creation timestamp

### Time Slots
- `id`: Unique identifier
- `userId`: Reference to user
- `startTime`: Availability start time
- `endTime`: Availability end time
- `type`: available, busy, preferred, unavailable
- `confidence`: AI confidence score (0-1)
- `originalText`: Source text from message
- `notes`: Additional context

### Meetings
- `id`: Unique identifier
- `title`: Meeting title
- `description`: Meeting description
- `startTime`: Meeting start time
- `endTime`: Meeting end time
- `location`: Meeting location
- `participants`: Many-to-many relationship with users

## Development

### Project Structure
```
src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Main page
├── components/         # React components
├── hooks/             # Custom React hooks
├── lib/               # Utility libraries
└── types/             # TypeScript type definitions
```

### Key Components
- **MessageInput**: Natural language input form
- **CalendarView**: Interactive calendar display
- **ParsedTimeBlocks**: AI parsing results viewer
- **TeamMemberPopup**: User management interface
- **LLMStatus**: AI service status indicator

### Custom Hooks
- **useUsers**: User management and CRUD operations
- **useMessages**: Message processing and availability extraction
- **useMeetings**: Meeting scheduling and management

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google Gemini AI for natural language processing
- Next.js team for the amazing framework
- Prisma team for the excellent ORM
- Tailwind CSS for the utility-first styling
- react-big-calendar for the calendar component