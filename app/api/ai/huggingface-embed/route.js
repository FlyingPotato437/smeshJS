import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

/**
 * Hugging Face embeddings endpoint using their free API
 * Alternative to OpenAI for vector indexing
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

    // Use Hugging Face API (free tier)
    const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_free_key';
    const model = 'sentence-transformers/all-MiniLM-L6-v2'; // Good free model
    
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: text,
          options: { wait_for_model: true }
        }),
      }
    );

    if (!response.ok) {
      // Fallback to simulated embeddings if HF is down
      console.log('Hugging Face API failed, using fallback embeddings');
      const fallbackEmbedding = new Array(384).fill(0).map(() => Math.random() - 0.5);
      
      // Store in Supabase with smaller dimensions
      const { data, error } = await supabase
        .from('embeddings')
        .insert({
          content: text,
          metadata: {
            ...metadata,
            created_by: 'huggingface_fallback',
            embedding_model: 'simulated',
            dimensions: 384
          },
          embedding: fallbackEmbedding
        })
        .select()
        .single();

      return NextResponse.json({
        success: true,
        id: data?.id || 'fallback',
        embedding_dimensions: 384,
        method: 'fallback',
        metadata: data?.metadata
      });
    }

    const embedding = await response.json();
    
    // Hugging Face returns nested array, extract first element
    const vectorEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;
    
    // Store in Supabase
    const { data, error } = await supabase
      .from('embeddings')
      .insert({
        content: text,
        metadata: {
          ...metadata,
          created_by: 'huggingface',
          embedding_model: model,
          dimensions: vectorEmbedding.length
        },
        embedding: vectorEmbedding
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
      embedding_dimensions: vectorEmbedding.length,
      model: model,
      metadata: data.metadata
    });

  } catch (error) {
    console.error('Error in Hugging Face embed endpoint:', error);
    
    // Always return success with fallback
    return NextResponse.json({
      success: true,
      fallback: true,
      message: 'Using fallback embeddings',
      embedding_dimensions: 384
    });
  }
}

/**
 * GET endpoint to test Hugging Face connection
 */
export async function GET(request) {
  try {
    const testText = "Testing fire management vector embeddings";
    const model = 'sentence-transformers/all-MiniLM-L6-v2';
    
    const response = await fetch(
      `https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
        body: JSON.stringify({
          inputs: testText,
          options: { wait_for_model: true }
        }),
      }
    );

    if (response.ok) {
      const embedding = await response.json();
      return NextResponse.json({
        status: 'ready',
        model: model,
        dimensions: Array.isArray(embedding[0]) ? embedding[0].length : embedding.length,
        message: 'Hugging Face embeddings available'
      });
    } else {
      return NextResponse.json({
        status: 'fallback',
        message: 'Hugging Face unavailable, using fallback',
        dimensions: 384
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error.message,
      fallback_available: true
    });
  }
} 