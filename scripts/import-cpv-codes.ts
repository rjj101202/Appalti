/**
 * Import CPV Codes from XLSX to MongoDB
 * 
 * Usage:
 * 1. Place your XLSX file in: data/cpv-codes.xlsx
 * 2. Run: npx ts-node scripts/import-cpv-codes.ts
 */

import { readFile } from 'fs/promises';
import { ObjectId } from 'mongodb';
import clientPromise from '../src/lib/mongodb';

interface CPVCodeImport {
  code: string; // XXXXXXXX-X format
  description: string;
  count?: number; // Usage count from TenderNed
}

interface CPVCodeDocument {
  _id?: ObjectId;
  code: string; // XXXXXXXX-X (with check digit)
  coreCode: string; // XXXXXXXX (without check digit)
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  count?: number; // How often used in TenderNed
  isPopular?: boolean; // Top 500 most used
  createdAt: Date;
  updatedAt: Date;
}

function getCPVLevel(coreCode: string): 'Divisie' | 'Groep' | 'Klasse' | 'Categorie' {
  if (coreCode.endsWith('000000')) return 'Divisie';
  if (coreCode.endsWith('0000')) return 'Groep';
  if (coreCode.endsWith('00')) return 'Klasse';
  return 'Categorie';
}

function parseCPVCode(code: string): { coreCode: string; checkDigit: number } {
  const match = code.match(/^(\d{8})(?:-(\d))?$/);
  if (!match) {
    throw new Error(`Invalid CPV code format: ${code}`);
  }
  
  const coreCode = match[1];
  const checkDigit = match[2] ? parseInt(match[2]) : 0;
  
  return { coreCode, checkDigit };
}

async function importCPVCodes(data: CPVCodeImport[]) {
  console.log(`🔄 Importing ${data.length} CPV codes to MongoDB...`);
  
  const client = await clientPromise;
  const db = client.db();
  const collection = db.collection<CPVCodeDocument>('cpv_codes');
  
  // Create unique index on code
  await collection.createIndex({ code: 1 }, { unique: true });
  await collection.createIndex({ coreCode: 1 });
  await collection.createIndex({ level: 1 });
  await collection.createIndex({ isPopular: 1 });
  
  console.log('✅ Indexes created');
  
  // Transform and upsert
  let imported = 0;
  let updated = 0;
  let skipped = 0;
  
  for (const item of data) {
    try {
      const { coreCode, checkDigit } = parseCPVCode(item.code);
      const level = getCPVLevel(coreCode);
      
      const doc: CPVCodeDocument = {
        code: `${coreCode}-${checkDigit}`,
        coreCode,
        checkDigit,
        description: item.description,
        level,
        count: item.count,
        isPopular: item.count && item.count > 10, // Mark as popular if used >10 times
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.updateOne(
        { code: doc.code },
        { 
          $set: doc,
          $setOnInsert: { createdAt: doc.createdAt }
        },
        { upsert: true }
      );
      
      if (result.upsertedCount > 0) {
        imported++;
      } else if (result.modifiedCount > 0) {
        updated++;
      } else {
        skipped++;
      }
      
      if ((imported + updated + skipped) % 100 === 0) {
        console.log(`   Processed ${imported + updated + skipped}/${data.length}...`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to import ${item.code}:`, error);
      skipped++;
    }
  }
  
  console.log('\n✅ Import complete!');
  console.log(`   Imported: ${imported}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total: ${imported + updated + skipped}`);
  
  // Stats
  const stats = {
    total: await collection.countDocuments(),
    divisie: await collection.countDocuments({ level: 'Divisie' }),
    groep: await collection.countDocuments({ level: 'Groep' }),
    klasse: await collection.countDocuments({ level: 'Klasse' }),
    categorie: await collection.countDocuments({ level: 'Categorie' }),
    popular: await collection.countDocuments({ isPopular: true })
  };
  
  console.log('\n📊 Database Stats:');
  console.log(`   Total codes: ${stats.total}`);
  console.log(`   Divisie: ${stats.divisie}`);
  console.log(`   Groep: ${stats.groep}`);
  console.log(`   Klasse: ${stats.klasse}`);
  console.log(`   Categorie: ${stats.categorie}`);
  console.log(`   Popular (>10 uses): ${stats.popular}`);
}

/**
 * Parse CSV/TSV data
 */
function parseCSV(content: string): CPVCodeImport[] {
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0].split(/[,\t]/);
  
  const codeIndex = header.findIndex(h => h.toLowerCase().includes('code') || h.toLowerCase().includes('cpv'));
  const descIndex = header.findIndex(h => h.toLowerCase().includes('desc'));
  const countIndex = header.findIndex(h => h.toLowerCase().includes('count'));
  
  const codes: CPVCodeImport[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(/[,\t]/);
    
    if (parts.length > codeIndex && parts[codeIndex]) {
      codes.push({
        code: parts[codeIndex].trim(),
        description: parts[descIndex]?.trim() || 'No description',
        count: countIndex >= 0 ? parseInt(parts[countIndex]) : undefined
      });
    }
  }
  
  return codes;
}

/**
 * Main execution
 */
async function main() {
  console.log('📦 CPV Code Import Tool\n');
  
  // Check for data file
  try {
    const csvContent = await readFile('./data/cpv-codes.csv', 'utf-8').catch(() => null);
    
    if (csvContent) {
      console.log('Found CSV file: data/cpv-codes.csv');
      const codes = parseCSV(csvContent);
      await importCPVCodes(codes);
    } else {
      console.log('ℹ️  No data file found.');
      console.log('');
      console.log('To import CPV codes:');
      console.log('1. Export your XLSX to CSV');
      console.log('2. Save as: data/cpv-codes.csv');
      console.log('3. Format: Rank,CPV Code,Description,Count');
      console.log('4. Run this script again');
      console.log('');
      console.log('Or paste CSV data here for one-time import.');
    }
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main();
}

export { importCPVCodes, parseCSV };

