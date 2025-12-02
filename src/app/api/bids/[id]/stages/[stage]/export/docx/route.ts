import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/context';
import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

export const runtime = 'nodejs';

function stripHtml(html: string): string {
  // Convert HTML to plain text, preserving structure
  let text = html
    // Convert headings to plain text with markers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n')
    // Convert paragraphs
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    // Convert lists
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '• $1\n')
    .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
    // Convert line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up whitespace
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

// Shared function to generate the document
async function generateDocx(
  stage: string, 
  criteria: Array<{ title?: string; content?: string }>,
  sources: Array<{ label: string; title?: string; url?: string; chunks?: Array<{ pageNumber?: number }> }>
) {
  let fullContent = '';
  
  // Combine all criteria content
  for (const criterion of criteria) {
    if (criterion.title) {
      fullContent += `\n## ${criterion.title}\n\n`;
    }
    if (criterion.content) {
      fullContent += stripHtml(criterion.content) + '\n\n';
    }
  }
  
  console.log('[DOCX EXPORT] Total content length:', fullContent.length);

  const paragraphs: Paragraph[] = [];
  
  // Title
  const stageLabels: Record<string, string> = {
    storyline: 'Storyline',
    version_65: '65% Versie',
    version_95: '95% Versie',
    final: 'Finale Versie'
  };
  paragraphs.push(new Paragraph({ 
    text: stageLabels[stage] || stage, 
    heading: HeadingLevel.TITLE,
    spacing: { after: 400 }
  }));
  
  // Content - split by lines and handle headings
  for (const line of fullContent.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      paragraphs.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      continue;
    }
    
    if (trimmedLine.startsWith('### ')) {
      paragraphs.push(new Paragraph({ 
        text: trimmedLine.replace('### ', ''), 
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 300, after: 150 }
      }));
    } else if (trimmedLine.startsWith('## ')) {
      paragraphs.push(new Paragraph({ 
        text: trimmedLine.replace('## ', ''), 
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 }
      }));
    } else if (trimmedLine.startsWith('# ')) {
      paragraphs.push(new Paragraph({ 
        text: trimmedLine.replace('# ', ''), 
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 }
      }));
    } else if (trimmedLine.startsWith('• ') || trimmedLine.startsWith('- ')) {
      paragraphs.push(new Paragraph({ 
        text: trimmedLine,
        spacing: { after: 50 }
      }));
    } else {
      paragraphs.push(new Paragraph({ 
        text: trimmedLine,
        spacing: { after: 100 }
      }));
    }
  }
  
  // References
  if (sources.length) {
    paragraphs.push(new Paragraph({ text: '', spacing: { after: 200 } }));
    paragraphs.push(new Paragraph({ 
      text: 'Bronverwijzingen', 
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 }
    }));
    for (const r of sources) {
      const pageInfo = r.chunks?.[0]?.pageNumber ? ` (pagina ${r.chunks[0].pageNumber})` : '';
      const text = `[${r.label}] ${r.title || r.url || ''}${pageInfo}`;
      paragraphs.push(new Paragraph({ children: [new TextRun({ text })] }));
    }
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  return await Packer.toBuffer(doc);
}

// POST: Export with provided content (for unsaved changes)
export async function POST(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    
    const body = await request.json();
    const criteria = body.criteria || [];
    const sources = body.sources || [];
    
    console.log('[DOCX EXPORT POST] Received', criteria.length, 'criteria');
    
    const buffer = await generateDocx(params.stage, criteria, sources);
    
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="bid_${params.id}_${params.stage}.docx"`
      }
    });
  } catch (e) {
    console.error('Export DOCX POST error', e);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}

// GET: Export from database (for saved content)
export async function GET(request: NextRequest, { params }: { params: { id: string; stage: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });
    const db = await getDatabase();
    const bid = await db.collection('bids').findOne({ _id: new ObjectId(params.id), tenantId: auth.tenantId });
    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
    const stageState = (bid.stages || []).find((s: any) => s.key === params.stage) || {};

    // Get criteria from database
    let criteria = stageState.criteria || [];
    
    // Fallback: if no criteria but has old content, convert to criteria format
    if (criteria.length === 0 && stageState.content) {
      criteria = [{ title: '', content: String(stageState.content) }];
    }
    
    const sources = stageState.sources || [];
    
    console.log('[DOCX EXPORT GET] Found', criteria.length, 'criteria in database');

    const buffer = await generateDocx(params.stage, criteria, sources);
    
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
