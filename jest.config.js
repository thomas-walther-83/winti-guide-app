/** @type {import('jest').Config} */
module.exports = {
  preset: 'react-native',

  // Run global mocks (e.g. AsyncStorage) before each test suite
  setupFiles: ['./jest.setup.js'],

  // Tell Jest to transform these ESM packages used by Expo / Supabase.
  // The pattern allows ALL node_modules to be ignored EXCEPT the listed ones.
  transformIgnorePatterns: [
    [
      'node_modules/(?!(',
      // React Native core and community packages
      '(jest-)?react-native',
      '|@react-native(-community)?',
      // Expo SDK
      '|expo(nent)?',
      '|@expo(nent)?/.*',
      '|@expo-google-fonts/.*',
      // Navigation
      '|react-navigation',
      '|@react-navigation/.*',
      // Supabase (uses ESM)
      '|@supabase/.*',
      // AsyncStorage
      '|@react-native-async-storage/.*',
      '))',
    ].join(''),
  ],

  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],

  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
