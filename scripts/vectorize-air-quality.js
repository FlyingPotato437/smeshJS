#!/usr/bin/env node

/**
 * Vectorize air_quality rows into Supabase embeddings table.
 * Usage: node scripts/vectorize-air-quality.js [--limit 1000]
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and OPENAI_API_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

async function main() {
  const limitArgIdx = process.argv.findIndex(a => a === '--limit');
  const limit = limitArgIdx !== -1 ? Number(process.argv[limitArgIdx + 1]) : 1000;

  console.log(`🔄 Fetching up to ${limit} air_quality rows without embeddings …`);

  // Get rows without a matching embedding (by id)
  const { data: rows, error } = await supabase
    .rpc('get_air_quality_without_embedding', { row_limit: limit });

  if (error) {
    console.error('Error fetching rows:', error.message);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log('✅ Nothing to vectorize — all rows already embedded.');
    return;
  }

  console.log(`📄 Need to embed ${rows.length} rows …`);

  for (const row of rows) {
    try {
      const text = JSON.stringify({
        datetime: row.datetime,
        pm25standard: row.pm25standard,
        pm10standard: row.pm10standard,
        from_node: row.from_node,
        temperature: row.temperature,
        relativehumidity: row.relativehumidity,
        latitude: row.latitude,
        longitude: row.longitude
      });

      const emb = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
        encoding_format: 'float'
      });

      const vec = emb.data[0].embedding;

      const { error: insertErr } = await supabase.from('embeddings').insert({
        content: text,
        metadata: {
          source: 'air_quality',
          air_quality_id: row.id,
          datetime: row.datetime,
          from_node: row.from_node
        },
        embedding: vec
      });

      if (insertErr) throw insertErr;

      console.log(`✅ Embedded row id ${row.id}`);
    } catch (e) {
      console.warn(`⚠️  Failed to embed row id ${row.id}:`, e.message);
    }
  }

  console.log('🎉 Vectorization complete.');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
}); 