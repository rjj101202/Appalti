import { NextRequest, NextResponse } from 'next/server';
import { kvkAPI } from '@/lib/kvk-api';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const kvkNumber = searchParams.get('kvkNumber');
    const name = searchParams.get('name');

    if (!kvkNumber && !name) {
      return NextResponse.json(
        { error: 'Either kvkNumber or name parameter is required' },
        { status: 400 }
      );
    }

    if (kvkNumber) {
      // Search by KVK number
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
      const companies = await kvkAPI.searchByName(name);
      
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