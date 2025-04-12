-- Add latitude and longitude columns to the stores table
ALTER TABLE stores 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Comment on columns to provide documentation
COMMENT ON COLUMN stores.latitude IS 'Store location latitude coordinate';
COMMENT ON COLUMN stores.longitude IS 'Store location longitude coordinate';

-- Add an index for geospatial queries (optional, for future performance)
CREATE INDEX idx_stores_location ON stores (latitude, longitude);

-- Convert existing coordinates data if present (assuming it's a point type or similar)
-- This is a placeholder - you may need to modify based on your actual data structure
-- UPDATE stores SET latitude = ST_X(coordinates::geometry), longitude = ST_Y(coordinates::geometry) WHERE coordinates IS NOT NULL; 