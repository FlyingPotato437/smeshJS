import { NextResponse } from 'next/server';
import OpenAI from 'openai';

/**
 * POST handler for generating precise database queries using OpenAI with temperature=0
 * Takes the initial analysis and generates a SQL query
 */
export async function POST(request) {
  // Get API key from environment variables
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Check if OpenAI API key is configured
  if (!apiKey) {
    console.warn("OpenAI API key not configured, returning mock response");
    
    // For development, return a mock response
    return NextResponse.json({
      query: "SELECT datetime, pm25Standard, pm10Standard, temperature, relativeHumidity FROM air_quality ORDER BY datetime DESC LIMIT 100",
      explanation: "This query fetches the most recent air quality measurements.",
      mockResponse: true
    }, { status: 200 });
  }
  
  try {
    // Parse the request body
    const body = await request.json();
    
    // Check if we have the expected format
    if (!body.query || !body.initialAnalysis) {
      return NextResponse.json(
        { error: "Query and initialAnalysis are required in the request body" },
        { status: 400 }
      );
    }
    
    // Extract query and initial analysis from the request
    const { query, initialAnalysis } = body;
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });
    
    // Create a system prompt for SQL generation with common air quality fields
    const systemPrompt = `You are an expert SQL developer. Generate precise PostgreSQL queries to extract relevant air quality data.

Available database schema:
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
  elevation TEXT
);

Generate a single SQL query that addresses the user's question. 
Focus on precision and correctness.
Use accurate PostgreSQL syntax.
Include appropriate aggregation functions for numerical analysis.
Use proper GROUP BY clauses when calculating averages or other aggregations.
For time-based data, use PostgreSQL's datetime functions.
For location-based queries, include latitude and longitude columns.
Return ONLY the SQL query without explanations or comments.`;
    
    // Call the OpenAI API with temperature=0 for precise query generation
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `User question: ${query}\n\nInitial analysis: ${initialAnalysis}\n\nGenerate a PostgreSQL query to retrieve the data needed to answer this question.` }
      ],
      temperature: 0.0, // Using temperature 0 for precise and deterministic generation
      max_tokens: 500,
    });
    
    // Extract the generated SQL query
    const generatedQuery = completion.choices[0].message.content.trim();
    
    // Generate an explanation for the query (optional, with higher temperature)
    const explanationCompletion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert at explaining SQL queries in plain English. Be concise but clear." },
        { role: "user", content: `Explain this SQL query in simple terms: ${generatedQuery}` }
      ],
      temperature: 0.7,
      max_tokens: 150,
    });
    
    const explanation = explanationCompletion.choices[0].message.content.trim();
    
    // Return the generated query and explanation
    return NextResponse.json({
      query: generatedQuery,
      explanation: explanation,
      model: completion.model
    });
  } catch (error) {
    console.error("Error generating database query:", error);
    
    // Check if we're in development or API key is missing
    if (process.env.NODE_ENV === 'development' || !apiKey) {
      return NextResponse.json({
        query: "SELECT datetime, pm25Standard, pm10Standard, temperature, relativeHumidity FROM air_quality ORDER BY datetime DESC LIMIT 100",
        explanation: "This query fetches the most recent air quality measurements.",
        mockResponse: true
      }, { status: 200 });
    }
    
    // Return error in production
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 