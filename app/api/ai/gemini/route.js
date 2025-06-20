import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { retrieveContext, generateQueryParams } from '../../../../lib/rag-service';
import { executeQuery, getFireManagementData } from '../../../../lib/query-service';

// Initialize OpenAI with fallback handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI initialization skipped - API key not configured');
}

// Initialize Gemini with fallback handling
let genAI = null;
try {
  if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
} catch (error) {
  console.warn('Gemini initialization skipped - API key not configured');
}

/**
 * AI Fire Analysis Pipeline:
 * 1. Initial analysis with OpenAI
 * 2. Retrieve relevant context using RAG
 * 3. Query structured data with safe parameters
 * 4. Final analysis combining all information
 */
export async function POST(request) {
  try {
    const { message, context } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    let initialInsights = '';
    let ragContext = { results: [], method: 'none' };
    let fireData = [];
    let finalAnalysis = '';

    // STEP 1: Initial Analysis with OpenAI
    console.log('Step 1: Performing initial analysis...');
    
    if (openai) {
      try {
        const initialAnalysisPrompt = `You are Prescribed Fire GPT, an expert AI assistant for prescribed fire management. Analyze the following user query and provide initial insights about fire management aspects, safety considerations, and data needs.

User Query: "${message}"

Provide a structured initial analysis covering:
1. Fire management context and relevance
2. Key safety considerations
3. Data requirements for comprehensive analysis
4. Specific metrics or measurements needed

Keep this analysis concise but thorough.`;

        const initialAnalysis = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: initialAnalysisPrompt }],
          max_tokens: 800,
          temperature: 0.3
        });

        initialInsights = initialAnalysis.choices[0]?.message?.content;
      } catch (openaiError) {
        console.warn('OpenAI analysis failed:', openaiError.message);
      }
    }
    
    if (!initialInsights) {
      initialInsights = `Initial Analysis for: "${message}"

1. Fire management context: This query relates to prescribed fire operations and environmental monitoring.
2. Key safety considerations: Weather conditions, fuel moisture, crew safety, and air quality impacts.
3. Data requirements: Real-time environmental data including PM2.5, PM10, temperature, humidity, and location data.
4. Specific metrics needed: Air quality measurements, weather parameters, and geographic distribution.

Using real environmental data for analysis...`;
    }

    // STEP 2: Retrieve Relevant Context using RAG
    console.log('Step 2: Retrieving relevant context...');
    
    try {
      ragContext = await retrieveContext(message, {
        limit: 5,
        threshold: 0.75,
        contextType: 'fire'
      });
    } catch (ragError) {
      console.warn('RAG context retrieval failed:', ragError.message);
    }

    // STEP 3: Get Structured Environmental Data
    console.log('Step 3: Fetching structured environmental data...');
    
    try {
      // Generate safe query parameters instead of SQL
      const paramResult = await generateQueryParams(message, 'normalized');
      
      if (paramResult.success) {
        // Execute the structured query
        const queryResult = await executeQuery(paramResult.data);
        
        if (queryResult.success && queryResult.data.length > 0) {
          fireData = queryResult.data;
        } else {
          // Fallback to fire management data
          fireData = await getFireManagementData({ limit: 50 });
        }
      } else {
        console.warn('Query parameter generation failed:', paramResult.error);
        // Use direct fire management data
        fireData = await getFireManagementData({ limit: 50 });
      }
      
      console.log(`Retrieved ${fireData.length} environmental records`);
      
    } catch (dataError) {
      console.error('Environmental data retrieval failed:', dataError);
      // Get fallback data
      fireData = await getFireManagementData({ limit: 50 });
    }

    // STEP 4: Final Analysis with Gemini
    console.log('Step 4: Generating comprehensive analysis...');
    
    if (genAI && (ragContext.results.length > 0 || fireData.length > 0)) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Prepare context data
        const contextSummary = ragContext.results.length > 0 
          ? ragContext.results.map(item => `${item.title}: ${item.content}`).join('\n\n')
          : 'Using real-time environmental data for analysis.';
        
        // Prepare environmental data summary
        const dataSummary = fireData.length > 0 
          ? `Recent environmental conditions (${fireData.length} records):
${fireData.slice(0, 10).map(record => 
  `- ${record.timestamp || record.datetime}: PM2.5 ${record.pm25 || 'N/A'}, PM10 ${record.pm10 || 'N/A'}, Temp ${record.temperature}°C, Humidity ${record.humidity || record.relativehumidity}%, Location: ${record.location ? record.location.join(', ') : 'N/A'}`
).join('\n')}`
          : 'No environmental data available.';

        const finalPrompt = `You are Prescribed Fire GPT, an expert AI assistant for prescribed fire management and environmental analysis.

INITIAL ANALYSIS:
${initialInsights}

RELEVANT KNOWLEDGE CONTEXT:
${contextSummary}

CURRENT ENVIRONMENTAL DATA:
${dataSummary}

USER QUERY: "${message}"

Based on all the above information, provide a comprehensive analysis that:
1. Directly addresses the user's specific question
2. Incorporates relevant safety considerations for prescribed fires
3. References actual environmental data when available
4. Provides actionable recommendations
5. Explains the scientific basis for your conclusions

Focus on practical fire management insights while maintaining scientific accuracy. If the data shows concerning air quality or weather conditions, highlight these appropriately.`;

        const result = await model.generateContent(finalPrompt);
        finalAnalysis = result.response.text();
        
      } catch (geminiError) {
        console.warn('Gemini analysis failed:', geminiError.message);
      }
    }

    // Fallback final analysis if Gemini fails
    if (!finalAnalysis) {
      finalAnalysis = `Based on your query: "${message}"

${initialInsights}

Current Environmental Conditions:
${fireData.length > 0 ? `Analyzing ${fireData.length} recent environmental readings shows varying conditions across monitoring locations. Key observations include temperature ranges from ${Math.min(...fireData.map(d => d.temperature))}°C to ${Math.max(...fireData.map(d => d.temperature))}°C, and particulate matter levels indicating ${fireData.some(d => (d.pm25 || 0) > 50) ? 'elevated' : 'acceptable'} air quality conditions.` : 'Environmental monitoring data is currently being updated.'}

For prescribed fire management, it's essential to continuously monitor weather conditions, air quality impacts, and maintain safety protocols. Current data suggests ${fireData.length > 0 && fireData.some(d => d.temperature > 30) ? 'elevated temperature conditions requiring additional precautions' : 'conditions within normal operational parameters'}.

Recommendations:
- Continue monitoring PM2.5 and PM10 levels
- Assess wind patterns and atmospheric stability  
- Maintain crew safety protocols
- Consider smoke management strategies
- Monitor weather forecasts for changes`;
    }

    // Return comprehensive response
    return NextResponse.json({
      success: true,
      analysis: finalAnalysis,
      initialInsights,
      context: {
        method: ragContext.method,
        sources: ragContext.results.length,
        dataPoints: fireData.length
      },
      environmentalData: fireData.length > 0 ? {
        recordCount: fireData.length,
        latestReading: fireData[0]?.timestamp || fireData[0]?.datetime,
        temperatureRange: fireData.length > 0 ? {
          min: Math.min(...fireData.map(d => d.temperature)),
          max: Math.max(...fireData.map(d => d.temperature))
        } : null
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fire analysis pipeline error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Analysis pipeline failed',
      details: error.message,
      fallback: 'The prescribed fire analysis system encountered an issue. Please check your query and try again. For immediate fire management decisions, please consult with certified fire management personnel.'
    }, { status: 500 });
  }
}