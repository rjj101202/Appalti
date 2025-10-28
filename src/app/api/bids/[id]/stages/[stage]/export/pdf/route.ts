import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import PDFDocument from 'pdfkit';

export const runtime = 'nodejs';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+\n/g,'\n').replace(/\n{3,}/g,'\n\n');
}

export async function GET(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(params.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    const stageState = (bid.stages || []).find((s: any) => s.key === params.stage) || {};

    const plain = stripHtml(String(stageState.content || ''));
    const refs: Array<{ label: string; title?: string; url?: string; type?: string }> = Array.isArray(stageState.sources)
      ? stageState.sources
      : (Array.isArray(stageState.sourceLinks) ? (stageState.sourceLinks as string[]).map((u: string, i: number) => ({ label: `S${i+1}`, url: u })) : []);

    const doc = new PDFDocument({ size: 'A4', margins: { top: 56, bottom: 56, left: 56, right: 56 } });
    const chunks: Buffer[] = [];
    doc.on('data', (d: Buffer) => chunks.push(d));
    const done = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
    });

    doc.fontSize(18).text(`Aanbesteding – ${params.stage}`, { align: 'left' });
    doc.moveDown();
    doc.fontSize(11).text(plain, { align: 'left' });
    if (refs.length) {
      doc.addPage();
      doc.fontSize(16).text('Referenties');
      doc.moveDown(0.5);
      doc.fontSize(10);
      refs.forEach(r => {
        doc.text(`[${r.label}] ${r.title || r.url || ''}`);
      });
    }
    doc.end();

    const buffer = await done;
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bid_${params.id}_${params.stage}.pdf"`
      }
    });
  } catch (e) {
    console.error('Export PDF error', e);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
