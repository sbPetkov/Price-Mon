# Barcode Price Tracker

An app to scan barcodes, track product prices across different stores, and share shopping lists with friends.

## Environment Variables

This project uses environment variables for sensitive configuration. Follow these steps to set up your development environment:

### Setup

1. Create a `.env` file in the root directory of the project.
2. Add the following environment variables to your `.env` file:

```
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Supabase MCP Access Token (for Cursor)
SUPABASE_MCP_ACCESS_TOKEN=your_supabase_mcp_token

# Google Maps API Key (required for Android maps)
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

3. Replace the placeholder values with your actual credentials.

### Notes

- The `.env` file is excluded from git in `.gitignore` to prevent exposing your secrets.
- For development, the app includes fallback values if environment variables are not set.
- For production builds, ensure all environment variables are properly set.
- For Android, the Google Maps API key is required to use the maps functionality.

## Running the App

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Features

- Barcode scanning
- Product price tracking
- Store location mapping
- Shopping list sharing via QR codes
- Price alerts 