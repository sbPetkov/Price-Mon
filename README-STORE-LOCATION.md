# Store Location Feature

## Database Setup

The store location feature requires adding latitude and longitude columns to your 'stores' table in Supabase. We've included an SQL script to make this change easily.

### Running the SQL Script

1. Go to your Supabase dashboard: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to the SQL Editor in the left sidebar
4. Create a new query
5. Copy and paste the contents of the `add_location_columns.sql` file into the editor
6. Click "Run" to execute the script

**Script Contents:**
```sql
-- Add latitude and longitude columns to the stores table
ALTER TABLE stores 
ADD COLUMN latitude DOUBLE PRECISION,
ADD COLUMN longitude DOUBLE PRECISION;

-- Comment on columns to provide documentation
COMMENT ON COLUMN stores.latitude IS 'Store location latitude coordinate';
COMMENT ON COLUMN stores.longitude IS 'Store location longitude coordinate';

-- Add an index for geospatial queries (optional)
CREATE INDEX idx_stores_location ON stores (latitude, longitude);
```

## Fallback Behavior

If you haven't run the SQL script yet, the app will handle this gracefully:

1. When adding a store with location, you'll receive an error message
2. You'll be given the option to continue adding the store without location data
3. Later, when you run the SQL script, you can update existing stores with their locations

## Troubleshooting

If you encounter issues with PostGIS or other database errors:

1. Check if the SQL script executed successfully
2. Ensure your Supabase instance supports the PostGIS extension (most do by default)
3. If you see errors about `geometry_columns` or `geography_columns`, these are PostGIS system tables and should be left as-is

## Additional Information

The current implementation uses basic latitude/longitude coordinates. For more advanced geospatial features, consider:

1. Enabling the PostGIS extension in Supabase (if not already enabled)
2. Converting coordinates to proper geometry types
3. Using spatial queries for features like "stores near me" 