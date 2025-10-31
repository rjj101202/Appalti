import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { fetchTenderNedXml } from '@/lib/tenderned';
import { parseEformsSummary } from '@/lib/tenderned-parse';

export const maxDuration = 60; // Allow 60 seconds for this endpoint

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    
    if (!(auth as any).isAppaltiUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const db = await getDatabase();
    
    // Get ALL tenders with epoch deadline
    const tenders = await db.collection('tenders')
      .find({ 
        $or: [
          { deadline: { $gte: new Date('1970-01-01'), $lt: new Date('1970-01-02') } },
          { deadline: null }
        ],
        source: 'tenderned',
        externalId: { $exists: true, $ne: null }
      })
      .toArray();

    const results = [];
    
    console.log(`[Fix Deadlines] Processing ${tenders.length} tenders`);

    for (const tender of tenders) {
      const tenderId = tender._id;
      const externalId = tender.externalId;
      
      try {
        console.log(`[Fix] Fetching XML for ${tender.title} (${externalId})`);
        
        const xml = await fetchTenderNedXml(externalId);
        const summary = parseEformsSummary(xml);
        
        let newDeadline = null;
        if (summary?.deadlineDate) {
          newDeadline = new Date(summary.deadlineDate);
        }
        
        // DIRECT database update
        const updateResult = await db.collection('tenders').updateOne(
          { _id: tenderId },
          { $set: { deadline: newDeadline, updatedAt: new Date() } }
        );
        
        console.log(`[Fix] ${tender.title}: ${newDeadline ? newDeadline.toISOString() : 'NULL'} (modified: ${updateResult.modifiedCount})`);
        
        results.push({
          title: tender.title,
          tenderId: tenderId.toString(),
          externalId,
          newDeadline: newDeadline?.toISOString() || null,
          modified: updateResult.modifiedCount,
          status: 'updated'
        });
        
        // Delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
        
      } catch (e: any) {
        console.error(`[Fix] FAILED ${tender.title}:`, e.message);
        results.push({
          title: tender.title,
          tenderId: tenderId.toString(),
          externalId,
          error: e.message,
          status: 'failed'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      processed: tenders.length,
      results
    });
    
  } catch (e: any) {
    console.error('[Fix Deadlines] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

