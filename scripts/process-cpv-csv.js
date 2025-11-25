/**
 * Process CPV CSV and add check digits
 * 
 * Usage: node scripts/process-cpv-csv.js
 */

const fs = require('fs');
const path = require('path');

/**
 * Calculate CPV check digit using EU algorithm
 */
function calculateCheckDigit(code) {
  const cleanCode = code.replace(/[^\d]/g, '').padStart(8, '0');
  
  if (cleanCode.length !== 8) {
    throw new Error(`Invalid CPV code: ${code}`);
  }
  
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  
  for (let i = 0; i < 8; i++) {
    sum += parseInt(cleanCode[i]) * weights[i];
  }
  
  let checkDigit = 11 - (sum % 11);
  if (checkDigit >= 10) checkDigit = 0;
  
  return checkDigit;
}

/**
 * Determine CPV level based on code pattern
 */
function getCPVLevel(code) {
  const cleanCode = code.padStart(8, '0');
  
  if (cleanCode.endsWith('000000')) return 'Divisie';
  if (cleanCode.endsWith('0000')) return 'Groep';
  if (cleanCode.endsWith('00')) return 'Klasse';
  return 'Categorie';
}

/**
 * Check if code is TenderNed compatible
 * 
 * ALLE CPV codes zijn TenderNed compatible - TenderNed gebruikt zelf groepscodes in hun XML data
 */
function isTenderNedCompatible(code) {
  // Alle EU CPV codes zijn compatible met TenderNed
  return true;
}

/**
 * Parse CSV and add check digits
 */
