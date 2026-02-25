require('dotenv').config();
const base = require('./app.json');

module.exports = {
  ...base,
  expo: {
    ...base.expo,
    plugins: [
      ...(base.expo.plugins || []),
      'expo-secure-store',
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'BrighteEats needs your location to show your position on the map and calculate delivery routes.',
          locationWhenInUsePermission: 'BrighteEats needs your location to show your position on the map and calculate delivery routes.',
        },
      ],
    ],
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      tomtomApiKey: process.env.TOMTOM_API_KEY,
    },
  },
};
