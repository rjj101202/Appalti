import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { handleApiError } from '@/lib/error-handler';
import { ValidationError } from '@/lib/errors';
import type { SuccessResponse } from '@/types/api';

interface CPVCodeData {
  code: string;
  coreCode: string;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  count?: number;
  isPopular?: boolean;
}

type CPVSearchResponse = SuccessResponse<{
  codes: CPVCodeData[];
  total: number;
}>;

/**
 * GET /api/cpv/search
 * 
 * Search CPV codes in database
 * 
 * Query params:
 * - q: search query (optional)
 * - limit: max results (default 20)
 * - onlyPopular: only popular codes (default false)
 * - level: filter by level (Klasse, Categorie, etc.)
 * - excludeIncompatible: exclude Groep/Divisie (default true for TenderNed)
 */
export async function GET(request: NextRequest): Promise<NextResponse<CPVSearchResponse>> {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const onlyPopular = searchParams.get('onlyPopular') === 'true';
    const level = searchParams.get('level') as any;
    const excludeIncompatible = searchParams.get('excludeIncompatible') !== 'false'; // default true
    
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('cpv_codes');
    
    // Build query
    const filter: Record<string, any> = {};
    
    // Search in description or code
    if (query) {
      filter.$or = [
        { description: { $regex: query, $options: 'i' } },
        { code: { $regex: query } },
        { coreCode: { $regex: query } }
      ];
    }
    
    // Only popular codes
    if (onlyPopular) {
      filter.isPopular = true;
    }
    
    // Filter by level
    if (level && ['Divisie', 'Groep', 'Klasse', 'Categorie'].includes(level)) {
      filter.level = level;
    }
    
    // Exclude TenderNed incompatible codes (Divisie and Groep)
    if (excludeIncompatible) {
      filter.level = { $in: ['Klasse', 'Categorie'] };
    }
    
    // Execute query
    const codes = await collection
      .find(filter)
      .sort({ count: -1, code: 1 }) // Sort by popularity, then by code
      .limit(limit)
      .toArray();
    
    const total = await collection.countDocuments(filter);
    
    return NextResponse.json({
      success: true,
      data: {
        codes: codes.map(c => ({
          code: c.code as string,
          coreCode: c.coreCode as string,
          description: c.description as string,
          level: c.level as any,
          count: c.count as number,
          isPopular: c.isPopular as boolean
        })),
        total
      }
    });
    
  } catch (error) {
    return handleApiError(error, {
      endpoint: 'GET /api/cpv/search'
    }) as any;
  }
}

/**
 * POST /api/cpv/import
 * 
 * Import CPV codes (admin only)
 * For one-time data import or updates
 */
export async function POST(request: NextRequest) {
  try {
    // TODO: Add admin authentication check
    // const auth = await requireAuth(request);
    // if (!auth.platformRole || auth.platformRole !== 'super_admin') {
    //   throw new ForbiddenError('Requires super_admin role');
    // }
    
    const body = await request.json();
    
    if (!Array.isArray(body.codes)) {
      throw new ValidationError('codes must be an array');
    }
    
    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('cpv_codes');
    
    // Create indexes
    await collection.createIndex({ code: 1 }, { unique: true });
    await collection.createIndex({ coreCode: 1 });
    await collection.createIndex({ level: 1 });
    await collection.createIndex({ description: 'text' });
    
    let imported = 0;
    let updated = 0;
    
    for (const item of body.codes) {
      const result = await collection.updateOne(
        { code: item.code },
        { 
          $set: {
            ...item,
            updatedAt: new Date()
          },
          $setOnInsert: { createdAt: new Date() }
        },
        { upsert: true }
      );
      
      if (result.upsertedCount) imported++;
      else if (result.modifiedCount) updated++;
    }
    
    return NextResponse.json({
      success: true,
      data: {
        imported,
        updated,
        total: imported + updated
      }
    });
    
  } catch (error) {
    return handleApiError(error, {
      endpoint: 'POST /api/cpv/import'
    }) as any;
  }
}

