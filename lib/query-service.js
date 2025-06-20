import { supabase } from './supabase';

/**
 * Execute database query using structured parameters
 * @param {Object} queryParams - Query parameters from generateQueryParams
 * @returns {Promise<Object>} Query results with metadata
 */
export async function executeQuery(queryParams) {
  try {
    const { table, filters, limit, orderBy, orderDirection, joins } = queryParams;
    
    let query;
    
    // Handle normalized schema with joins
    if (table === 'sensor_readings' && joins) {
      query = supabase
        .from('sensor_readings')
        .select(`
          *,
          device:devices!inner(*)
        `);
    } else if (table === 'sensor_readings') {
      query = supabase
        .from('sensor_readings')
        .select(`
          *,
          device:devices!inner(*)
        `);
    } else {
      query = supabase.from(table).select('*');
    }
    
    // Apply filters
    if (filters && Array.isArray(filters)) {
      filters.forEach(filter => {
        const { field, operator, value } = filter;
        
        switch (operator) {
          case 'eq':
            query = query.eq(field, value);
            break;
          case 'neq':
            query = query.neq(field, value);
            break;
          case 'gt':
            query = query.gt(field, value);
            break;
          case 'gte':
            query = query.gte(field, value);
            break;
          case 'lt':
            query = query.lt(field, value);
            break;
          case 'lte':
            query = query.lte(field, value);
            break;
          case 'like':
            query = query.like(field, `%${value}%`);
            break;
          case 'ilike':
            query = query.ilike(field, `%${value}%`);
            break;
          case 'is':
            query = query.is(field, value);
            break;
          case 'not_is':
            query = query.not(field, 'is', value);
            break;
          default:
            console.warn(`Unknown operator: ${operator}`);
        }
      });
    }
    
    // Apply default filters for data quality
    if (table === 'sensor_readings') {
      query = query
        .neq('temperature', 0)
        .neq('humidity', 0);
    } else if (table === 'air_quality') {
      query = query
        .not('latitude', 'is', null)
        .neq('temperature', 0)
        .neq('relativehumidity', 0)
        .neq('latitude', 0)
        .neq('longitude', 0);
    }
    
    // Apply ordering and limit
    if (orderBy) {
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });
    }
    
    if (limit) {
      query = query.limit(Math.min(limit, 500));
    }
    
    let { data, error } = await query;
    
    if (error) {
      console.error('Database query error:', error);
      return {
        success: false,
        error: error.message,
        data: [],
        queryParams
      };
    }
    
    return {
      success: true,
      data: data || [],
      count: data?.length || 0,
      queryParams,
      table
    };
    
  } catch (error) {
    console.error('Error executing query:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      queryParams
    };
  }
}

/**
 * Get data for AI analysis from user upload sessions
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Formatted data for analysis
 */
export async function getFireManagementData(options = {}) {
  const { limit = 50, sessionId = null } = options;
  
  try {
    console.log('Fetching session-based data for LLM...');
    
    if (sessionId) {
      // Get data from specific session
      const { data: sessionData, error: sessionError } = await supabase.rpc('get_session_data', {
        session_uuid: sessionId,
        data_limit: limit
      });
      
      if (!sessionError && sessionData && sessionData.length > 0) {
        console.log(`✅ Retrieved ${sessionData.length} records from session ${sessionId}`);
        return sessionData.map(record => ({
          id: record.id,
          timestamp: record.datetime,
          temperature: record.temperature,
          humidity: record.humidity,
          pm25: record.pm25,
          pm10: record.pm10,
          pm1: record.pm1,
          deviceName: record.device_name,
          latitude: record.latitude,
          longitude: record.longitude,
          location: record.location,
          source: 'session_upload'
        }));
      }
    }
    
    // If no session specified or no data found, get from most recent active session
    const { data: recentSessions, error: sessionsError } = await supabase
      .from('upload_sessions')
      .select('id')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (!sessionsError && recentSessions && recentSessions.length > 0) {
      const recentSessionId = recentSessions[0].id;
      
      const { data: sessionData, error: sessionError } = await supabase.rpc('get_session_data', {
        session_uuid: recentSessionId,
        data_limit: limit
      });
      
      if (!sessionError && sessionData && sessionData.length > 0) {
        console.log(`✅ Retrieved ${sessionData.length} records from recent session ${recentSessionId}`);
        return sessionData.map(record => ({
          id: record.id,
          timestamp: record.datetime,
          temperature: record.temperature,
          humidity: record.humidity,
          pm25: record.pm25,
          pm10: record.pm10,
          pm1: record.pm1,
          deviceName: record.device_name,
          latitude: record.latitude,
          longitude: record.longitude,
          location: record.location,
          source: 'session_upload'
        }));
      }
    }
    
    console.log('⚠️ No session data available - users need to upload files first');
    return [];
    
  } catch (error) {
    console.error('Error in getFireManagementData:', error);
    return [];
  }
}

/**
 * Get data for data explorer from session uploads
 * @param {Object} options - Query options including sessionId
 * @returns {Promise<Array>} Raw session data for display
 */
export async function getSessionData(options = {}) {
  const { sessionId, limit = 1000 } = options;
  
  try {
    if (!sessionId) {
      // Get most recent session if none specified
      const { data: recentSessions } = await supabase
        .from('upload_sessions')
        .select('id')
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!recentSessions || recentSessions.length === 0) {
        return [];
      }
      
      return getSessionData({ sessionId: recentSessions[0].id, limit });
    }
    
    // Get data from specific session
    const { data: rawData, error } = await supabase
      .from('session_data')
      .select('*')
      .eq('session_id', sessionId)
      .order('datetime', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching session data:', error);
      return [];
    }
    
    return rawData || [];
    
  } catch (error) {
    console.error('Error in getSessionData:', error);
    return [];
  }
}

/**
 * Check database connectivity and schema status
 */
export async function checkDatabaseStatus() {
  const status = {
    connected: false,
    normalizedSchema: false,
    legacySchema: false,
    vectorSearch: false,
    knowledgeBase: false
  };
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('air_quality')
      .select('id')
      .limit(1);
    
    status.connected = !error;
    status.legacySchema = !error && data !== null;
    
    // Test normalized schema
    const { data: sensorData, error: sensorError } = await supabase
      .from('sensor_readings')
      .select('id')
      .limit(1);
    
    status.normalizedSchema = !sensorError && sensorData !== null;
    
    // Test vector search function
    try {
      const { error: vectorError } = await supabase.rpc('search_embeddings', {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 0.75,
        match_count: 1
      });
      status.vectorSearch = !vectorError;
    } catch (e) {
      status.vectorSearch = false;
    }
    
    // Test knowledge base function
    try {
      const { error: kbError } = await supabase.rpc('search_knowledge_base', {
        search_term: 'test',
        limit_count: 1
      });
      status.knowledgeBase = !kbError;
    } catch (e) {
      status.knowledgeBase = false;
    }
    
  } catch (error) {
    console.error('Database status check failed:', error);
  }
  
  return status;
}