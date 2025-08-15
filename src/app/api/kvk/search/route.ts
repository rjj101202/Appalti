import { NextRequest, NextResponse } from 'next/server';
import { kvkAPI } from '@/lib/kvk-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kvkNumber = searchParams.get('kvkNumber');
    const name = searchParams.get('name');
    const full = searchParams.get('full') === 'true';

    if (!kvkNumber && !name) {
      return NextResponse.json(
        { error: 'Either kvkNumber or name parameter is required' },
        { status: 400 }
      );
    }

    if (kvkNumber) {
      if (full) {
        const agg = await kvkAPI.getAggregatedCompany(kvkNumber);
        if (!agg) {
          return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: agg });
      }

      // Lightweight: basic mapping
      const company = await kvkAPI.searchByKvkNumber(kvkNumber);
      
      if (!company) {
        return NextResponse.json(
          { error: 'Company not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: kvkAPI.transformCompanyData(company)
      });
    } else if (name) {
      // Search by name
      const limitParam = searchParams.get('limit');
      const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 50) : 10;
      const companies = await kvkAPI.searchByName(name, limit);
      
      return NextResponse.json({
        success: true,
        data: companies.map(company => kvkAPI.transformCompanyData(company))
      });
    }
  } catch (error) {
    console.error('KVK search error:', error);
    return NextResponse.json(
      { error: 'Failed to search KVK database' },
      { status: 500 }
    );
  }
}