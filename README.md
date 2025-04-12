# Air Quality Data Analyzer

A modern web application for analyzing and visualizing indoor air quality data, built with Next.js, Tailwind CSS, and integrated with AI-powered analysis.

## Features

- **Interactive Dashboard**: View key metrics and visualizations of your air quality data
- **Data Explorer**: Explore your data with filters, interactive charts, and maps
- **Map Visualization**: See the geographical distribution of air quality measurements
- **AI Query**: Ask questions about your data using natural language
- **Data Upload**: Upload your own CSV files with air quality measurements
- **Correlation Analysis**: Understand relationships between different metrics
- **Time Series Analysis**: Track changes in air quality over time

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Backend**: Node.js with Next.js API Routes
- **Database**: PostgreSQL with Prisma ORM
- **Data Visualization**: Plotly.js, Leaflet, React-Leaflet
- **AI Integration**: OpenAI GPT-4 for natural language querying
- **Data Processing**: CSV parsing, date handling with date-fns

## Quick Start Setup

The easiest way to get started is to use the automated setup script:

```bash
# Navigate to the project directory
cd air-quality-nextjs

# Make the setup script executable if needed
chmod +x setup.sh

# Run the setup script
./setup.sh
```

The setup script will:
1. Check for required dependencies
2. Create a default `.env.local` file
3. Install Node.js dependencies
4. Copy the CSV data file if found
5. Generate the Prisma client
6. Optionally run database migrations and load data

After completing the setup, you can start the development server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Manual Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL database
- OpenAI API key (for AI Query functionality)

### Step 1: Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE air_quality_db;
CREATE USER srikanthsamy1 WITH ENCRYPTED PASSWORD 'new_password';
GRANT ALL PRIVILEGES ON DATABASE air_quality_db TO srikanthsamy1;
```

### Step 2: Environment Configuration

Create a `.env.local` file with the following content:

```
# Database
DATABASE_URL="postgresql://srikanthsamy1:new_password@localhost:5432/air_quality_db"

# OpenAI (required for AI Query functionality)
OPENAI_API_KEY=your-openai-key-here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=random-secret-key-here

