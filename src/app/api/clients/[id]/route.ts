import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';

// GET /api/clients/[id] - Get specific client company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Get tenantId from auth context
    const tenantId = 'appalti'; // Hardcoded for now
    
    const repository = await getClientCompanyRepository();
    const client = await repository.findById(params.id, tenantId);
    
    if (!client) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client company' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - Update client company
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // TODO: Get tenantId and userId from auth context
    const tenantId = 'appalti'; // Hardcoded for now
    const userId = 'test-user'; // Hardcoded for now
    
    const repository = await getClientCompanyRepository();
    
    // Remove fields that shouldn't be updated directly
    const { _id, tenantId: _, createdAt, createdBy, ...updates } = body;
    
    const updatedClient = await repository.update(
      params.id,
      tenantId,
      updates,
      userId
    );
    
    if (!updatedClient) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client company' },
      { status: 500 }
    );
  }
}