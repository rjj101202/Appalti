import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function GET() {
  const baseUrl = process.env.KVK_API_URL || 'https://api.kvk.nl/api/v1';
  const jwtSecret = process.env.KVK_JWT_SECRET || '';
  const password = process.env.KVK_PASSWORD || '';

  // Generate token
  const payload = {
    username: 'TNXML08196',
    password: password,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  const token = jwt.sign(payload, jwtSecret);

  const tests = [];

  // Test 1: Check environment variables
  tests.push({
    test: 'Environment Variables',
    baseUrl: baseUrl,
    hasJwtSecret: !!jwtSecret,
    hasPassword: !!password,
    tokenPreview: token.substring(0, 20) + '...'
  });

  // Test 2: Try a simple fetch to the API
  try {
    const testUrl = `${baseUrl}/search/companies?name=test&limit=1`;
    tests.push({
      test: 'API Connection Test',
      url: testUrl,
      status: 'Attempting connection...'
    });

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      // Shorter timeout for testing
      signal: AbortSignal.timeout(5000)
    });

    tests.push({
      test: 'API Response',
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      tests.push({
        test: 'Error Response',
        body: errorText
      });
    } else {
      const data = await response.json();
      tests.push({
        test: 'Success Response',
        data: data
      });
    }
  } catch (error) {
    tests.push({
      test: 'Connection Error',
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        cause: (error as any).cause
      } : 'Unknown error'
    });
  }

  // Test 3: Try without auth headers to see if we can reach the server
  try {
    const simpleUrl = baseUrl.replace('/api/v1', '');
    const simpleResponse = await fetch(simpleUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    tests.push({
      test: 'Simple Connection Test (no auth)',
      url: simpleUrl,
      status: simpleResponse.status,
      reachable: true
    });
  } catch (error) {
    tests.push({
      test: 'Simple Connection Test (no auth)',
      reachable: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return NextResponse.json({
    tests,
    timestamp: new Date().toISOString()
  });
}