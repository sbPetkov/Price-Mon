module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          blacklist: null,
          whitelist: [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY',
            'SUPABASE_MCP_ACCESS_TOKEN',
            'GOOGLE_MAPS_API_KEY'
          ],
          safe: true,
          allowUndefined: true
        }
      ]
    ]
  };
}; 