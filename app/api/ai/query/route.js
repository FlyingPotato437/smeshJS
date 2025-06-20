import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { retrieveContext } from '../../../../lib/rag-service';
import { getFireManagementData } from '../../../../lib/query-service';

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

/**
 * GET /api/ai/query
 * Simple query interface for testing RAG functionality
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'air quality monitoring';
    const limit = parseInt(searchParams.get('limit') || '5');
    const threshold = parseFloat(searchParams.get('threshold') || '0.75');
    
    const results = await retrieveContext(query, {
      limit,
      threshold,
      contextType: 'general'
    });
    
    return NextResponse.json({
      success: true,
      query,
      ...results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Query GET error:', error);
    return NextResponse.json({
      success: false,
      error: 'Query processing failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/query
 * Enhanced AI query with context retrieval and response generation
 */
export async function POST(request) {
  try {
    const { query, options = {} } = await request.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Query is required and must be a string'
      }, { status: 400 });
    }
    
    // Retrieve relevant context
    const contextResults = await retrieveContext(query, {
      limit: options.limit || 5,
      threshold: options.threshold || 0.75,
      contextType: options.contextType || 'general'
    });
    
    // Get additional environmental data if needed
    let environmentalData = [];
    if (options.includeEnvironmentalData !== false) {
      environmentalData = await getFireManagementData({ 
        limit: options.dataLimit || 10 
      });
    }
    
    // Generate AI response if OpenAI is available
    let aiResponse = '';
    if (openai && (contextResults.results.length > 0 || environmentalData.length > 0)) {
      try {
        const contextSummary = contextResults.results.length > 0
          ? contextResults.results.map(item => `${item.title}: ${item.content}`).join('\n\n')
          : 'No specific knowledge base context found.';
        
        const dataSummary = environmentalData.length > 0
          ? `Recent environmental data (${environmentalData.length} records):
${environmentalData.slice(0, 5).map(record => 
  `- ${record.timestamp || record.datetime}: PM2.5 ${record.pm25 || 'N/A'}, Temp ${record.temperature}°C, Humidity ${record.humidity || record.relativehumidity}%, Location: ${record.location ? record.location.join(', ') : 'N/A'}`
).join('\n')}`
          : 'No recent environmental data available.';
        
        const prompt = `You are an expert AI assistant for environmental monitoring and air quality analysis.

RELEVANT CONTEXT:
${contextSummary}

ENVIRONMENTAL DATA:
${dataSummary}

USER QUERY: "${query}"

Based on the above information, provide a comprehensive and helpful response that:
1. Directly addresses the user's question
2. References relevant data when available
3. Provides actionable insights
4. Maintains scientific accuracy

If environmental data shows concerning conditions, highlight these appropriately.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1000,
          temperature: 0.7
        });

        aiResponse = completion.choices[0]?.message?.content;
        
      } catch (aiError) {
        console.warn('AI response generation failed:', aiError.message);
      }
    }
    
    // Fallback response if AI generation fails
    if (!aiResponse) {
      aiResponse = `Based on your query "${query}", I found ${contextResults.results.length} relevant knowledge items and ${environmentalData.length} environmental data points. 

${contextResults.results.length > 0 ? 'Key insights:\n' + contextResults.results.slice(0, 3).map(item => `• ${item.title}: ${item.content.substring(0, 150)}...`).join('\n') : ''}

${environmentalData.length > 0 ? `\nCurrent environmental conditions show temperature range from ${Math.min(...environmentalData.map(d => d.temperature))}°C to ${Math.max(...environmentalData.map(d => d.temperature))}°C across monitoring locations.` : ''}

For more detailed analysis, please provide a more specific query.`;
    }
    
    return NextResponse.json({
      success: true,
      query,
      response: aiResponse,
      context: {
        method: contextResults.method,
        sources: contextResults.results.length,
        environmentalRecords: environmentalData.length
      },
      knowledgeItems: contextResults.results,
      environmentalData: environmentalData.slice(0, 5), // Return sample of data
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Query POST error:', error);
    return NextResponse.json({
      success: false,
      error: 'Query processing failed',
      details: error.message
    }, { status: 500 });
  }
}