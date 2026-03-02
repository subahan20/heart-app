# HeartSafe - Indian Health Prevention App

A prevention-first health app designed specifically for Indians to help prevent and reverse lifestyle diseases like High BP, Diabetes, Thyroid, and PCOS/PCOD using AI-guided daily actions and Indian diet & lifestyle recommendations.

## Features

### 🏥 Core Health Tracking
- **Blood Pressure Monitoring**: Log and track BP readings with status indicators
- **Blood Sugar Tracking**: Monitor fasting, post-meal, and random glucose levels
- **Exercise Logging**: Track various exercise types with calorie estimation
- **Stress & Sleep Monitoring**: Daily stress level tracking and sleep quality assessment

### 🍎 Personalized Diet Plans
- AI-generated Indian meal plans based on health conditions
- Disease-specific dietary recommendations
- Portion guidance and nutritional explanations
- Traditional Indian food preferences

### 🤖 AI-Powered Recommendations
- Daily micro-action suggestions
- Personalized health tips based on your data
- Gentle, non-fear-based health coaching
- Context-aware recommendations

### 📊 Analytics Dashboard
- Health score tracking
- Visual trends for BP and sugar levels
- Exercise consistency monitoring
- Progress insights without overwhelming data

## Tech Stack

### Frontend
- **React.js** with modern hooks
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Recharts** for data visualization
- **React Router** for navigation

### Backend
- **Supabase** for:
  - Authentication
  - PostgreSQL Database
  - Real-time data sync
  - Edge Functions (AI integration)

### AI Services
- **Google Gemini AI 1.5 Flash** for personalized recommendations
- Prompt-driven diet plan generation
- Contextual health coaching

## Edge Functions Deployment

### AI Services Setup

All AI functionality has been moved to Supabase Edge Functions for better performance and security:

#### Created Functions:
1. **`supabase/functions/diet-plan/index.js`** - Generates personalized Indian diet plans
2. **`supabase/functions/recommendations/index.js`** - Creates health recommendations

#### Environment Variables:
Set these in your Supabase Edge Functions settings:
- `GEMINI_API` - Your Google Gemini AI API key

#### Function Endpoints:
- `/.netlify/functions/diet-plan` - Diet plan generation
- `/.netlify/functions/recommendations` - Health recommendations

#### Local Development:
```bash
# Start Supabase local development
supabase start
```

#### Deployment:
```bash
# Deploy functions
supabase functions deploy
```

### Getting Gemini API Key:
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy and set as `GEMINI_API` in your environment variables

## Database Schema

All user data is stored in Supabase PostgreSQL database with the following tables:

### Core Tables
- **`users`** - User authentication and basic info
- **`user_profiles`** - Detailed health profiles (age, weight, diseases, etc.)

### Health Data Tables
- **`bp_readings`** - Blood pressure measurements
- **`sugar_readings`** - Blood glucose levels
- **`exercise_sessions`** - Workout tracking with calorie estimation
- **`stress_sleep_entries`** - Stress levels and sleep quality

### AI-Generated Content
- **`diet_plans`** - Personalized meal plans (7-day expiry)
- **`recommendations`** - Health recommendations with context

### Security Features
- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Automatic user isolation

### Data Relationships
- All health data linked to `user_id`
- AI content includes context data for generation tracking
- Timestamps for all entries

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd health-app
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Copy your project URL and anon key
   - Create `.env` file from `.env.example`
   - Add your Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

4. **Set up database tables**
Run the following SQL in your Supabase SQL editor:

```sql
-- User profiles table
CREATE TABLE patient_details (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  age integer,
  gender text,
  height numeric,
  weight numeric,
  activity_level text,
  sleep_hours numeric,
  stress_level integer,
  diseases text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Blood pressure readings
CREATE TABLE bp_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  systolic integer NOT NULL,
  diastolic integer NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Blood sugar readings
CREATE TABLE sugar_readings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  glucose integer NOT NULL,
  type text NOT NULL, -- 'fasting', 'post-meal', 'random'
  timestamp timestamptz DEFAULT now()
);

-- Exercises
CREATE TABLE exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  duration integer NOT NULL,
  intensity text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Stress logs
CREATE TABLE stress_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  level integer NOT NULL,
  reason text,
  timestamp timestamptz DEFAULT now()
);

-- Sleep logs
CREATE TABLE sleep_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  hours numeric NOT NULL,
  quality text NOT NULL,
  timestamp timestamptz DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bp_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sugar_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE stress_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own bp readings" ON bp_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bp readings" ON bp_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sugar readings" ON sugar_readings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sugar readings" ON sugar_readings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own exercises" ON exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own stress logs" ON stress_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own stress logs" ON stress_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own sleep logs" ON sleep_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sleep logs" ON sleep_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
```

5. **Start the development server**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the app.

## Project Structure

```
src/
├── components/
│   ├── ui/              # Reusable UI components (Button, Card, Input)
│   └── health/          # Health-specific components
├── pages/               # Main application pages
├── hooks/               # Custom React hooks
├── services/            # External service integrations (Supabase, AI)
├── utils/               # Utility functions
└── constants/           # App constants and configurations
```

## Key Components

### Health Components
- `BpLogger`: Blood pressure logging with status indicators
- `SugarLogger`: Blood sugar tracking with type-specific ranges
- `ExerciseTracker`: Exercise logging with calorie estimation
- `StressSleepTracker`: Combined stress and sleep monitoring
- `DietPlan`: AI-generated personalized meal plans

### Custom Hooks
- `useHealthProfile`: User profile management
- `useHealthData`: Health data CRUD operations

## Design Principles

- **Calm & Trustworthy**: Green + White + Light Grey color palette
- **Mobile-First**: Responsive design optimized for Indian users
- **Simple & Focused**: One action at a time, minimal clutter
- **Indian Context**: Localized food, lifestyle, and health recommendations

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for type safety
3. Write meaningful commit messages
4. Test on mobile devices
5. Consider Indian user context in all features

## License

This project is licensed under the MIT License.
