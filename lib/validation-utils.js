import { z } from 'zod';

/**
 * Validation schemas for LLM-generated content
 * Ensures type safety and prevents crashes from malformed AI responses
 */

// Schema for query parameters generated by LLM
export const QueryParamsSchema = z.object({
  table: z.string().min(1),
  filters: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'not_is']),
    value: z.any()
  })).optional().default([]),
  limit: z.number().min(1).max(500).optional().default(100),
  orderBy: z.string().optional(),
  orderDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  joins: z.array(z.string()).optional().default([])
});

// Schema for fire management analysis responses
export const FireAnalysisSchema = z.object({
  riskLevel: z.enum(['low', 'moderate', 'high', 'extreme']).optional(),
  recommendations: z.array(z.string()).optional().default([]),
  weatherConditions: z.object({
    temperature: z.number().optional(),
    humidity: z.number().optional(),
    windSpeed: z.number().optional(),
    windDirection: z.string().optional()
  }).optional(),
  analysis: z.string().min(1)
});

// Schema for environmental data responses
export const EnvironmentalDataSchema = z.object({
  location: z.array(z.number()).length(2).optional(),
  timestamp: z.string().optional(),
  temperature: z.number().optional(),
  humidity: z.number().optional(),
  pm25: z.number().optional(),
  pm10: z.number().optional(),
  source: z.string().optional()
});

/**
 * Safe JSON parsing with schema validation
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} jsonString - JSON string to parse
 * @returns {Object} Result with success boolean and either data or error
 */
export function safeJsonParse(schema, jsonString) {
  try {
    // Basic validation that input looks like JSON
    if (!jsonString || typeof jsonString !== 'string') {
      return {
        success: false,
        error: 'Input is not a valid string'
      };
    }

    const trimmed = jsonString.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
      return {
        success: false,
        error: 'Input does not appear to be a JSON object'
      };
    }

    // Parse JSON
    const parsed = JSON.parse(trimmed);
    
    // Validate against schema
    const validationResult = schema.safeParse(parsed);
    
    if (validationResult.success) {
      return {
        success: true,
        data: validationResult.data
      };
    } else {
      return {
        success: false,
        error: `Schema validation failed: ${validationResult.error.message}`,
        validationErrors: validationResult.error.errors
      };
    }
    
  } catch (parseError) {
    return {
      success: false,
      error: `JSON parsing failed: ${parseError.message}`
    };
  }
}

/**
 * Safe parsing specifically for LLM query parameter generation
 * @param {string} llmResponse - Raw LLM response
 * @returns {Object} Parsed and validated query parameters or error
 */
export function parseLLMQueryParams(llmResponse) {
  const result = safeJsonParse(QueryParamsSchema, llmResponse);
  
  if (!result.success) {
    // Return safe defaults with error info
    return {
      success: false,
      error: result.error,
      fallback: {
        table: 'air_quality',
        filters: [],
        limit: 100,
        orderBy: 'datetime',
        orderDirection: 'desc'
      }
    };
  }
  
  // Additional security validation
  const { table, filters } = result.data;
  
  // Validate table name (whitelist approach)
  const allowedTables = ['air_quality', 'sensor_readings', 'fire_data', 'weather_data'];
  if (!allowedTables.includes(table)) {
    return {
      success: false,
      error: `Table '${table}' is not allowed`,
      fallback: {
        table: 'air_quality',
        filters: [],
        limit: 100,
        orderBy: 'datetime',
        orderDirection: 'desc'
      }
    };
  }
  
  // Validate field names in filters (basic SQL injection prevention)
  const allowedFields = [
    'id', 'datetime', 'timestamp', 'temperature', 'humidity', 'pm25', 'pm10',
    'latitude', 'longitude', 'device_id', 'burn_unit', 'status', 'risk_level'
  ];
  
  for (const filter of filters || []) {
    if (!allowedFields.includes(filter.field)) {
      return {
        success: false,
        error: `Field '${filter.field}' is not allowed`,
        fallback: {
          table,
          filters: [],
          limit: result.data.limit,
          orderBy: result.data.orderBy,
          orderDirection: result.data.orderDirection
        }
      };
    }
  }
  
  return {
    success: true,
    data: result.data
  };
}


/**
 * Create canonical data format for consistent RAG service output
 * @param {Array} results - Raw results from various sources
 * @param {string} method - Method used to retrieve data
 * @returns {Object} Standardized response format
 */
export function createCanonicalResponse(results, method = 'unknown') {
  try {
    const canonicalResults = results.map(item => ({
      title: item.title || 'Environmental Data',
      content: item.content || '',
      source: item.source || 'Unknown',
      metadata: {
        category: item.metadata?.category || 'environmental',
        dataType: item.metadata?.dataType || item.metadata?.data_type || 'unknown',
        location: item.metadata?.location || [0, 0],
        timestamp: item.metadata?.timestamp || item.metadata?.datetime || new Date().toISOString(),
        confidence: item.similarity || item.metadata?.confidence || 0.5
      }
    }));
    
    return {
      success: true,
      results: canonicalResults,
      method,
      count: canonicalResults.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create canonical response: ${error.message}`,
      results: [],
      method,
      count: 0,
      timestamp: new Date().toISOString()
    };
  }
}

export default {
  QueryParamsSchema,
  FireAnalysisSchema,
  EnvironmentalDataSchema,
  safeJsonParse,
  parseLLMQueryParams,
  createCanonicalResponse
};