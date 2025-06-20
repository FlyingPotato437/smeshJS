-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for air quality data
CREATE TABLE IF NOT EXISTS air_quality_embeddings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(1536) -- OpenAI text-embedding-3-small dimension
);

-- Create index for fast similarity search
CREATE INDEX IF NOT EXISTS air_quality_embeddings_embedding_idx 
ON air_quality_embeddings USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create match function for air quality embeddings
CREATE OR REPLACE FUNCTION match_air_quality_embeddings(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM air_quality_embeddings
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create knowledge base table for general knowledge
CREATE TABLE IF NOT EXISTS knowledge_base (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT,
  tags TEXT[],
  source TEXT,
  embedding VECTOR(1536)
);

-- Create index for knowledge base
CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx 
ON knowledge_base USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create match function for knowledge base
CREATE OR REPLACE FUNCTION match_knowledge_base(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.78,
  match_count INT DEFAULT 5
) RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  source TEXT,
  similarity FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    title,
    content,
    category,
    tags,
    source,
    1 - (embedding <=> query_embedding) AS similarity
  FROM knowledge_base
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Create text search function for fallback
CREATE OR REPLACE FUNCTION search_knowledge_base_text(
  search_term TEXT,
  limit_count INT DEFAULT 5
) RETURNS TABLE (
  id BIGINT,
  title TEXT,
  content TEXT,
  category TEXT,
  tags TEXT[],
  source TEXT,
  rank FLOAT
) LANGUAGE SQL STABLE AS $$
  SELECT
    id,
    title,
    content,
    category,
    tags,
    source,
    ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', search_term)) AS rank
  FROM knowledge_base
  WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', search_term)
  ORDER BY rank DESC
  LIMIT limit_count;
$$;

-- Insert some default air quality knowledge
INSERT INTO knowledge_base (title, content, category, source) VALUES
('Air Quality Index (AQI) Standards', 'The Air Quality Index (AQI) is a standardized way to communicate air quality. AQI values: 0-50 Good (Green), 51-100 Moderate (Yellow), 101-150 Unhealthy for Sensitive Groups (Orange), 151-200 Unhealthy (Red), 201-300 Very Unhealthy (Purple), 301+ Hazardous (Maroon). PM2.5 and PM10 are key particulate matter indicators.', 'air_quality', 'EPA Standards'),

('PM2.5 Health Effects', 'PM2.5 particles are fine particulate matter with a diameter of 2.5 micrometers or smaller. These particles can penetrate deep into lungs and even enter the bloodstream. Health effects include respiratory issues, cardiovascular problems, and increased risk of heart attacks and strokes. Sensitive groups include children, elderly, and people with respiratory conditions.', 'health', 'EPA Health Guidelines'),

('Environmental Monitoring Best Practices', 'Continuous monitoring of air quality requires measurement of PM2.5, PM10, temperature, humidity, and meteorological conditions. Optimal sensor placement is away from direct pollution sources, at breathing height (1.5-4m), and with adequate ventilation. Data should be validated and calibrated regularly.', 'monitoring', 'Environmental Guidelines'),

('Fire and Air Quality Relationship', 'Wildfires and prescribed burns significantly impact air quality by releasing PM2.5, PM10, carbon monoxide, and other pollutants. Smoke can travel hundreds of miles from the source. During fire events, air quality can rapidly deteriorate from Good to Hazardous levels. Real-time monitoring is critical for public health protection.', 'fire_management', 'Fire Science Research')

ON CONFLICT DO NOTHING;

-- Grant permissions
GRANT SELECT ON air_quality_embeddings TO anon, authenticated;
GRANT SELECT ON knowledge_base TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_air_quality_embeddings(VECTOR, FLOAT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION match_knowledge_base(VECTOR, FLOAT, INT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION search_knowledge_base_text(TEXT, INT) TO anon, authenticated; 