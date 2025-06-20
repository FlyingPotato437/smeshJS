-- Create vector database for AI knowledge base
-- This enables semantic search and RAG (Retrieval-Augmented Generation)

-- Enable the pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table for storing document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS embeddings (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(1536),  -- OpenAI text-embedding-3-small dimensions
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast vector similarity search
CREATE INDEX IF NOT EXISTS embeddings_embedding_idx ON embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS embeddings_metadata_idx ON embeddings USING GIN (metadata);

-- Create index on content for text search
CREATE INDEX IF NOT EXISTS embeddings_content_idx ON embeddings USING GIN (to_tsvector('english', content));

-- Fire management knowledge base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for knowledge_base
CREATE INDEX IF NOT EXISTS knowledge_base_category_idx ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS knowledge_base_tags_idx ON knowledge_base USING GIN (tags);
CREATE INDEX IF NOT EXISTS knowledge_base_content_search_idx ON knowledge_base USING GIN (to_tsvector('english', content));

-- Enable Row Level Security
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Create secure policies for production readiness
-- Read access is public for demo, but write access requires authentication

CREATE POLICY "Allow public read access on embeddings"
ON embeddings FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on embeddings"
ON embeddings FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public read access on knowledge_base"
ON knowledge_base FOR SELECT
USING (true);

CREATE POLICY "Allow authenticated insert on knowledge_base"
ON knowledge_base FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to perform semantic search
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    embeddings.id,
    embeddings.content,
    embeddings.metadata,
    1 - (embeddings.embedding <=> query_embedding) AS similarity
  FROM embeddings
  WHERE 1 - (embeddings.embedding <=> query_embedding) > match_threshold
  ORDER BY embeddings.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Function to search knowledge base by category and text
CREATE OR REPLACE FUNCTION search_knowledge_base(
  search_term text DEFAULT '',
  category_filter text DEFAULT NULL,
  limit_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  title text,
  content text,
  category text,
  source text,
  tags text[],
  rank float
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    kb.source,
    kb.tags,
    ts_rank(to_tsvector('english', kb.content), plainto_tsquery('english', search_term)) AS rank
  FROM knowledge_base kb
  WHERE 
    (category_filter IS NULL OR kb.category = category_filter)
    AND (search_term = '' OR to_tsvector('english', kb.content) @@ plainto_tsquery('english', search_term))
  ORDER BY rank DESC
  LIMIT limit_count;
$$;

-- Insert initial fire management knowledge base
INSERT INTO knowledge_base (title, content, category, source, tags, metadata) VALUES
(
  'Optimal Weather Conditions for Prescribed Fires',
  'Safe prescribed fire weather conditions require careful monitoring of multiple atmospheric variables. Wind speed should be between 5-15 mph with consistent direction to ensure predictable fire behavior and smoke dispersion. Relative humidity should range from 30-50% for most ecosystems, providing adequate moisture to prevent excessive fire intensity while allowing proper combustion. Temperature should be maintained between 45-85°F depending on fuel type and local conditions. Atmospheric stability should be neutral to slightly unstable to promote good smoke dispersion. The Haines Index should be 4-6 for optimal atmospheric mixing. No precipitation should be forecast for 24-48 hours post-burn to allow for proper mop-up operations.',
  'weather',
  'NWCG Prescribed Fire Guidelines',
  ARRAY['weather', 'wind', 'humidity', 'temperature', 'safety'],
  '{"difficulty": "beginner", "importance": "critical", "season": "all"}'
),
(
  'Fuel Moisture Guidelines',
  'Critical fuel moisture levels are essential for safe and effective prescribed burning. Fine fuels (1-hour timelag) should have moisture content between 6-12% for most burns, providing optimal ignition and spread rates. Medium fuels (10-hour timelag) should be 8-15% moisture content. Heavy fuels (100-hour timelag) should maintain 12-20% moisture. Live fuel moisture must exceed 80% for safety margins, reducing the risk of crown fires and uncontrolled spread. Duff moisture should be above 40% to prevent deep smoldering that can be difficult to extinguish and may reignite days later.',
  'fuels',
  'Fire Behavior Field Reference Guide',
  ARRAY['fuel', 'moisture', 'safety', 'ignition'],
  '{"difficulty": "intermediate", "importance": "critical", "measurement_required": true}'
),
(
  'Prescribed Fire Safety Protocols',
  'Essential safety measures for prescribed fire operations must be strictly followed. Establish firebreaks at minimum 1.5 times the expected flame length to contain the fire. Maintain proper crew ratios with 1 supervisor per 6-8 firefighters to ensure adequate oversight. Position water sources every 300-500 feet along the burn perimeter for quick access. Monitor RAWS weather stations continuously throughout the operation. Establish clear escape routes and safety zones before ignition. Conduct comprehensive daily weather briefings with all personnel. Have dedicated mop-up crews ready for 24-72 hours post-burn to address any hotspots or rekindling.',
  'safety',
  'Interagency Prescribed Fire Standards',
  ARRAY['safety', 'crew', 'protocols', 'equipment'],
  '{"difficulty": "beginner", "importance": "critical", "compliance_required": true}'
),
(
  'Oak Woodland Burning Guidelines',
  'Oak woodland ecosystems require specific burning protocols for optimal management. Burn interval should be 3-5 years to maintain oak regeneration and understory diversity. Optimal burning season is late fall to early spring when oak trees are dormant and soil moisture is adequate. Fire intensity should be low to moderate to avoid damage to oak bark and cambium. Target flame lengths of 2-4 feet with residence times of 15-30 seconds. Pre-burn fuel moisture should be 8-12% for fine fuels. Post-burn monitoring should focus on oak seedling survival and invasive species control.',
  'ecosystems',
  'California Fire Management Handbook',
  ARRAY['oak', 'woodland', 'ecosystem', 'timing'],
  '{"ecosystem_type": "oak_woodland", "burn_interval_years": "3-5", "season": "fall_winter"}'
),
(
  'Chaparral Fire Management',
  'Chaparral ecosystems present unique challenges requiring specialized approaches. Burn intervals should be 15-30 years to allow for proper shrub maturation and seed bank development. Optimal burning season is fall or early winter when moisture conditions reduce escape potential. Fire intensity should be moderate to high to achieve desired ecological effects and shrub mortality. Pre-burn preparation must include extensive fuel breaks due to high fire intensity potential. Post-burn monitoring is critical for erosion control and invasive species management. Special attention to weather windows is essential due to extreme fire behavior potential.',
  'ecosystems',
  'California Fire Management Handbook',
  ARRAY['chaparral', 'shrubland', 'high_intensity', 'erosion'],
  '{"ecosystem_type": "chaparral", "burn_interval_years": "15-30", "intensity": "moderate_to_high"}'
),
(
  'Grassland Prescribed Burning',
  'Grassland ecosystems are well-suited to frequent, low-intensity prescribed fires. Burn intervals should be 1-3 years to maintain native grass vigor and control woody encroachment. Optimal burning season is late spring to early summer when cool-season grasses are dormant but warm-season grasses are beginning growth. Fire intensity should be low to moderate with fast-moving fire fronts. Fine fuel moisture should be 6-10% for optimal ignition and spread. Post-burn grazing management is crucial for achieving desired ecological outcomes.',
  'ecosystems',
  'California Fire Management Handbook',
  ARRAY['grassland', 'frequent_fire', 'grazing', 'woody_control'],
  '{"ecosystem_type": "grassland", "burn_interval_years": "1-3", "timing": "spring_summer"}'
);

-- Insert corresponding embeddings (these would normally be generated by OpenAI embedding API)
-- For now, we'll insert placeholder vectors that would be replaced by actual embeddings
INSERT INTO embeddings (content, metadata, embedding) VALUES
(
  'Safe prescribed fire weather conditions require careful monitoring of multiple atmospheric variables. Wind speed should be between 5-15 mph with consistent direction to ensure predictable fire behavior and smoke dispersion.',
  '{"source": "NWCG Prescribed Fire Guidelines", "category": "weather", "keywords": ["weather", "wind", "safety"]}',
  array_fill(0, ARRAY[1536])::vector  -- Placeholder vector
),
(
  'Critical fuel moisture levels are essential for safe and effective prescribed burning. Fine fuels (1-hour timelag) should have moisture content between 6-12% for most burns.',
  '{"source": "Fire Behavior Field Reference Guide", "category": "fuels", "keywords": ["fuel", "moisture", "safety"]}',
  array_fill(0, ARRAY[1536])::vector  -- Placeholder vector
),
(
  'Essential safety measures for prescribed fire operations must be strictly followed. Establish firebreaks at minimum 1.5 times the expected flame length to contain the fire.',
  '{"source": "Interagency Prescribed Fire Standards", "category": "safety", "keywords": ["safety", "protocols", "firebreaks"]}',
  array_fill(0, ARRAY[1536])::vector  -- Placeholder vector
);

-- Add comments to tables
COMMENT ON TABLE embeddings IS 'Vector embeddings for semantic search and RAG functionality';
COMMENT ON TABLE knowledge_base IS 'Structured fire management knowledge base for AI training and reference';
COMMENT ON FUNCTION search_embeddings IS 'Performs cosine similarity search on vector embeddings';
COMMENT ON FUNCTION search_knowledge_base IS 'Full-text search on knowledge base with category filtering';