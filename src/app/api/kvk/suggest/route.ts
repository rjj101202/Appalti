import { NextRequest, NextResponse } from 'next/server';
import { kvkAPI } from '@/lib/kvk-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({
        success: true,
        data: []
      });
    }

    // Search companies by name
    const companies = await kvkAPI.searchByName(query, 5);
    
    // Return simplified data for suggestions
    const suggestions = companies.map(company => ({
      kvkNumber: company.kvkNumber,
      name: company.name,
      city: company.addresses?.[0]?.city || '',
      displayName: `${company.name}${company.addresses?.[0]?.city ? ` - ${company.addresses[0].city}` : ''}`
    }));

    return NextResponse.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('KVK suggest error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}