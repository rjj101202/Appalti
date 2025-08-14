import { NextRequest, NextResponse } from 'next/server';
import { getClientCompanyRepository } from '@/lib/db/repositories/clientCompanyRepository';
import { requireAuth } from '@/lib/auth/context';

// PUT /api/clients/[id]/ikp - Update IKP data for a client
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
    
    // Check if client exists
    const client = await repository.findById(params.id, auth.tenantId);
    if (!client) {
      return NextResponse.json(
        { error: 'Client company not found' },
        { status: 404 }
      );
    }
    
    // Calculate completed steps and validate CKV
    const { completed, ckvStatus, totalScore } = calculateCompletedSteps(body);
    const ikpStatus = completed === 15 && ckvStatus.allCkvMet ? 'completed' : 'in_progress';
    
    // Add CKV status and metadata to the IKP data
    const ikpDataWithMeta = {
      ...body,
      ckvStatus,
      metadata: {
        createdAt: new Date(),
        updatedAt: new Date(),
        completedSteps: completed,
        lastCompletedStep: completed,
        totalScore,
        ckvPassed: ckvStatus.allCkvMet
      }
    };
    
    // Update the client with IKP data
    const updatedClient = await repository.update(
      params.id,
      auth.tenantId,
      {
        ikpData: ikpDataWithMeta,
        ikpStatus,
        ikpCompletedSteps: completed,
        ikpLastUpdated: new Date(),
      },
      auth.userId
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

// Helper function to calculate completed steps and validate CKV
function calculateCompletedSteps(ikpData: any): { completed: number; ckvStatus: any; totalScore: number } {
  let completed = 0;
  let totalScore = 0;
  
  // Define which fields correspond to each step with their scores
  const stepFields = [
    { fields: ['geographicScope'], scoreType: 'CKV', score: 0 },
    { fields: ['employeeCount'], scoreType: 'CKV', score: 0 },
    { fields: ['clientTypes'], scoreType: 'CKV', score: 0 },
    { fields: ['industry'], scoreType: 'CKV', score: 0 },
    { fields: ['clientDNA'], scoreType: 'percentage', score: 15 },
    { fields: ['competitionType'], scoreType: 'percentage', score: 4 },
    { fields: ['competitionCount'], scoreType: 'percentage', score: 4 },
    { fields: ['kraljicPosition'], scoreType: 'percentage', score: 10 },
    { fields: ['potentialServices'], scoreType: 'percentage', score: 15 },
    { fields: ['additionalServices'], scoreType: 'percentage', score: 2 },
    { fields: ['issues'], scoreType: 'percentage', score: 20 },
    { fields: ['contractValue'], scoreType: 'percentage', score: 10 },
    { fields: ['grossMargin'], scoreType: 'percentage', score: 10 },
    { fields: ['collaborationDuration'], scoreType: 'percentage', score: 10 },
    { fields: ['creditworthiness'], scoreType: 'CKV', score: 0 }
  ];
  
  // Track CKV status
  const ckvStatus = {
    geographicScope: false,
    employeeCount: false,
    clientTypes: false,
    industry: false,
    creditworthiness: false,
    allCkvMet: false
  };
  
  stepFields.forEach((step, index) => {
    const hasData = step.fields.some(field => {
      const value = ikpData[field];
      return value !== undefined && value !== null && value !== '' && 
             (Array.isArray(value) ? value.length > 0 : true);
    });
    
    if (hasData) {
      completed++;
      
      // Update CKV status
      if (step.scoreType === 'CKV') {
        const field = step.fields[0];
        if (field in ckvStatus) {
          ckvStatus[field as keyof typeof ckvStatus] = true;
        }
      } else {
        // Add to total score for percentage-based fields
        totalScore += step.score;
      }
    }
  });
  
  // Check if all CKV requirements are met
  ckvStatus.allCkvMet = ckvStatus.geographicScope && 
                        ckvStatus.employeeCount && 
                        ckvStatus.clientTypes && 
                        ckvStatus.industry && 
                        ckvStatus.creditworthiness;
  
  return { completed, ckvStatus, totalScore };
}