# Gemini (optional, for alternative AI model)
GEMINI_API_KEY=your-gemini-key-here
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Database Initialization

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Load data from CSV
npm run init-db
```

### Step 5: Start the Development Server

```bash
npm run dev
```

## CSV Data Format

Your CSV files should contain air quality measurements with at least the following columns:

- `datetime` - Timestamp of the measurement (required)
- At least one measurement column (e.g., `pm25Standard`, `pm10Standard`, `temperature`)
- Location columns are optional but recommended for map visualization (`latitude`, `longitude`)

Example CSV format:
```
datetime,from_node,pm25Standard,pm10Standard,temperature,relativeHumidity,latitude,longitude
2023-01-01T12:00:00,sensor1,15.3,45.6,22.5,48.7,37.7749,-122.4194
2023-01-01T12:05:00,sensor1,16.1,47.2,22.6,49.1,37.7749,-122.4194
2023-01-01T12:00:00,sensor2,12.8,38.4,23.1,52.3,37.3352,-121.8938
```

The application will attempt to recognize common variants of column names (e.g., "pm2.5" for "pm25Standard").

## Troubleshooting

### Database Connection Issues
- Verify your PostgreSQL server is running
- Check the connection string in your `.env.local` file
- Ensure the user has the correct permissions

### Map Not Loading
- Check if your data has valid latitude and longitude values
- Verify Leaflet CSS is properly loaded
- Check browser console for JavaScript errors

### AI Query Not Working
- Verify your OpenAI API key is correct
- Ensure your API key has sufficient credits

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with inspiration from the Streamlit air quality visualization app
- Uses Tailwind CSS for styling
- Incorporates OpenAI's GPT-4 for natural language processing
- Map visualization built with Leaflet and React-Leaflet
- Data visualization powered by Plotly.js

## SMesh Analyzer

A specialized tool for Stanford's Wildfire Lab to monitor, analyze, and visualize air quality data across environmental research sites.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Backend Implementation with Supabase

### Overview

We're implementing a Supabase backend to address the following issues:
- Browser localStorage limitations (~5MB quota) causing errors with large datasets
- The need for persistent storage of air quality data
- Better handling of date filtering and data retrieval
- Integration with AI services for data analysis

### Setup Instructions

1. **Create a Supabase Project**
   - Go to [Supabase](https://supabase.com/) and create an account
   - Create a new project and note your project URL and anon/public key

2. **Install Supabase Client**
   ```bash
   npm install @supabase/supabase-js
   ```

3. **Environment Variables**
   Create a `.env.local` file in the project root with:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # AI API Keys from llm5.py
   OPENAI_API_KEY=your_openai_api_key
   GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Database Schema**
   
   Execute the following SQL in the Supabase SQL Editor:

   ```sql
   -- Air quality data table
   CREATE TABLE air_quality (
       id SERIAL PRIMARY KEY,
       datetime TIMESTAMP,
       from_node TEXT,
       pm10Standard FLOAT,
       pm25Standard FLOAT,
       pm100Standard FLOAT,
       pm10Environmental FLOAT,
       pm25Environmental FLOAT,
       pm100Environmental FLOAT,
       rxSnr FLOAT,
       hopLimit FLOAT,
       rxRssi FLOAT,
       hopStart FLOAT,
       from_short_name TEXT,
       temperature FLOAT,
       relativeHumidity FLOAT,
       barometricPressure FLOAT,
       gasResistance FLOAT,
       iaq FLOAT,
       latitude FLOAT,
       longitude FLOAT,
       elevation TEXT,
       uploaded_at TIMESTAMP DEFAULT NOW(),
       user_id UUID REFERENCES auth.users(id)
   );

   -- Datasets table to track uploaded files
   CREATE TABLE datasets (
       id SERIAL PRIMARY KEY,
       name TEXT NOT NULL,
       description TEXT,
       record_count INTEGER NOT NULL,
       min_date TIMESTAMP,
       max_date TIMESTAMP,
       columns JSONB,
       created_at TIMESTAMP DEFAULT NOW(),
       user_id UUID REFERENCES auth.users(id)
   );

   -- Create RLS policies
   ALTER TABLE air_quality ENABLE ROW LEVEL SECURITY;
   ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

   -- Allow public read access
   CREATE POLICY "Allow public read access" 
   ON air_quality FOR SELECT USING (true);

   CREATE POLICY "Allow public read access" 
   ON datasets FOR SELECT USING (true);

   -- Allow authenticated users to insert their own data
   CREATE POLICY "Allow authenticated users to insert" 
   ON air_quality FOR INSERT WITH CHECK (auth.role() = 'authenticated');

   CREATE POLICY "Allow authenticated users to insert" 
   ON datasets FOR INSERT WITH CHECK (auth.role() = 'authenticated');
   ```

5. **Supabase Client Setup**

   Create a new file `lib/supabase.js`:
   ```javascript
   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
   const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

   export const supabase = createClient(supabaseUrl, supabaseAnonKey);
   ```

### Integration with Frontend

1. **Upload Component**

   Update the upload component to save data to Supabase instead of localStorage:

   ```javascript
   // In app/upload/page.js
   
   import { supabase } from '../../lib/supabase';

   // Replace localStorage with Supabase
   const saveDataToSupabase = async (parsedData, dateRange) => {
     try {
       // First create a dataset entry
       const { data: dataset, error: datasetError } = await supabase
         .from('datasets')
         .insert({
           name: 'Uploaded CSV',
           description: 'Air quality data uploaded via CSV',
           record_count: parsedData.length,
           min_date: dateRange.start,
           max_date: dateRange.end,
           columns: Object.keys(parsedData[0] || {})
         })
         .select()
         .single();

       if (datasetError) throw datasetError;

       // Insert data in chunks to avoid request size limits
       const chunkSize = 500;
       for (let i = 0; i < parsedData.length; i += chunkSize) {
         const chunk = parsedData.slice(i, i + chunkSize);
         const { error } = await supabase.from('air_quality').insert(chunk);
         if (error) throw error;
       }

       return dataset.id;
     } catch (error) {
       console.error('Error saving to Supabase:', error);
       throw error;
     }
   };
   ```

2. **API Endpoints**

   Create API endpoints for data retrieval:

   ```javascript
   // app/api/data/route.js
   import { NextResponse } from 'next/server';
   import { supabase } from '../../../lib/supabase';

   export async function GET(request) {
     try {
       const { searchParams } = new URL(request.url);
       const limit = searchParams.get('limit') || 1000;
       const offset = searchParams.get('offset') || 0;
       
       const { data, error, count } = await supabase
         .from('air_quality')
         .select('*', { count: 'exact' })
         .range(offset, offset + limit - 1);
       
       if (error) throw error;
       
       return NextResponse.json({
         data,
         count,
         limit,
         offset
       });
     } catch (error) {
       return NextResponse.json(
         { error: error.message },
         { status: 500 }
       );
     }
   }
   ```

3. **Filter by Date Range**

   ```javascript
   // app/api/data/filter/route.js
   import { NextResponse } from 'next/server';
   import { supabase } from '../../../../lib/supabase';

   export async function POST(request) {
     try {
       const body = await request.json();
       const { startDate, endDate, limit = 1000, offset = 0 } = body;
       
       const query = supabase
         .from('air_quality')
         .select('*', { count: 'exact' });
       
       if (startDate && endDate) {
         query.gte('datetime', startDate).lte('datetime', endDate);
       }
       
       const { data, error, count } = await query.range(offset, offset + limit - 1);
       
       if (error) throw error;
       
       return NextResponse.json({
         data,
         count,
         limit,
         offset
       });
     } catch (error) {
       return NextResponse.json(
         { error: error.message },
         { status: 500 }
       );
     }
   }
   ```

### AI Integration

1. **API Keys Setup**

   Extract and use API keys from llm5.py:

   ```javascript
   // app/api/ai/query/route.js
   import { NextResponse } from 'next/server';
   import OpenAI from 'openai';
   
   const openai = new OpenAI({
     apiKey: process.env.OPENAI_API_KEY
   });
   
   export async function POST(request) {
     try {
       const { query, data } = await request.json();
       
       const response = await openai.chat.completions.create({
         model: "gpt-4o",
         messages: [
           {
             role: "system",
             content: "You are an expert in indoor air quality analysis."
           },
           {
             role: "user",
             content: `Analyze this air quality data and answer the following question: ${query}\n\nData: ${JSON.stringify(data)}`
           }
         ],
         temperature: 0.7,
         max_tokens: 1000
       });
       
       return NextResponse.json({
         result: response.choices[0].message.content
       });
     } catch (error) {
       return NextResponse.json(
         { error: error.message },
         { status: 500 }
       );
     }
   }
   ```

2. **Gemini Integration**

   ```javascript
   // app/api/ai/gemini/route.js
   import { NextResponse } from 'next/server';
   import { GoogleGenerativeAI } from '@google/generative-ai';
   
   const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
   
   export async function POST(request) {
     try {
       const { query, data } = await request.json();
       
       const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });
       
       const response = await model.generateContent(
         `Analyze this air quality data and answer the following question: ${query}\n\nData: ${JSON.stringify(data)}`
       );
       
       return NextResponse.json({
         result: response.response.text()
       });
     } catch (error) {
       return NextResponse.json(
         { error: error.message },
         { status: 500 }
       );
     }
   }
   ```

## Implementation Timeline

1. **Phase 1: Backend Setup**
   - Create Supabase project
   - Set up database schema
   - Implement basic API endpoints

2. **Phase 2: Frontend Integration**
   - Update upload component to use Supabase
   - Modify map and query components to fetch from API
   - Add loading states and error handling

3. **Phase 3: AI Integration**
   - Implement OpenAI and Gemini API endpoints
   - Create AI query interface
   - Integrate AI analysis with data visualization

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [Google Gemini API](https://ai.google.dev/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)

# SMesh Analyzer - Air Quality Monitoring

A Next.js application for air quality data analysis and visualization.

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Create a `.env.local` file from `.env.local.example`
4. Run the development server:
```bash
npm run dev
```

## Supabase Setup

To use the Supabase backend for data storage:

1. Create a Supabase account and project at [supabase.com](https://supabase.com)
2. Add your Supabase URL and keys to `.env.local`
3. Run the database setup script:
```bash
npm run supabase:setup
```

Alternatively, you can run the SQL from `supabase/migrations/20240411_create_air_quality_table.sql` directly in the Supabase SQL Editor.

## Troubleshooting

### "Could not find the 'pm10Standard' column of 'air_quality'" Error

If you see this error during data upload:

1. This is a column naming case mismatch - the database uses lowercase column names (`pm10standard`), but the code is using camelCase (`pm10Standard`)
2. The application has been updated to handle both naming formats
3. For more details, see [Column Naming Documentation](docs/column-naming.md)

### "The air_quality table does not exist" Error (Even though it exists in Supabase)

If you can see the table in your Supabase dashboard but still get this error:

1. This is likely due to Row Level Security (RLS) policies blocking access
2. Run the RLS fix script:
```bash
npm run supabase:fix-rls
```
3. Or manually execute this SQL in your Supabase SQL Editor:
```sql
-- Enable RLS on the table
ALTER TABLE IF EXISTS air_quality ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access on air_quality"
ON air_quality FOR SELECT USING (true);

CREATE POLICY "Allow public insert on air_quality"
ON air_quality FOR INSERT WITH CHECK (true);
```

### Duplicate API Routes Error

If you see warnings about duplicate routes:
```
⚠ Duplicate page detected. pages/api/upload.js and app/api/upload/route.js resolve to /api/upload
```

1. This happens because you have API routes in both the `/pages/api` and `/app/api` directories
2. Delete one of the duplicate routes to resolve the conflict
3. We recommend using the App Router (`/app/api`) for all new routes

### Local Storage Fallback

If Supabase is not configured or encounters errors, the app will fall back to using browser local storage. This has limitations:
- Size restrictions (typically 5-10MB)
- Data is not persistent across browsers/devices
- Data is cleared when browser storage is cleared

For production use, we recommend setting up Supabase for proper data storage.

## Features

- Upload and process CSV air quality data
- Filter data by date range
- Visualize data on interactive maps
- Analyze trends and patterns
- AI-powered insights with OpenAI and Google Gemini integration

## Technology Stack

- Next.js
- React
- Tailwind CSS 
- Leaflet for mapping
- Supabase for data storage
- Plotly.js for charts and visualizations