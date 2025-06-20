import { OpenAI } from 'openai';
import { supabase } from './supabase';
import { parseLLMQueryParams, createCanonicalResponse, safeJsonParse, QueryParamsSchema } from './validation-utils';
import { getFireManagementData } from './query-service';

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
 * Unified RAG service for retrieving context from vector database
 * @param {string} query - The search query
 * @param {Object} options - Configuration options
 * @param {number} options.limit - Number of results to return (default: 5)
 * @param {number} options.threshold - Similarity threshold (default: 0.78)
 * @param {string} options.contextType - Type of context ('fire', 'air_quality', 'general')
 * @returns {Promise<Object>} Search results with method and metadata
 */
export async function retrieveContext(query, options = {}) {
  const {
    limit = 5,
    threshold = 0.78,
    contextType = 'general'
  } = options;

  try {
    // Step 1: Try vector search if OpenAI is available
    if (openai) {
      try {
        console.log('Generating embedding for query...');
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
          encoding_format: 'float'
        });

        const queryEmbedding = embeddingResponse.data[0].embedding;
        
        // Try knowledge base vector search first
        const { data: vectorResults, error: vectorError } = await supabase.rpc('match_knowledge_base', {
          query_embedding: queryEmbedding,
          match_threshold: threshold,
          match_count: limit
        });

        if (!vectorError && vectorResults && vectorResults.length > 0) {
          console.log(`✅ Found ${vectorResults.length} vector search results`);
          const results = vectorResults.map(item => ({
            title: item.title,
            content: item.content,
            source: item.source || 'Knowledge Base',
            metadata: {
              category: item.category,
              tags: item.tags,
              dataType: 'vector_search',
              confidence: item.similarity
            },
            similarity: item.similarity
          }));
          
          return createCanonicalResponse(results, 'pgvector_search');
        }
      } catch (vectorError) {
        console.warn('Vector search failed:', vectorError.message);
      }
    }

    // Step 2: Try text-based knowledge base search
    try {
      console.log('Trying text-based knowledge search...');
      const { data: textResults, error: textError } = await supabase.rpc('search_knowledge_base_text', {
        search_term: query,
        limit_count: limit
      });

      if (!textError && textResults && textResults.length > 0) {
        console.log(`✅ Found ${textResults.length} text search results`);
        const results = textResults.map(item => ({
          title: item.title,
          content: item.content,
          source: item.source || 'Knowledge Base',
          metadata: { 
            category: item.category, 
            tags: item.tags,
            dataType: 'text_search',
            confidence: item.rank
          },
          similarity: item.rank
        }));
        
        return createCanonicalResponse(results, 'text_search');
      }
    } catch (textError) {
      console.warn('Text search failed:', textError.message);
    }

    // Step 3: Get real air quality data as context
    console.log('Getting real air quality data for context...');
    const realData = await getDirectSupabaseData(query, contextType, limit);
    
    if (realData.results && realData.results.length > 0) {
      console.log(`✅ Found ${realData.results.length} real data records for LLM`);
      return realData;
    }

    // Step 4: Final fallback to hardcoded knowledge
    console.log('All methods failed, using hardcoded knowledge');
    return getHardcodedFallback(query, contextType);

  } catch (error) {
    console.error('Error in retrieveContext:', error);
    return getHardcodedFallback(query, contextType);
  }
}

/**
 * Get direct data from Supabase using consistent query service
 * This ensures consistent data formats across all sources
 */
async function getDirectSupabaseData(query, contextType, limit) {
  try {
    // Use the existing query service for consistent data format
    const environmentalData = await getFireManagementData({ limit });

    if (environmentalData.length === 0) {
      return getHardcodedFallback(query, contextType);
    }

    // Convert to canonical format using consistent mapping
    const results = environmentalData.map(record => ({
      title: `Environmental Conditions - ${record.deviceName || `Location ${record.latitude?.toFixed(3)}`}`,
      content: contextType === 'fire' 
        ? `Fire management context: PM2.5 ${record.pm25 || 'N/A'} μg/m³, PM10 ${record.pm10 || 'N/A'} μg/m³, Temperature ${record.temperature}°C, Humidity ${record.humidity}%. Location: ${record.latitude?.toFixed(3)}, ${record.longitude?.toFixed(3)}. These conditions provide insight into fire behavior potential and air quality impact assessment.`
        : `Environmental reading: PM2.5 ${record.pm25 || 'N/A'} μg/m³, Temperature ${record.temperature}°C, Humidity ${record.humidity}% at ${record.latitude?.toFixed(3)}, ${record.longitude?.toFixed(3)}`,
      source: `Real-time Data (${record.source})`,
      metadata: { 
        category: contextType === 'fire' ? 'fire_management' : 'environmental_conditions',
        dataType: 'real_supabase_data',
        location: [record.latitude, record.longitude],
        timestamp: record.timestamp,
        source: record.source
      }
    }));

    return createCanonicalResponse(results, 'supabase_data_direct');

  } catch (error) {
    console.error('Error getting direct Supabase data:', error);
    return getHardcodedFallback(query, contextType);
  }
}

