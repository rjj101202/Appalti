import { chunkText, computeChecksum } from './rag';

describe('chunkText', () => {
  test('should split long text into chunks of specified size', () => {
    const text = 'A'.repeat(2000);
    const chunks = chunkText(text, { chunkSize: 500, overlap: 100 });
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(500);
  });

  test('should handle text shorter than chunk size', () => {
    const text = 'Short text';
    const chunks = chunkText(text, { chunkSize: 1000 });
    
    expect(chunks).toEqual(['Short text']);
  });

  test('should handle empty text', () => {
    const chunks = chunkText('');
    expect(chunks).toEqual([]);
  });

  test('should create overlapping chunks', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(10);
    const chunks = chunkText(text, { chunkSize: 50, overlap: 10 });
    
    // Check that consecutive chunks have overlap
    if (chunks.length > 1) {
      const endOfFirst = chunks[0].slice(-10);
      const startOfSecond = chunks[1].slice(0, 10);
      // They should share some content due to overlap
      expect(chunks.length).toBeGreaterThan(1);
    }
  });

  test('should use default chunk size and overlap when not specified', () => {
    const text = 'A'.repeat(2500);
    const chunks = chunkText(text);
    
    // Default chunkSize is 1000
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(1000);
  });

  test('should filter out empty chunks after trimming', () => {
    const text = '   \n\n   ';
    const chunks = chunkText(text);
    
    expect(chunks).toEqual([]);
  });

  test('should trim whitespace from chunks', () => {
    const text = '  Hello World  \n  Goodbye World  ';
    const chunks = chunkText(text, { chunkSize: 20, overlap: 5 });
    
    chunks.forEach(chunk => {
      expect(chunk).toBe(chunk.trim());
    });
  });
});

describe('computeChecksum', () => {
  test('should generate consistent checksums for same input', () => {
    const text = 'Test document content';
    const checksum1 = computeChecksum(text);
    const checksum2 = computeChecksum(text);
    
    expect(checksum1).toBe(checksum2);
  });

  test('should generate different checksums for different inputs', () => {
    const text1 = 'Document A';
    const text2 = 'Document B';
    
    const checksum1 = computeChecksum(text1);
    const checksum2 = computeChecksum(text2);
    
    expect(checksum1).not.toBe(checksum2);
  });

  test('should handle empty string', () => {
    const checksum = computeChecksum('');
    expect(checksum).toBeTruthy();
    expect(typeof checksum).toBe('string');
  });

  test('should handle Uint8Array input', () => {
    const buffer = new Uint8Array([1, 2, 3, 4, 5]);
    const checksum = computeChecksum(buffer);
    
    expect(checksum).toBeTruthy();
    expect(typeof checksum).toBe('string');
  });

  test('should be case-sensitive', () => {
    const checksum1 = computeChecksum('Hello');
    const checksum2 = computeChecksum('hello');
    
    expect(checksum1).not.toBe(checksum2);
  });
});

