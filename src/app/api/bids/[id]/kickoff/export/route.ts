import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/context';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, HeadingLevel, BorderStyle } from 'docx';

export const runtime = 'nodejs';

const paramsSchema = z.object({
  id: z.string().min(1)
});

/**
 * POST /api/bids/[id]/kickoff/export
 * Export kick-off document als Word bestand
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireAuth(request);
    if (!auth.tenantId) return NextResponse.json({ error: 'No active tenant' }, { status: 400 });

    const parsed = paramsSchema.safeParse(params);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid params' }, { status: 400 });

    const body = await request.json();
    const data = body.extractedData || {};

    // Build Word document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            text: 'Afspraken en actiepunten n.a.v. kick-off',
            heading: HeadingLevel.HEADING_1,
            spacing: { after: 400 }
          }),
          
          // Basic info table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Naam traject en klantnaam:', bold: true })] })],
                    width: { size: 30, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph(`${data.trajectNaam || ''} – ${data.klantnaam || ''}`)],
                    width: { size: 70, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Kick-off datum:', bold: true })] })]
                  }),
                  new TableCell({
                    children: [new Paragraph(data.kickoffDatum || 'Nog in te vullen')]
                  })
                ]
              })
            ]
          }),
          
          new Paragraph({ text: '', spacing: { after: 200 } }),
          
          // Inleiding
          new Paragraph({
            text: 'Inleiding',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: data.inleiding || 'Nog in te vullen',
            spacing: { after: 200 }
          }),
          
          // Doel
          new Paragraph({
            text: 'Doel van de aanbesteding',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: data.doelAanbesteding || 'Nog in te vullen',
            spacing: { after: 200 }
          }),
          
          // Waarde
          new Paragraph({
            text: 'Waarde van de aanbesteding',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: data.waardeAanbesteding || 'Nog in te vullen',
            spacing: { after: 200 }
          }),
          
          // Contractduur
          new Paragraph({
            text: 'Contractduur',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          new Paragraph({
            text: data.contractduur || 'Nog in te vullen',
            spacing: { after: 200 }
          }),
          
          // Planning
          new Paragraph({
            text: 'Planning',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          
          // Planning table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Onderwerp', bold: true })] })],
                    shading: { fill: 'f3f4f6' }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Datum', bold: true })] })],
                    shading: { fill: 'f3f4f6' }
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: 'Tijd', bold: true })] })],
                    shading: { fill: 'f3f4f6' }
                  })
                ]
              }),
              // Data rows
              ...(data.planning || []).map((item: any) => 
                new TableRow({
                  children: [
                    new TableCell({ children: [new Paragraph(item.onderwerp || '')] }),
                    new TableCell({ children: [new Paragraph(item.datum || '')] }),
                    new TableCell({ children: [new Paragraph(item.tijd || '')] })
                  ]
                })
              )
            ]
          }),
          
          // Geschiktheidseisen
          new Paragraph({
            text: 'Geschiktheidseisen',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...(data.geschiktheidseisen || []).map((eis: string) => 
            new Paragraph({
              text: `• ${eis}`,
              spacing: { after: 100 }
            })
          ),
          
          // Documentatie bij inschrijving
          new Paragraph({
            text: 'Aan te leveren documentatie bij inschrijving',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...(data.documentatieBijInschrijving || []).map((doc: string) => 
            new Paragraph({
              text: `• ${doc}`,
              spacing: { after: 100 }
            })
          ),
          
          // Documentatie bij gunning
          new Paragraph({
            text: 'Aan te leveren documentatie bij voorlopige gunning',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 }
          }),
          ...(data.documentatieBijGunning || []).map((doc: string) => 
            new Paragraph({
              text: `• ${doc}`,
              spacing: { after: 100 }
            })
          )
        ]
      }]
    });

    // Generate buffer
    const buffer = await Packer.toBuffer(doc);

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="kickoff-${data.trajectNaam || 'document'}.docx"`
      }
    });
  } catch (e: any) {
    console.error('Kickoff export error:', e);
    return NextResponse.json({ error: e?.message || 'Failed to export document' }, { status: 500 });
  }
}

