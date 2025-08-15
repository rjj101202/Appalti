import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { requireAuth } from '@/lib/auth/context';

// GET /api/clients/[id] - Get specific client company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant' },
        { status: 400 }
      );
    }

    const repository = await getClientCompanyRepository();
    const client = await repository.findById(params.id, auth.tenantId);
    
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
    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant' },
        { status: 400 }
      );
    }

    const repository = await getClientCompanyRepository();
    
    // Remove fields that shouldn't be updated directly
    const { _id, tenantId: _tenant, createdAt, createdBy, ...updates } = body;
    
    const updatedClient = await repository.update(
      params.id,
      auth.tenantId,
      updates,
      auth.userId
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

// DELETE /api/clients/[id] - Delete client company
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant' },
        { status: 400 }
      );
    }

    const repository = await getClientCompanyRepository();
    const ok = await repository.delete(params.id, auth.tenantId);
    if (!ok) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client company' },
      { status: 500 }
    );
  }
}