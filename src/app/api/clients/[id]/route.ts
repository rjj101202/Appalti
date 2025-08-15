import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { requireAuth, requireCompanyRole } from '@/lib/auth/context';
import { CompanyRole } from '@/lib/db/models/Membership';
import { z } from 'zod';

const updateClientSchema = z.object({
	name: z.string().min(1).optional(),
	isOwnCompany: z.boolean().optional(),
	legalForm: z.string().optional(),
	address: z.object({
		street: z.string().optional(),
		postalCode: z.string().optional(),
		city: z.string().optional(),
		country: z.string().optional()
	}).optional(),
	addresses: z.array(z.object({
		type: z.string().optional(),
		street: z.string().optional(),
		houseNumber: z.string().optional(),
		postalCode: z.string().optional(),
		city: z.string().optional(),
		country: z.string().optional()
	})).optional(),
	website: z.string().url().optional(),
	websites: z.array(z.string().url()).optional(),
	sbiCode: z.string().optional(),
	sbiDescription: z.string().optional(),
	employees: z.string().optional(),
	handelsnamen: z.array(z.string()).optional(),
	kvkData: z.any().optional()
}).strict();

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
    const parse = updateClientSchema.safeParse(body);
    if (!parse.success) {
      return NextResponse.json({ error: 'Invalid request body', details: parse.error.issues }, { status: 400 });
    }
    const data = parse.data;

    const auth = await requireAuth(request);
    if (!auth.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant' },
        { status: 400 }
      );
    }

    // Only admins/owners can update
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => {
      throw new Error('Forbidden');
    });

    const repository = await getClientCompanyRepository();
    
    // Remove fields that shouldn't be updated directly handled by schema (no _id/tenantId/etc.)
    const updatedClient = await repository.update(
      params.id,
      auth.tenantId,
      data,
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
  } catch (error: any) {
    console.error('Error updating client:', error);
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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

    // Only admins/owners can delete
    await requireCompanyRole(request, auth.companyId || '', CompanyRole.ADMIN).catch(() => {
      throw new Error('Forbidden');
    });

    const repository = await getClientCompanyRepository();
    const ok = await repository.delete(params.id, auth.tenantId);
    if (!ok) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting client:', error);
    if (error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json(
      { error: 'Failed to delete client company' },
      { status: 500 }
    );
  }
}