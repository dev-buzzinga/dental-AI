# Voice Notes with Live Transcript & AI Summary - Setup Guide

This guide will help you set up the live transcript and AI summary functionality for the voice notes feature.

## 📋 Prerequisites

1. **Deepgram Account**: Sign up at [https://deepgram.com](https://deepgram.com) to get an API key for speech-to-text transcription
2. **Anthropic Account**: Get your Claude API key from [https://console.anthropic.com](https://console.anthropic.com)
3. **Supabase Project**: Ensure you have Supabase set up with the required tables and storage buckets

## 🗄️ Database Setup

### 1. Create the `ai_scribes` table in Supabase

```sql
CREATE TABLE ai_scribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id BIGINT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  template_id BIGINT REFERENCES voice_notes_template(id) ON DELETE SET NULL,
  
  -- User inputs
  description TEXT,
  date_created DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Recording data
  user_recording_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  
  -- Transcription data
  transcript_url TEXT,
  live_transcript TEXT,
  
  -- AI Summary data
  ai_summary_url TEXT,
  ai_summary TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_ai_scribes_user ON ai_scribes(user_id);
CREATE INDEX idx_ai_scribes_patient ON ai_scribes(patient_id);
CREATE INDEX idx_ai_scribes_doctor ON ai_scribes(doctor_id);
CREATE INDEX idx_ai_scribes_date ON ai_scribes(date_created);
```

### 2. Create Storage Buckets in Supabase

Go to your Supabase project > Storage and create these buckets:

- **`audio`** - For storing audio recordings
  - Make it public for easy playback
  - Set file size limit: 50MB
  - Allowed MIME types: `audio/webm`, `audio/wav`, `audio/mp3`

- **`transcripts`** - For storing transcripts and summaries
  - Make it public
  - Set file size limit: 10MB
  - Allowed MIME types: `text/plain`

### 3. Set up Row Level Security (RLS) policies

```sql
-- Enable RLS
ALTER TABLE ai_scribes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own scribes
CREATE POLICY "Users can view their own scribes"
ON ai_scribes FOR SELECT
USING (user_id = auth.uid());

-- Policy: Users can create their own scribes
CREATE POLICY "Users can create their own scribes"
ON ai_scribes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own scribes
CREATE POLICY "Users can update their own scribes"
ON ai_scribes FOR UPDATE
USING (user_id = auth.uid());

-- Policy: Users can delete their own scribes
CREATE POLICY "Users can delete their own scribes"
ON ai_scribes FOR DELETE
USING (user_id = auth.uid());
```

## 🔧 Backend Setup

### 1. Install Dependencies

Navigate to the backend directory and install the new packages:

```bash
cd backend
npm install ws @deepgram/sdk express-fileupload
```

### 2. Configure Environment Variables

Create or update your `.env` file in the `backend` directory:

```env
# Add these new variables
DEEPGRAM_API_KEY=your-deepgram-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# Make sure these are also set
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Files Added/Modified

The following backend files have been created/modified:

- ✅ `src/routes/ai-scribe.routes.js` - New routes for AI scribe endpoints
- ✅ `src/controllers/ai-scribe.controller.js` - Controller for handling requests
- ✅ `src/services/ai-scribe.service.js` - Business logic and database operations
- ✅ `src/services/transcription.service.js` - WebSocket and Deepgram integration
- ✅ `src/services/anthropic.service.js` - Added `generateAISummary` function
- ✅ `src/config/env.js` - Added `DEEPGRAM_API_KEY` config
- ✅ `src/routes/index.js` - Registered AI scribe routes
- ✅ `src/server.js` - Added WebSocket server setup
- ✅ `src/app.js` - Added file upload middleware
- ✅ `package.json` - Added new dependencies

## 💻 Frontend Setup

### 1. Configure Environment Variables

Create or update your `.env` file in the `frontend` directory:

```env
VITE_BACKEND_URL=http://localhost:5000
```

### 2. Files Added/Modified

The following frontend files have been created/modified:

- ✅ `src/service/ai-scribe.js` - New service for AI scribe API calls
- ✅ `src/pages/voiceNotes/AddVoiceNotePage.jsx` - Updated with full functionality

## 🚀 Running the Application

### 1. Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:5000
🔌 WebSocket server ready at ws://localhost:5000/ws/transcribe
```

### 2. Start the Frontend

```bash
cd frontend
npm run dev
```

## 📝 How It Works

### Recording Flow

1. **User clicks "Start Recording"**
   - Creates a voice note record in the database
   - Establishes WebSocket connection to backend
   - Starts capturing audio from microphone

2. **During Recording**
   - Audio chunks are sent to backend via WebSocket
   - Backend forwards audio to Deepgram API
   - Deepgram returns real-time transcriptions
   - Transcriptions are displayed live in the UI

3. **User clicks "Stop Recording"**
   - Recording stops and audio file is created
   - Audio file is uploaded to Supabase Storage
   - Complete transcript is sent to Claude API
   - AI generates a formatted summary based on template
   - Both transcript and summary are stored in database

### WebSocket Connection

```
Frontend                Backend                 Deepgram
   |                       |                       |
   |-- Connect WS -------->|                       |
   |                       |-- Connect ----------->|
   |<-- Connected ---------|                       |
   |                       |                       |
   |-- Audio Chunk ------->|-- Audio Chunk ------->|
   |                       |<-- Transcript --------|
   |<-- Transcript --------|                       |
   |                       |                       |
```

## 🧪 Testing

### 1. Test Voice Recording

1. Navigate to Voice Notes page
2. Click "Add Voice Notes"
3. Fill in patient, doctor, and date
4. Click the microphone button to start recording
5. Speak clearly into your microphone
6. Watch the transcript appear in real-time
7. Click stop when done
8. Wait for AI summary to generate

### 2. Test WebSocket Connection

Check browser console for:
- ✅ WebSocket connected
- ✅ Transcript messages received
- ✅ No connection errors

Check backend logs for:
- ✅ Connected to Deepgram
- ✅ Transcript messages logged
- ✅ No API errors

## 🐛 Troubleshooting

### WebSocket Connection Fails

**Problem**: `WebSocket connection failed`

**Solutions**:
- Check that backend server is running
- Verify `VITE_BACKEND_URL` in frontend `.env`
- Check browser console for CORS errors
- Try using `ws://localhost:5000` instead of domain

### No Transcript Appearing

**Problem**: Recording works but no text appears

**Solutions**:
- Verify `DEEPGRAM_API_KEY` is correct
- Check backend logs for Deepgram errors
- Ensure microphone permissions are granted
- Try speaking louder and more clearly

### AI Summary Not Generated

**Problem**: Transcript appears but summary doesn't generate

**Solutions**:
- Verify `ANTHROPIC_API_KEY` is correct
- Check backend logs for Anthropic errors
- Ensure you have Claude API credits
- Check if transcript is being saved to database

### Audio Upload Fails

**Problem**: `Failed to upload audio`

**Solutions**:
- Check Supabase storage bucket `audio` exists
- Verify bucket is set to public
- Check file size limits (default: 50MB)
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct

## 📚 API Endpoints

### Create Voice Note
```
POST /api/ai-scribe
Body: {
  user_id: string (UUID),
  patient_id: number (BIGINT),
  doctor_id: number (BIGINT),
  template_id?: number (BIGINT),
  description?: string,
  date_created: string (YYYY-MM-DD)
}
```

### Upload Audio
```
POST /api/ai-scribe/:id/audio
Content-Type: multipart/form-data
Body: {
  audio: File,
  duration: number
}
```

### Generate Summary
```
POST /api/ai-scribe/:id/summarize
Body: {
  transcript: string,
  patient_name: string,
  doctor_name: string,
  template: string
}
```

### Get Voice Note
```
GET /api/ai-scribe/:id
```

### Get All Voice Notes for User
```
GET /api/ai-scribe/user/:userId
```

## 🔒 Security Notes

1. **Never commit `.env` files** to version control
2. **Use service role key** only on backend, never frontend
3. **Validate user permissions** before allowing operations
4. **Sanitize file uploads** to prevent security issues
5. **Rate limit API endpoints** to prevent abuse

## 📊 Performance Tips

1. **Audio Chunking**: Send audio in 1-second chunks for real-time transcription
2. **WebSocket Batching**: Batch multiple small messages together
3. **Database Indexing**: Add indexes on frequently queried columns
4. **Caching**: Cache template data to reduce database calls
5. **Lazy Loading**: Load voice notes list with pagination

## 🎯 Next Steps

- [ ] Add pagination to voice notes list
- [ ] Implement search and filtering
- [ ] Add export functionality (PDF, Word)
- [ ] Support multiple languages
- [ ] Add speaker diarization (multiple speakers)
- [ ] Implement audio playback with highlights
- [ ] Add voice note sharing between doctors

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review browser and server logs
3. Verify all environment variables are set
4. Test API endpoints individually
5. Check Deepgram and Anthropic dashboards for usage/errors

---

**Last Updated**: March 16, 2026
**Version**: 1.0.0
