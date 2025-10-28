import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

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

    const paragraphs: Paragraph[] = [];
    paragraphs.push(new Paragraph({ text: `Aanbesteding – ${params.stage}`, heading: HeadingLevel.TITLE }));
    paragraphs.push(new Paragraph(''));
    for (const line of plain.split('\n')) paragraphs.push(new Paragraph(line));
    if (refs.length) {
      paragraphs.push(new Paragraph(''));
      paragraphs.push(new Paragraph({ text: 'Referenties', heading: HeadingLevel.HEADING_2 }));
      for (const r of refs) {
        const text = `[${r.label}] ${r.title || r.url || ''}`;
        paragraphs.push(new Paragraph({ children: [new TextRun({ text })] }));
      }
    }

    const doc = new Document({ sections: [{ children: paragraphs }] });
    const buffer = await Packer.toBuffer(doc);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="bid_${params.id}_${params.stage}.docx"`
      }
    });
  } catch (e) {
    console.error('Export DOCX error', e);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
