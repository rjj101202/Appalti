// Jest setup file
// Add custom matchers or global test setup here

// Mock environment variables for tests
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/appalti-test';
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Suppress console warnings during tests (optional)
// global.console = {
//   ...console,
//   warn: jest.fn(),
//   error: jest.fn(),
// };

