import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { IKPData } from '@/types/ikp';

// GET /api/clients/[id]/ikp - Get IKP data for a client
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenantId from user
    const tenantId = session.user.sub;
    
    const repository = await getClientCompanyRepository();
    const client = await repository.findById(params.id, tenantId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    return NextResponse.json({ ikpData: client.ikpData || null });
  } catch (error) {
    console.error('Error fetching IKP data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/clients/[id]/ikp - Update IKP data for a client
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ikpData: IKPData = await request.json();

    // Validate that it's a valid IKP data structure
    if (!ikpData || typeof ikpData !== 'object') {
      return NextResponse.json({ error: 'Invalid IKP data' }, { status: 400 });
    }

    // Get tenantId from user
    const tenantId = session.user.sub;
    
    const repository = await getClientCompanyRepository();
    const client = await repository.findById(params.id, tenantId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Determine IKP status based on completed steps
    const completedSteps = ikpData.metadata?.completedSteps || 0;
    const ikpStatus = completedSteps === 0 ? 'not_started' : 
                      completedSteps === 15 ? 'completed' : 'in_progress';

    // Update the client with IKP data
    const updatedClient = await repository.update(
      params.id, 
      client.tenantId,
      {
        ikpData: ikpData,
        ikpStatus: ikpStatus,
        ikpCompletedSteps: completedSteps,
        ikpLastUpdated: new Date()
      },
      session.user.sub
    );

    if (!updatedClient) {
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      ikpStatus: ikpStatus,
      completedSteps: completedSteps 
    });
  } catch (error) {
    console.error('Error updating IKP data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}