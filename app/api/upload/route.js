import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import Papa from 'papaparse';

/**
 * POST /api/upload
 * Handle file upload with session-based temporary storage
 */
export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const userIP = request.headers.get('x-forwarded-for') || 'unknown';
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json({ error: 'Only CSV files are supported' }, { status: 400 });
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }
    
    // Create upload session
    const { data: session, error: sessionError } = await supabase
      .from('upload_sessions')
      .insert({
        user_ip: userIP,
        file_name: file.name,
        file_size: file.size,
        metadata: { upload_time: new Date().toISOString() }
      })
      .select()
      .single();
    
    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return NextResponse.json({ error: 'Failed to create upload session' }, { status: 500 });
    }
    
    // Parse CSV file
    const fileText = await file.text();
    
    return new Promise((resolve) => {
      Papa.parse(fileText, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            console.log(`📊 Processing ${results.data.length} rows for session ${session.id}`);
            
            // Process and clean data
            const cleanedData = results.data
              .map(row => processRow(row, session.id))
              .filter(row => row !== null);
            
            if (cleanedData.length === 0) {
              await supabase.from('upload_sessions').delete().eq('id', session.id);
              resolve(NextResponse.json({ error: 'No valid data found in CSV' }, { status: 400 }));
              return;
            }
            
            // Insert data in batches for better performance
            const batchSize = 100;
            let insertedCount = 0;
            
            for (let i = 0; i < cleanedData.length; i += batchSize) {
              const batch = cleanedData.slice(i, i + batchSize);
              
              const { error: insertError } = await supabase
                .from('session_data')
                .insert(batch);
              
              if (insertError) {
                console.error(`Batch insert error (${i}-${i + batch.length}):`, insertError);
                // Continue with other batches
              } else {
                insertedCount += batch.length;
              }
            }
            
            console.log(`✅ Inserted ${insertedCount}/${cleanedData.length} records`);
            
            // Update session with processing results
            await supabase
              .from('upload_sessions')
              .update({
                metadata: {
                  ...session.metadata,
                  processed_rows: insertedCount,
                  total_rows: results.data.length,
                  processing_complete: true
                }
              })
              .eq('id', session.id);
            
            resolve(NextResponse.json({
              success: true,
              sessionId: session.id,
              message: `Successfully processed ${insertedCount} records`,
              stats: {
                totalRows: results.data.length,
                processedRows: insertedCount,
                sessionExpires: session.expires_at
              }
            }));
            
          } catch (error) {
            console.error('Data processing error:', error);
            
            // Cleanup session on error
            await supabase.from('upload_sessions').delete().eq('id', session.id);
            
            resolve(NextResponse.json({
              error: 'Failed to process data',
              details: error.message
            }, { status: 500 }));
          }
        },
        error: async (error) => {
          console.error('CSV parsing error:', error);
          
          // Cleanup session on error
          await supabase.from('upload_sessions').delete().eq('id', session.id);
          
          resolve(NextResponse.json({
            error: 'Failed to parse CSV file',
            details: error.message
          }, { status: 400 }));
        }
      });
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Upload failed',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Process and normalize a single CSV row
 */
function processRow(row, sessionId) {
  try {
    // Extract and normalize common field names
    const datetime = parseDateTime(
      row.datetime || row.timestamp || row.date || row.time
    );
    
    if (!datetime) {
      return null; // Skip rows without valid datetime
    }
    
    // Parse numeric fields safely
    const parseFloat = (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };
    
    return {
      session_id: sessionId,
      datetime,
      from_node: row.from_node || row.device_id || row.sensor_id || 'unknown',
      device_name: row.device_name || row.from_node || row.sensor_name || 'unknown',
      
      // PM measurements
      pm1standard: parseFloat(row.pm1standard || row.pm1 || row['PM1.0']),
      pm25standard: parseFloat(row.pm25standard || row.pm25 || row['PM2.5'] || row.pm2_5),
      pm10standard: parseFloat(row.pm10standard || row.pm10 || row['PM10'] || row.pm_10),
      pm100standard: parseFloat(row.pm100standard || row.pm100 || row['PM100']),
      
      // Environmental measurements
      temperature: parseFloat(row.temperature || row.temp || row.Temperature),
      relativehumidity: parseFloat(row.relativehumidity || row.humidity || row.Humidity),
      barometricpressure: parseFloat(row.barometricpressure || row.pressure || row.Pressure),
      
      // Air quality measurements
      gasresistance: parseFloat(row.gasresistance || row.gas_resistance),
      iaq: parseFloat(row.iaq || row.IAQ),
      voc: parseFloat(row.voc || row.VOC),
      co2: parseFloat(row.co2 || row.CO2),
      
      // Location
      latitude: parseFloat(row.latitude || row.lat || row.Latitude),
      longitude: parseFloat(row.longitude || row.lng || row.lon || row.Longitude),
      elevation: parseFloat(row.elevation || row.alt || row.Elevation),
      
      // Store raw data for debugging
      raw_data: row
    };
    
  } catch (error) {
    console.warn('Row processing error:', error.message);
    return null;
  }
}

/**
 * Parse various datetime formats
 */
function parseDateTime(dateString) {
  if (!dateString) return null;
  
  try {
    // Try ISO format first
    const date = new Date(dateString);
    
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/upload
 * Get upload session info and cleanup expired sessions
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');
    
    if (action === 'cleanup') {
      // Cleanup expired sessions
      const { data, error } = await supabase.rpc('cleanup_expired_sessions');
      
      if (error) {
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        cleanedSessions: data || 0
      });
    }
    
    if (sessionId) {
      // Get specific session info
      const { data: session, error } = await supabase
        .from('upload_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error || !session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Get data count for this session
      const { count } = await supabase
        .from('session_data')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId);
      
      return NextResponse.json({
        session,
        dataCount: count || 0,
        isExpired: new Date(session.expires_at) < new Date()
      });
    }
    
    // Get all active sessions
    const { data: sessions, error } = await supabase
      .from('upload_sessions')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }
    
    return NextResponse.json({ sessions: sessions || [] });
    
  } catch (error) {
    console.error('GET upload error:', error);
    return NextResponse.json({ error: 'Request failed' }, { status: 500 });
  }
} 