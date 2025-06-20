import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import { supabase } from '../../../../lib/supabase';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/ai/vectorize
 * Generate embeddings and store in vector database
 */
export async function POST(request) {
  try {
    const { text, metadata = {} } = await request.json();
    
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required and must be a string' },
        { status: 400 }
      );
    }

    // Generate embedding using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
      encoding_format: 'float'
    });

    const embedding = embeddingResponse.data[0].embedding;
    
    // Store in Supabase vector database
    const { data, error } = await supabase
      .from('embeddings')
      .insert({
        content: text,
        metadata: {
          ...metadata,
          created_by: 'api',
          embedding_model: 'text-embedding-3-small'
        },
        embedding: embedding
      })
      .select()
      .single();

    if (error) {
      console.error('Error storing embedding:', error);
      return NextResponse.json(
        { error: 'Failed to store embedding in database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: data.id,
      embedding_dimensions: embedding.length,
      metadata: data.metadata
    });

  } catch (error) {
    console.error('Error in vectorize endpoint:', error);
    
    if (error.code === 'insufficient_quota') {
      return NextResponse.json({
        error: 'OpenAI API quota exceeded. Using fallback knowledge base.',
        fallback: true
      }, { status: 200 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate embedding' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/vectorize/search
 * Perform semantic search using vector similarity
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const threshold = parseFloat(searchParams.get('threshold') || '0.78');
    const limit = parseInt(searchParams.get('limit') || '5');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query,
      encoding_format: 'float'
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;
    
    // Perform vector similarity search
    const { data, error } = await supabase.rpc('search_embeddings', {
      query_embedding: queryEmbedding,
      match_threshold: threshold,
      match_count: limit
    });

    if (error) {
      console.error('Error performing vector search:', error);
      
      // Fallback to knowledge base search
      const { data: fallbackData, error: fallbackError } = await supabase
        .rpc('search_knowledge_base', {
          search_term: query,
          limit_count: limit
        });
      
      if (fallbackError) {
        throw new Error('Both vector and fallback search failed');
      }
      
      return NextResponse.json({
        results: fallbackData || [],
        query,
        method: 'fallback_text_search',
        threshold,
        limit
      });
    }

    return NextResponse.json({
      results: data || [],
      query,
      method: 'vector_similarity',
      threshold,
      limit,
      found: data?.length || 0
    });

  } catch (error) {
    console.error('Error in vector search:', error);
    
    // Final fallback - return empty results with error info
    return NextResponse.json({
      results: [],
      error: error.message,
      fallback_available: true
    }, { status: 200 });
  }
}

/**
 * PUT /api/ai/vectorize/populate
 * Populate vector database with knowledge base
 */
export async function PUT(request) {
  try {
    // Get all knowledge base entries that don't have embeddings yet
    const { data: knowledgeEntries, error: kbError } = await supabase
      .from('knowledge_base')
      .select('*');
    
    if (kbError) {
      throw new Error('Failed to fetch knowledge base entries');
    }

    const results = [];
    
    for (const entry of knowledgeEntries) {
      try {
        // Check if embedding already exists
        const { data: existingEmbedding } = await supabase
          .from('embeddings')
          .select('id')
          .eq('metadata->knowledge_base_id', entry.id)
          .single();
        
        if (existingEmbedding) {
          results.push({ id: entry.id, status: 'exists', title: entry.title });
          continue;
        }

        // Generate embedding for the content
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: `${entry.title}\n\n${entry.content}`,
          encoding_format: 'float'
        });

        const embedding = embeddingResponse.data[0].embedding;
        
        // Store embedding
        const { error: insertError } = await supabase
          .from('embeddings')
          .insert({
            content: `${entry.title}\n\n${entry.content}`,
            metadata: {
              knowledge_base_id: entry.id,
              title: entry.title,
              category: entry.category,
              source: entry.source,
              tags: entry.tags,
              embedding_model: 'text-embedding-3-small'
            },
            embedding: embedding
          });

        if (insertError) {
          results.push({ 
            id: entry.id, 
            status: 'error', 
            title: entry.title, 
            error: insertError.message 
          });
        } else {
          results.push({ id: entry.id, status: 'created', title: entry.title });
        }

      } catch (entryError) {
        results.push({ 
          id: entry.id, 
          status: 'error', 
          title: entry.title, 
          error: entryError.message 
        });
      }
    }

    const successful = results.filter(r => r.status === 'created').length;
    const existing = results.filter(r => r.status === 'exists').length;
    const errors = results.filter(r => r.status === 'error').length;

    return NextResponse.json({
      success: true,
      summary: {
        total: knowledgeEntries.length,
        created: successful,
        existing: existing,
        errors: errors
      },
      details: results
    });

  } catch (error) {
    console.error('Error populating vector database:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to populate vector database' },
      { status: 500 }
    );
  }
}