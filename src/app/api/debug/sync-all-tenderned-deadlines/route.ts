import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    // Only allow for Appalti users
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    
    // Find ALL tenders with TenderNed source
    const tenders = await db.collection('tenders')
      .find({ 
        source: 'tenderned',
        externalId: { $exists: true, $ne: null, $ne: '' }
      })
      .toArray();

    console.log(`[Sync ALL] Found ${tenders.length} TenderNed tenders to process`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const results = [];

    for (const tender of tenders) {
      try {
        // Check if deadline needs updating (is epoch or null)
        const currentDeadline = tender.deadline;
        const isEpoch = currentDeadline && new Date(currentDeadline).getFullYear() === 1970;
        const isMissing = !currentDeadline;
        
        if (!isEpoch && !isMissing) {
          skipped++;
          console.log(`[Sync] ⊙ Skipping ${tender.title} - already has valid deadline`);
          continue;
        }
        
        console.log(`[Sync] Processing ${tender.title} (${tender.externalId})`);
        
        // Fetch from TenderNed
        const xml = await fetchTenderNedXml(tender.externalId);
        const summary = parseEformsSummary(xml);
        
        if (summary?.deadlineDate) {
          const newDeadline = new Date(summary.deadlineDate);
          
          // Direct update
          const updateResult = await db.collection('tenders').updateOne(
            { _id: tender._id },
            { 
              $set: { 
                deadline: newDeadline,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`[Sync] ✓ Updated ${tender.title} → ${summary.deadlineDate} (modified: ${updateResult.modifiedCount})`);
          
          updated++;
          results.push({
            tenderId: tender._id.toString(),
            title: tender.title,
            externalId: tender.externalId,
            newDeadline: summary.deadlineDate,
            status: 'updated',
            modifiedCount: updateResult.modifiedCount
          });
        } else {
          // No deadline in XML
          await db.collection('tenders').updateOne(
            { _id: tender._id },
            { 
              $set: { 
                deadline: null,
                updatedAt: new Date()
              } 
            }
          );
          
          console.log(`[Sync] ○ No deadline for ${tender.title}`);
          results.push({
            tenderId: tender._id.toString(),
            title: tender.title,
            externalId: tender.externalId,
            status: 'no_deadline'
          });
        }
      } catch (e: any) {
        failed++;
        console.error(`[Sync] ✗ Failed ${tender.title}:`, e.message);
        results.push({
          tenderId: tender._id.toString(),
          title: tender.title,
          error: e.message,
          status: 'error'
        });
      }
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${tenders.length} tenders: ${updated} updated, ${skipped} skipped, ${failed} failed`,
      stats: { total: tenders.length, updated, skipped, failed },
      results
    });
  } catch (e: any) {
    console.error('[Sync ALL] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

