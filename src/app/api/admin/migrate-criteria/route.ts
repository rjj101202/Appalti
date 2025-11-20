import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

/**
 * POST /api/admin/migrate-criteria
 * Migreert oude 'content' velden naar nieuwe 'criteria' structuur
 * 
 * Voor elke stage met content maar zonder criteria:
 * - Maak een criterium "Algemeen" aan met de oude content
 * - Behoud de oude content voor backwards compatibility
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    
    // Optioneel: check of user super_admin is
    // Voor nu: elke authenticated user kan migreren voor hun tenant
    
    const db = await getDatabase();
    
    // Vind alle bids met stages die content hebben maar geen criteria
    const bids = await db.collection('bids').find({ 
      tenantId: auth.tenantId,
      'stages.content': { $exists: true, $ne: '' }
    }).toArray();
    
    let migratedCount = 0;
    let stagesUpdated = 0;
    
    for (const bid of bids) {
      let bidUpdated = false;
      const stages = bid.stages || [];
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        
        // Skip als al criteria heeft of geen content
        if ((stage.criteria && stage.criteria.length > 0) || !stage.content || stage.content.trim() === '') {
          continue;
        }
        
        // Maak default criterium
        const defaultCriterion = {
          id: nanoid(),
          title: 'Algemeen',
          content: stage.content,
          order: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Update de stage in de array
        await db.collection('bids').updateOne(
          { _id: bid._id, 'stages.key': stage.key },
          { 
            $set: { 
              'stages.$.criteria': [defaultCriterion],
              'stages.$.updatedAt': new Date()
            } 
          }
        );
        
        stagesUpdated++;
        bidUpdated = true;
      }
      
      if (bidUpdated) {
        migratedCount++;
      }
    }
    
    console.log(`[MIGRATION] Migrated ${stagesUpdated} stages across ${migratedCount} bids for tenant ${auth.tenantId}`);
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        migratedBids: migratedCount,
        migratedStages: stagesUpdated,
        message: `Successfully migrated ${stagesUpdated} stages in ${migratedCount} bids`
      } 
    });
  } catch (e: any) {
    console.error('Migration error', e);
    return NextResponse.json({ error: e?.message || 'Migration failed' }, { status: 500 });
  }
}