function processCPVCodes(csvPath) {
  console.log(`📖 Reading ${csvPath}...`);
  
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  console.log(`📊 Found ${lines.length - 1} codes (excluding header)\n`);
  
  const codes = [];
  let errors = 0;
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV (handle quoted descriptions with commas)
    // Format: CODE,"Description" or CODE,Description
    const parts = line.split(',');
    
    if (parts.length < 2) {
      console.warn(`⚠️  Line ${i}: Could not parse`);
      errors++;
      continue;
    }
    
    const rawCode = parts[0].trim();
    // Join remaining parts (in case description has commas) and remove quotes
    const description = parts.slice(1).join(',').replace(/^"|"$/g, '').trim();
    
    if (!rawCode || !description) {
      errors++;
      continue;
    }
    
    try {
      // Check if code already has check digit (format: XXXXXXXX-X)
      const match = rawCode.match(/^(\d+)-(\d)$/);
      
      let coreCode, checkDigit;
      
      if (match) {
        // Code already has check digit
        coreCode = match[1].padStart(8, '0');
        checkDigit = parseInt(match[2]);
      } else {
        // Code without check digit, calculate it
        coreCode = rawCode.padStart(8, '0');
        checkDigit = calculateCheckDigit(coreCode);
      }
      
      // Determine level
      const level = getCPVLevel(coreCode);
      
      // Check TenderNed compatibility
      const tenderNedCompatible = isTenderNedCompatible(coreCode);
      
      codes.push({
        code: `${coreCode}-${checkDigit}`,
        coreCode: coreCode,
        checkDigit,
        description: description.trim(),
        level,
        tenderNedCompatible
      });
      
      if ((i % 1000) === 0) {
        console.log(`   Processed ${i}/${lines.length}...`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing line ${i}:`, error.message);
      errors++;
    }
  }
  
  console.log(`\n✅ Processed ${codes.length} codes`);
  console.log(`❌ Errors: ${errors}`);
  
  // Statistics
  const stats = {
    total: codes.length,
    divisie: codes.filter(c => c.level === 'Divisie').length,
    groep: codes.filter(c => c.level === 'Groep').length,
    klasse: codes.filter(c => c.level === 'Klasse').length,
    categorie: codes.filter(c => c.level === 'Categorie').length,
    tenderNedCompatible: codes.filter(c => c.tenderNedCompatible).length
  };
  
  console.log(`\n📊 Statistics:`);
  console.log(`   Total: ${stats.total}`);
  console.log(`   Divisie: ${stats.divisie} (niet compatible met TenderNed)`);
  console.log(`   Groep: ${stats.groep} (niet compatible met TenderNed)`);
  console.log(`   Klasse: ${stats.klasse} ✅`);
  console.log(`   Categorie: ${stats.categorie} ✅`);
  console.log(`   TenderNed Compatible: ${stats.tenderNedCompatible} (${Math.round(stats.tenderNedCompatible/stats.total*100)}%)`);
  
  return codes;
}

/**
 * Save as JSON for easy import
 */
function saveAsJSON(codes, outPath) {
  console.log(`\n💾 Saving to ${outPath}...`);
  
  const json = JSON.stringify(codes, null, 2);
  fs.writeFileSync(outPath, json, 'utf-8');
  
  const sizeKB = Math.round(json.length / 1024);
  console.log(`✅ Saved ${codes.length} codes (${sizeKB} KB)`);
}

/**
 * Generate small TypeScript file for UI autocomplete (top 200)
 */
function saveTopCodesAsTS(codes, outPath) {
  console.log(`\n💾 Generating UI autocomplete file...`);
  
  // Get top codes per popular sectors
  const popular = [];
  
  // Top Klasse and Categorie level codes from important sectors
  const importantPrefixes = ['45', '71', '72', '77', '79', '85', '90', '80', '60'];
  
  for (const prefix of importantPrefixes) {
    const sectorCodes = codes.filter(c => 
      c.coreCode.startsWith(prefix) && 
      c.tenderNedCompatible
    ).slice(0, 15); // Top 15 per sector
    
    popular.push(...sectorCodes);
  }
  
  // Add some frequently used codes
  const frequentCodes = [
    '79620000', // Terbeschikkingstelling personeel
    '45000000', // Bouwwerkzaamheden
    '72000000', // IT-diensten
    '77000000', // Landbouw diensten
    '71000000', // Architectuur
  ];
  
  for (const freq of frequentCodes) {
    const code = codes.find(c => c.coreCode === freq.padStart(8, '0'));
    if (code && !popular.find(p => p.code === code.code)) {
      popular.push(code);
    }
  }
  
  const content = `/**
 * CPV Codes - Top Codes voor UI Autocomplete
 * 
 * Dit is een subset van ${codes.length} codes, alleen de meest gebruikte
 * Voor volledige lijst zie MongoDB of cpv-codes-complete.ts
 */

export interface CPVCode {
  code: string;
  coreCode: string;
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  tenderNedCompatible: boolean;
}

export const CPV_CODES_TOP: CPVCode[] = ${JSON.stringify(popular.slice(0, 200), null, 2)};

export function searchCPVCodes(query: string): CPVCode[] {
  if (!query || query.length < 2) return CPV_CODES_TOP.slice(0, 20);
  
  const lowerQuery = query.toLowerCase();
  return CPV_CODES_TOP.filter(cpv => 
    cpv.description.toLowerCase().includes(lowerQuery) || 
    cpv.code.includes(query) ||
    cpv.coreCode.includes(query)
  ).slice(0, 20);
}

export function getSectorFromCPV(code: string): string | null {
  if (!code || code.length < 2) return null;
  
  const prefix = code.substring(0, 2);
  const sectorMap: Record<string, string> = {
    '45': 'Bouw & Civiel',
    '71': 'Architectuur & Ingenieurs',
    '72': 'IT-diensten',
    '77': 'Landbouw',
    '79': 'Zakelijke Diensten',
    '85': 'Zorg & Sociaal',
    '90': 'Milieu & Afval',
    '80': 'Onderwijs',
    '60': 'Transport',
    '55': 'Horeca & Catering',
  };
  
  return sectorMap[prefix] || null;
}
`;
  
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`✅ Saved top ${Math.min(popular.length, 200)} codes for UI`);
}

// Main execution
const csvPath = path.join(process.cwd(), 'data', 'overzicht_cpv_codes_simap.csv');
const jsonOutPath = path.join(process.cwd(), 'data', 'cpv-codes-processed.json');
const tsOutPath = path.join(process.cwd(), 'src', 'lib', 'cpv-codes-ui.ts');

console.log('🚀 CPV Code Processor\n');

try {
  const codes = processCPVCodes(csvPath);
  saveAsJSON(codes, jsonOutPath);
  saveTopCodesAsTS(codes, tsOutPath);
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`\n📁 Files created:`);
  console.log(`   - ${jsonOutPath} (ALL ${codes.length} codes)`);
  console.log(`   - ${tsOutPath} (Top 200 for UI)`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Update CPVCodeSelector to use new file`);
  console.log(`   2. Import JSON to MongoDB for full search`);
  console.log(`   3. Test TenderNed search!`);
  
} catch (error) {
  console.error('❌ Processing failed:', error);
  process.exit(1);
}

