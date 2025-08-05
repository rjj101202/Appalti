import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';

// PUT /api/clients/[id]/ikp - Update IKP data for a client
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
    
    // Check if client exists
    const client = await repository.findById(params.id, tenantId);
    if (!client) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }
    
    // Calculate completed steps based on the IKP data
    const completedSteps = calculateCompletedSteps(body);
    const ikpStatus = completedSteps === 15 ? 'completed' : 'in_progress';
    
    // Update the client with IKP data
    const updatedClient = await repository.update(
      params.id,
      tenantId,
      {
        ikpData: body,
        ikpStatus,
        ikpCompletedSteps: completedSteps,
        ikpLastUpdated: new Date(),
      },
      userId
    );
    
    if (!updatedClient) {
      return NextResponse.json(
        { error: 'Failed to update IKP data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating IKP:', error);
    return NextResponse.json(
      { error: 'Failed to update IKP data' },
      { status: 500 }
    );
  }
}

// GET /api/clients/[id]/ikp - Get IKP data for a client
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
      data: {
        ikpData: client.ikpData || {},
        ikpStatus: client.ikpStatus,
        ikpCompletedSteps: client.ikpCompletedSteps || 0,
        ikpLastUpdated: client.ikpLastUpdated
      }
    });
  } catch (error) {
    console.error('Error fetching IKP:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IKP data' },
      { status: 500 }
    );
  }
}

// Helper function to calculate completed steps
function calculateCompletedSteps(ikpData: any): number {
  let completed = 0;
  
  // Define which fields correspond to each step
  const stepFields = [
    ['organisationType'], // Step 1 - Organisatie
    ['decisionMakingLocation'], // Step 2 - Besluitvorming in Nederland
    ['clientTypes'], // Step 3 - Opdrachtgevers
    ['industryPerspective'], // Step 4 - Perspectief branche
    ['organizationImage'], // Step 5 - Imago
    ['activeRegions'], // Step 6 - Regio
    ['industry'], // Step 7 - Branche
    ['employeeCount'], // Step 8 - Aantal medewerkers
    ['matchingElements'], // Step 9 - Matchingselementen
    ['kraljicPosition'], // Step 10 - Impact
    ['servicePotential'], // Step 11 - Dienstverlening
    ['issues'], // Step 12 - Issue
    ['contractValue'], // Step 13 - Financieel
    ['collaborationDuration'], // Step 14 - Samenwerkingsduur
    ['creditworthiness'], // Step 15 - Kredietwaardigheid
  ];
  
  stepFields.forEach(fields => {
    const hasData = fields.some(field => {
      const value = ikpData[field];
      return value !== undefined && value !== null && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    });
    if (hasData) completed++;
  });
  
  return completed;
}