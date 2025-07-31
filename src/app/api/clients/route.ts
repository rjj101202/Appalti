import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';

// GET /api/clients - Get all client companies
export async function GET(request: NextRequest) {
  try {
    // TODO: Get tenantId from auth context
    const tenantId = 'appalti'; // Hardcoded for now
    
    const repository = await getClientCompanyRepository();
    const clients = await repository.findAll(tenantId);
    
    return NextResponse.json({
      success: true,
      data: clients
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client companies' },
      { status: 500 }
    );
  }
}

// POST /api/clients - Create new client company
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Get tenantId and userId from auth context
    const tenantId = 'appalti'; // Hardcoded for now
    const userId = 'test-user'; // Hardcoded for now
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }
    
    const repository = await getClientCompanyRepository();
    
    // Check if company already exists
    if (body.kvkNumber) {
      const existing = await repository.findByKvkNumber(body.kvkNumber, tenantId);
      if (existing) {
        return NextResponse.json(
          { error: 'A company with this KVK number already exists' },
          { status: 409 }
        );
      }
    }
    
    // Create the client company
    const clientCompany = await repository.create({
      tenantId,
      name: body.name,
      kvkNumber: body.kvkNumber,
      legalForm: body.legalForm,
      address: body.address,
      sbiCode: body.sbiCode,
      sbiDescription: body.sbiDescription,
      employees: body.employees,
      createdBy: userId
    });
    
    return NextResponse.json({
      success: true,
      data: clientCompany
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client company' },
      { status: 500 }
    );
  }
}