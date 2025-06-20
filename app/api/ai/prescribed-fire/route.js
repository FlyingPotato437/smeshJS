import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { retrieveContext } from '../../../../lib/rag-service';
import { getFireManagementData, checkDatabaseStatus } from '../../../../lib/query-service';

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
 * POST /api/ai/prescribed-fire
 * Specialized endpoint for prescribed fire management queries
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

    // Retrieve fire management context using shared RAG service
    console.log('Retrieving fire management context...');
    const contextResults = await retrieveContext(query, {
      limit: options.limit || 5,
      threshold: options.threshold || 0.75,
      contextType: 'fire'
    });

    // Get environmental data for fire management
    console.log('Fetching environmental data for fire analysis...');
    const environmentalData = await getFireManagementData({ 
      limit: options.dataLimit || 20,
      includeDeviceInfo: true 
    });

    // Generate specialized fire management response
    let fireAnalysis = '';
    
    if (openai && (contextResults.results.length > 0 || environmentalData.length > 0)) {
      try {
        const contextSummary = contextResults.results.length > 0
          ? contextResults.results.map(item => `${item.title}: ${item.content}`).join('\n\n')
          : 'Using real-time environmental data for fire management analysis.';
        
        const environmentalSummary = environmentalData.length > 0
          ? formatEnvironmentalDataForFire(environmentalData)
          : 'No recent environmental monitoring data available.';

        const firePrompt = `You are a specialized AI assistant for prescribed fire management and planning. Analyze the following information to provide expert guidance on prescribed fire operations.

FIRE MANAGEMENT KNOWLEDGE:
${contextSummary}

CURRENT ENVIRONMENTAL CONDITIONS:
${environmentalSummary}

FIRE MANAGEMENT QUERY: "${query}"

Provide a comprehensive response covering:
1. Direct answer to the fire management question
2. Safety considerations based on current conditions
3. Environmental impact assessment
4. Operational recommendations
5. Weather and air quality implications
6. Timing and planning considerations

Focus on practical fire management guidance while emphasizing safety protocols. If environmental conditions show elevated risks (high temperatures, low humidity, poor air quality), clearly highlight these concerns and provide appropriate recommendations.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: firePrompt }],
          max_tokens: 1200,
          temperature: 0.6
        });

        fireAnalysis = completion.choices[0]?.message?.content;
        
      } catch (aiError) {
        console.warn('Fire analysis generation failed:', aiError.message);
      }
    }

    // Fallback analysis if AI generation fails
    if (!fireAnalysis) {
      fireAnalysis = generateFallbackFireAnalysis(query, contextResults, environmentalData);
    }

    // Assess current fire conditions based on environmental data
    const fireConditionAssessment = assessFireConditions(environmentalData);

    return NextResponse.json({
      success: true,
      query,
      fireAnalysis,
      fireConditions: fireConditionAssessment,
      context: {
        method: contextResults.method,
        knowledgeSources: contextResults.results.length,
        environmentalRecords: environmentalData.length
      },
      knowledgeBase: contextResults.results.slice(0, 3), // Top 3 relevant items
      environmentalData: environmentalData.slice(0, 10), // Recent environmental readings
      recommendations: generateFireRecommendations(environmentalData),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Prescribed fire analysis error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Prescribed fire analysis failed',
      details: error.message,
      fallback: 'Unable to process prescribed fire query. Please consult with certified fire management personnel for operational decisions.'
    }, { status: 500 });
  }
}

/**
 * GET /api/ai/prescribed-fire
 * Get current fire management status and environmental conditions
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeRecommendations = searchParams.get('recommendations') === 'true';
    
    // Get current environmental data
    const environmentalData = await getFireManagementData({ limit: 50 });
    
    // Assess current conditions
    const fireConditions = assessFireConditions(environmentalData);
    
    // Check database status
    const dbStatus = await checkDatabaseStatus();
    
    const response = {
      success: true,
      currentConditions: fireConditions,
      environmentalData: environmentalData.slice(0, 10),
      databaseStatus: dbStatus,
      timestamp: new Date().toISOString()
    };
    
    if (includeRecommendations) {
      response.recommendations = generateFireRecommendations(environmentalData);
    }
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Fire status check error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Fire status check failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Format environmental data for fire management context
 */
function formatEnvironmentalDataForFire(environmentalData) {
  if (!environmentalData || environmentalData.length === 0) {
    return 'No environmental monitoring data available.';
  }

  const summary = environmentalData.slice(0, 10);
  const avgTemp = summary.reduce((sum, d) => sum + (d.temperature || 0), 0) / summary.length;
  const avgHumidity = summary.reduce((sum, d) => sum + (d.humidity || d.relativehumidity || 0), 0) / summary.length;
  const maxPM25 = Math.max(...summary.map(d => d.pm25 || 0));
  
  return `Recent environmental conditions (${environmentalData.length} monitoring points):

Average Temperature: ${avgTemp.toFixed(1)}°C
Average Humidity: ${avgHumidity.toFixed(1)}%
Maximum PM2.5: ${maxPM25.toFixed(1)} μg/m³

Recent readings:
${summary.map(record => 
  `- ${record.timestamp || record.datetime}: ${record.temperature}°C, ${record.humidity || record.relativehumidity}%RH, PM2.5 ${record.pm25 || 'N/A'} μg/m³${record.location ? ` at ${record.location.join(', ')}` : ''}`
).join('\n')}`;
}

/**
 * Assess fire conditions based on environmental data
 */
function assessFireConditions(environmentalData) {
  if (!environmentalData || environmentalData.length === 0) {
    return {
      overall: 'unknown',
      temperature: 'unknown',
      humidity: 'unknown',
      airQuality: 'unknown',
      risk: 'unknown'
    };
  }

  const recent = environmentalData.slice(0, 10);
  const avgTemp = recent.reduce((sum, d) => sum + (d.temperature || 0), 0) / recent.length;
  const avgHumidity = recent.reduce((sum, d) => sum + (d.humidity || d.relativehumidity || 0), 0) / recent.length;
  const maxPM25 = Math.max(...recent.map(d => d.pm25 || 0));

  // Assess temperature conditions for prescribed fire
  let tempCondition = 'favorable';
  if (avgTemp > 35) tempCondition = 'high_risk';
  else if (avgTemp > 30) tempCondition = 'elevated';
  else if (avgTemp < 5) tempCondition = 'low';

  // Assess humidity conditions
  let humidityCondition = 'favorable';
  if (avgHumidity < 20) humidityCondition = 'very_low';
  else if (avgHumidity < 30) humidityCondition = 'low';
  else if (avgHumidity > 80) humidityCondition = 'high';

  // Assess air quality
  let airQualityCondition = 'good';
  if (maxPM25 > 150) airQualityCondition = 'unhealthy';
  else if (maxPM25 > 100) airQualityCondition = 'sensitive_groups';
  else if (maxPM25 > 50) airQualityCondition = 'moderate';

  // Overall risk assessment
  let overallRisk = 'low';
  if (tempCondition === 'high_risk' || humidityCondition === 'very_low') {
    overallRisk = 'high';
  } else if (tempCondition === 'elevated' || humidityCondition === 'low' || airQualityCondition === 'moderate') {
    overallRisk = 'moderate';
  }

  return {
    overall: overallRisk,
    temperature: tempCondition,
    humidity: humidityCondition,
    airQuality: airQualityCondition,
    metrics: {
      avgTemperature: Math.round(avgTemp * 10) / 10,
      avgHumidity: Math.round(avgHumidity * 10) / 10,
      maxPM25: Math.round(maxPM25 * 10) / 10
    }
  };
}

/**
 * Generate fire management recommendations
 */
function generateFireRecommendations(environmentalData) {
  const conditions = assessFireConditions(environmentalData);
  const recommendations = [];

  // Temperature-based recommendations
  if (conditions.temperature === 'high_risk') {
    recommendations.push({
      category: 'temperature',
      priority: 'critical',
      message: 'Extreme temperature conditions detected. Consider postponing prescribed burns.',
      action: 'Monitor temperature trends and wait for cooler conditions'
    });
  } else if (conditions.temperature === 'elevated') {
    recommendations.push({
      category: 'temperature',
      priority: 'caution',
      message: 'Elevated temperatures require increased vigilance and additional safety measures.',
      action: 'Ensure adequate crew hydration and rest periods'
    });
  }

  // Humidity-based recommendations
  if (conditions.humidity === 'very_low') {
    recommendations.push({
      category: 'humidity',
      priority: 'critical',
      message: 'Very low humidity increases fire intensity and spread risk.',
      action: 'Consider postponing operations or implementing additional containment measures'
    });
  } else if (conditions.humidity === 'low') {
    recommendations.push({
      category: 'humidity',
      priority: 'caution',
      message: 'Low humidity conditions require careful monitoring.',
      action: 'Maintain readiness for rapid fire behavior changes'
    });
  }

  // Air quality recommendations
  if (conditions.airQuality === 'unhealthy') {
    recommendations.push({
      category: 'air_quality',
      priority: 'critical',
      message: 'Poor air quality conditions may affect crew health and public safety.',
      action: 'Consider delaying operations and monitor air quality forecasts'
    });
  } else if (conditions.airQuality === 'sensitive_groups') {
    recommendations.push({
      category: 'air_quality',
      priority: 'caution',
      message: 'Air quality may affect sensitive individuals.',
      action: 'Coordinate with local health authorities and issue public advisories'
    });
  }

  // General recommendations
  recommendations.push({
    category: 'monitoring',
    priority: 'standard',
    message: 'Continue environmental monitoring throughout operations.',
    action: 'Maintain real-time monitoring of weather and air quality conditions'
  });

  return recommendations;
}

/**
 * Generate fallback fire analysis when AI is unavailable
 */
function generateFallbackFireAnalysis(query, contextResults, environmentalData) {
  const conditions = assessFireConditions(environmentalData);
  
  return `Prescribed Fire Management Analysis for: "${query}"

Current Environmental Assessment:
- Overall Risk Level: ${conditions.overall.toUpperCase()}
- Temperature Conditions: ${conditions.temperature}
- Humidity Conditions: ${conditions.humidity}  
- Air Quality Status: ${conditions.airQuality}

${environmentalData.length > 0 ? `Based on ${environmentalData.length} recent environmental readings, average conditions show ${conditions.metrics?.avgTemperature}°C temperature and ${conditions.metrics?.avgHumidity}% relative humidity.` : ''}

${contextResults.results.length > 0 ? `Knowledge base search returned ${contextResults.results.length} relevant items from fire management resources.` : ''}

General Recommendations:
- Monitor weather conditions continuously
- Maintain crew safety protocols
- Assess smoke management requirements
- Coordinate with local authorities
- Follow established prescribed fire guidelines

${conditions.overall === 'high' ? 'CAUTION: Current conditions indicate elevated risk. Consider postponing operations or implementing additional safety measures.' : 'Current conditions appear suitable for prescribed fire operations with standard safety protocols.'}

For detailed operational guidance, consult with certified prescribed fire specialists and local fire management authorities.`;
}