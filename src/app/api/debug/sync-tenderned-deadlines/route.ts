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
    
    // Find all tenders with TenderNed source and externalId
    const tenders = await db.collection('tenders')
      .find({ 
        source: 'tenderned',
        externalId: { $exists: true, $ne: null }
      })
      .limit(50) // Process max 50 at a time
      .toArray();

    console.log(`[Sync TenderNed Deadlines] Found ${tenders.length} TenderNed tenders`);

    let updated = 0;
    let failed = 0;
    const results = [];

    for (const tender of tenders) {
      try {
        console.log(`[Sync] Processing tender ${tender._id} - ${tender.externalId}`);
        
        // Fetch TenderNed XML and parse deadline
        const xml = await fetchTenderNedXml(tender.externalId);
        const summary = parseEformsSummary(xml);
        
        if (summary?.deadlineDate) {
          // Update tender with real deadline
          await db.collection('tenders').updateOne(
            { _id: tender._id },
            { 
              $set: { 
                deadline: new Date(summary.deadlineDate),
                updatedAt: new Date()
              } 
            }
          );
          
          updated++;
          results.push({
            tenderId: tender._id.toString(),
            title: tender.title,
            oldDeadline: tender.deadline,
            newDeadline: summary.deadlineDate,
            status: 'updated'
          });
          
          console.log(`[Sync] ✓ Updated ${tender.title} → ${summary.deadlineDate}`);
        } else {
          // No deadline found in XML - set to null
          await db.collection('tenders').updateOne(
            { _id: tender._id },
            { 
              $set: { 
                deadline: null,
                updatedAt: new Date()
              } 
            }
          );
          
          results.push({
            tenderId: tender._id.toString(),
            title: tender.title,
            status: 'no_deadline_in_xml'
          });
          
          console.log(`[Sync] ○ No deadline for ${tender.title}`);
        }
      } catch (e: any) {
        failed++;
        results.push({
          tenderId: tender._id.toString(),
          title: tender.title,
          error: e.message,
          status: 'failed'
        });
        console.error(`[Sync] ✗ Failed for ${tender.title}:`, e.message);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${tenders.length} tenders: ${updated} updated, ${failed} failed`,
      stats: {
        total: tenders.length,
        updated,
        failed
      },
      results
    });
  } catch (e: any) {
    console.error('Sync TenderNed deadlines error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

