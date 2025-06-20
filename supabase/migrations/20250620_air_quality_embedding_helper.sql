-- Helper function to return air_quality rows that do not yet have embeddings
-- Requires pgvector migration already applied

CREATE OR REPLACE FUNCTION get_air_quality_without_embedding(row_limit INT DEFAULT 1000)
RETURNS TABLE (
  id bigint,
  datetime timestamp,
  from_node text,
  pm25standard numeric,
  pm10standard numeric,
  temperature numeric,
  relativehumidity numeric,
  latitude numeric,
  longitude numeric
) AS $$
  SELECT aq.id, aq.datetime, aq.from_node, aq.pm25standard, aq.pm10standard,
         aq.temperature, aq.relativehumidity, aq.latitude, aq.longitude
  FROM air_quality aq
  LEFT JOIN embeddings e ON (e.metadata ->> 'air_quality_id')::bigint = aq.id
  WHERE e.id IS NULL
  LIMIT row_limit;
$$ LANGUAGE sql STABLE; 