/**
 * Hardcoded fallback knowledge for when database is unavailable
 */
function getHardcodedFallback(query, contextType) {
  const fireKnowledge = [
    {
      title: "Prescribed Fire Safety Guidelines",
      content: "Prescribed fires require careful planning considering weather conditions, fuel moisture, wind patterns, and crew safety. Key factors include temperature, relative humidity, wind speed and direction, and smoke management.",
      source: "Fire Management Guidelines",
      metadata: { category: "safety", data_type: "hardcoded_fallback" }
    },
    {
      title: "Air Quality Monitoring During Burns",
      content: "Monitor PM2.5 and PM10 levels during prescribed burns. Typical thresholds: Good (0-50 μg/m³), Moderate (51-100 μg/m³), Unhealthy for Sensitive Groups (101-150 μg/m³). Consider meteorological conditions for smoke dispersion.",
      source: "Air Quality Standards",
      metadata: { category: "air_quality", data_type: "hardcoded_fallback" }
    },
    {
      title: "Weather Conditions for Prescribed Burns",
      content: "Optimal burning conditions: Temperature 45-85°F, Relative humidity 25-65%, Wind speed 5-15 mph with consistent direction. Avoid burning during temperature inversions or extreme weather events.",
      source: "Meteorological Guidelines",
      metadata: { category: "weather", data_type: "hardcoded_fallback" }
    }
  ];

  const airQualityKnowledge = [
    {
      title: "Air Quality Index Standards",
      content: "AQI categories: Good (0-50), Moderate (51-100), Unhealthy for Sensitive Groups (101-150), Unhealthy (151-200), Very Unhealthy (201-300), Hazardous (301+). PM2.5 and PM10 are key indicators for particulate pollution.",
      source: "EPA Air Quality Standards",
      metadata: { category: "standards", data_type: "hardcoded_fallback" }
    },
    {
      title: "Environmental Monitoring Best Practices",
      content: "Continuous monitoring of temperature, humidity, particulate matter (PM2.5, PM10), and meteorological conditions provides essential data for environmental management and public health protection.",
      source: "Environmental Monitoring Guidelines",
      metadata: { category: "monitoring", data_type: "hardcoded_fallback" }
    }
  ];

  const knowledge = contextType === 'fire' ? fireKnowledge : airQualityKnowledge;
  const selectedKnowledge = knowledge.slice(0, 3);
  
  return createCanonicalResponse(selectedKnowledge, 'hardcoded_fallback');
}

/**
 * Generate structured query parameters from natural language
 * Uses safe JSON validation to prevent crashes and injection
 */
export async function generateQueryParams(query, schema = 'normalized') {
  const defaultParams = {
    table: schema === 'normalized' ? 'sensor_readings' : 'air_quality',
    filters: [],
    limit: 100,
    orderBy: schema === 'normalized' ? 'timestamp' : 'datetime',
    orderDirection: 'desc'
  };

  if (!openai) {
    return { success: true, data: defaultParams };
  }

  try {
    const schemaInfo = schema === 'normalized' 
      ? `Schema: devices (id, name, latitude, longitude) and sensor_readings (id, device_id, timestamp, pm25, pm10, temperature, humidity)`
      : `Schema: air_quality (id, datetime, pm25standard, pm10standard, temperature, relativehumidity, latitude, longitude)`;

    const prompt = `Based on the user query and database schema, generate query parameters in JSON format.

${schemaInfo}

User Query: "${query}"

Return a JSON object with:
- table: string (table name from schema only)
- filters: array of {field, operator, value} objects (use only fields from schema)
- limit: number (max 500)
- orderBy: string (field name from schema)
- orderDirection: string ('asc' or 'desc')

Allowed operators: eq, neq, gt, gte, lt, lte, like, ilike, is, not_is
Allowed tables: sensor_readings, air_quality, fire_data, weather_data

Example: {"table": "sensor_readings", "filters": [{"field": "temperature", "operator": "gt", "value": 20}], "limit": 100, "orderBy": "timestamp", "orderDirection": "desc"}

Return ONLY valid JSON, no explanation or markdown.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0
    });

    const content = response.choices[0]?.message?.content?.trim();
    
    // Use safe JSON parsing with validation
    const parseResult = parseLLMQueryParams(content);
    
    if (parseResult.success) {
      return { success: true, data: parseResult.data };
    } else {
      console.warn('LLM query parameter validation failed:', parseResult.error);
      return { 
        success: false, 
        error: parseResult.error,
        data: parseResult.fallback || defaultParams
      };
    }

  } catch (error) {
    console.error('Error generating query parameters:', error);
    return { 
      success: false, 
      error: error.message,
      data: defaultParams
    };
  }
}