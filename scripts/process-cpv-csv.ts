/**
 * Process CPV CSV and add check digits
 * 
 * Converts the SIMAP CSV (without check digits) to our format (with check digits)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Calculate CPV check digit using EU algorithm
 */
function calculateCheckDigit(code: string): number {
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
function getCPVLevel(code: string): 'Divisie' | 'Groep' | 'Klasse' | 'Categorie' {
  const cleanCode = code.padStart(8, '0');
  
  if (cleanCode.endsWith('000000')) return 'Divisie';
  if (cleanCode.endsWith('0000')) return 'Groep';
  if (cleanCode.endsWith('00')) return 'Klasse';
  return 'Categorie';
}

/**
 * Check if code is TenderNed compatible
 */
function isTenderNedCompatible(code: string): boolean {
  const cleanCode = code.padStart(8, '0');
  // TenderNed does NOT accept Divisie (XX000000) or Groep (XXXX0000) level codes
  return !cleanCode.endsWith('0000');
}

interface CPVCode {
  code: string;
  coreCode: string;
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  tenderNedCompatible: boolean;
}

/**
 * Parse CSV and add check digits
 */
function processCPVCodes(csvPath: string): CPVCode[] {
  console.log(`📖 Reading ${csvPath}...`);
  
  const csvContent = readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  console.log(`📊 Found ${lines.length - 1} codes (excluding header)`);
  
  const codes: CPVCode[] = [];
  let errors = 0;
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    
    // Parse CSV (handle quoted descriptions with commas)
    const match = line.match(/^(\d+),"?([^"]*)"?$/);
    
    if (!match) {
      console.warn(`⚠️  Line ${i}: Could not parse: ${line.substring(0, 50)}...`);
      errors++;
      continue;
    }
    
    const [, coreCode, description] = match;
    
    try {
      // Pad to 8 digits
      const paddedCode = coreCode.padStart(8, '0');
      
      // Calculate check digit
      const checkDigit = calculateCheckDigit(paddedCode);
      
      // Determine level
      const level = getCPVLevel(paddedCode);
      
      // Check TenderNed compatibility
      const tenderNedCompatible = isTenderNedCompatible(paddedCode);
      
      codes.push({
        code: `${paddedCode}-${checkDigit}`,
        coreCode: paddedCode,
        checkDigit,
        description: description.trim(),
        level,
        tenderNedCompatible
      });
      
      if ((i % 1000) === 0) {
        console.log(`   Processed ${i}/${lines.length}...`);
      }
      
    } catch (error) {
      console.error(`❌ Error processing line ${i}: ${error}`);
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
  console.log(`   Divisie: ${stats.divisie}`);
  console.log(`   Groep: ${stats.groep}`);
  console.log(`   Klasse: ${stats.klasse}`);
  console.log(`   Categorie: ${stats.categorie}`);
  console.log(`   TenderNed Compatible: ${stats.tenderNedCompatible}`);
  
  return codes;
}

/**
 * Save processed codes as TypeScript file
 */
function saveAsTypeScript(codes: CPVCode[], outPath: string): void {
  console.log(`\n💾 Saving to ${outPath}...`);
  
  const content = `/**
 * CPV Codes met Check Digits
 * 
 * Gegenereerd uit: overzicht_cpv_codes_simap.csv
 * Totaal: ${codes.length} codes
 * 
 * Format: XXXXXXXX-X (8 cijfers + check digit)
 * Levels: Divisie (${codes.filter(c => c.level === 'Divisie').length}), Groep (${codes.filter(c => c.level === 'Groep').length}), Klasse (${codes.filter(c => c.level === 'Klasse').length}), Categorie (${codes.filter(c => c.level === 'Categorie').length})
 * TenderNed Compatible: ${codes.filter(c => c.tenderNedCompatible).length} codes
 */

export interface CPVCode {
  code: string; // Format: XXXXXXXX-X (with check digit)
  coreCode: string; // Format: XXXXXXXX (without check digit)
  checkDigit: number;
  description: string;
  level: 'Divisie' | 'Groep' | 'Klasse' | 'Categorie';
  tenderNedCompatible: boolean; // false for Divisie & Groep
}

export const CPV_CODES: CPVCode[] = ${JSON.stringify(codes, null, 2)};

// Export by level for easy filtering
export const CPV_DIVISIE = CPV_CODES.filter(c => c.level === 'Divisie');
export const CPV_GROEP = CPV_CODES.filter(c => c.level === 'Groep');
export const CPV_KLASSE = CPV_CODES.filter(c => c.level === 'Klasse');
export const CPV_CATEGORIE = CPV_CODES.filter(c => c.level === 'Categorie');
export const CPV_TENDERNED_COMPATIBLE = CPV_CODES.filter(c => c.tenderNedCompatible);

/**
 * Search CPV codes by description or code
 */
export function searchCPVCodes(query: string, onlyCompatible = false): CPVCode[] {
  if (!query || query.length < 2) {
    // Return popular Klasse-level codes by default
    return CPV_KLASSE.slice(0, 20);
  }
  
  const lowerQuery = query.toLowerCase();
  const codes = onlyCompatible ? CPV_TENDERNED_COMPATIBLE : CPV_CODES;
  
  return codes.filter(cpv => 
    cpv.description.toLowerCase().includes(lowerQuery) || 
    cpv.code.includes(query) ||
    cpv.coreCode.includes(query)
  ).slice(0, 50);
}

/**
 * Get sector from CPV code
 */
export function getSectorFromCPV(code: string): string | null {
  if (!code || code.length < 2) return null;
  
  const prefix = code.substring(0, 2);
  const sectorMap: Record<string, string> = {
    '03': 'Landbouw & Voeding',
    '09': 'Energie',
    '14': 'Mijnbouw & Metalen',
    '15': 'Voeding & Dranken',
    '16': 'Landbouwmachines',
    '18': 'Kleding & Schoeisel',
    '19': 'Leder & Textiel',
    '22': 'Drukwerk',
    '24': 'Chemische Producten',
    '30': 'Kantoorapparatuur & Computers',
    '31': 'Elektrische Machines',
    '32': 'Telecommunicatie',
    '33': 'Medische Apparatuur',
    '34': 'Transport Materieel',
    '35': 'Veiligheid & Defensie',
    '37': 'Muziek & Sport',
    '38': 'Laboratorium & Precisie',
    '39': 'Meubilair',
    '41': 'Water',
    '42': 'Bedrijfsmachines',
    '43': 'Mijnbouw & Bouwmachines',
    '44': 'Bouwmaterialen',
    '45': 'Bouw & Civiel',
    '48': 'Software & IT',
    '50': 'Reparatie & Onderhoud',
    '51': 'Installatiediensten',
    '55': 'Horeca',
    '60': 'Transport',
    '63': 'Transport Ondersteunend',
    '64': 'Post & Telecom',
    '65': 'Nutsbedrijven',
    '66': 'Financieel',
    '70': 'Vastgoed',
    '71': 'Architectuur & Ingenieurs',
    '72': 'IT-diensten',
    '73': 'Onderzoek & Ontwikkeling',
    '75': 'Openbaar Bestuur',
    '76': 'Olie & Gas',
    '77': 'Landbouw Diensten',
    '79': 'Zakelijke Diensten',
    '80': 'Onderwijs',
    '85': 'Zorg & Sociaal',
    '90': 'Milieu & Afval',
    '92': 'Cultuur & Sport',
    '98': 'Overige Diensten'
  };
  
  return sectorMap[prefix] || null;
}
`;
  
  writeFileSync(outPath, content, 'utf-8');
  console.log(`✅ Saved ${codes.length} codes to ${outPath}`);
}

/**
 * Save as JSON for MongoDB import
 */
function saveAsJSON(codes: CPVCode[], outPath: string): void {
  console.log(`\n💾 Saving to ${outPath}...`);
  
  const json = JSON.stringify(codes, null, 2);
  writeFileSync(outPath, json, 'utf-8');
  
  console.log(`✅ Saved ${codes.length} codes to ${outPath}`);
}

// Main execution
const csvPath = join(process.cwd(), 'data', 'overzicht_cpv_codes_simap.csv');
const tsOutPath = join(process.cwd(), 'src', 'lib', 'cpv-codes-complete.ts');
const jsonOutPath = join(process.cwd(), 'data', 'cpv-codes-processed.json');

console.log('🚀 CPV Code Processor\n');

try {
  const codes = processCPVCodes(csvPath);
  saveAsTypeScript(codes, tsOutPath);
  saveAsJSON(codes, jsonOutPath);
  
  console.log(`\n🎉 Processing complete!`);
  console.log(`\n📁 Files created:`);
  console.log(`   - ${tsOutPath}`);
  console.log(`   - ${jsonOutPath}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Import to MongoDB: npx ts-node scripts/import-to-mongodb.ts`);
  console.log(`   2. Update CPV selector to use new data`);
  console.log(`   3. Test TenderNed search with check digits`);
  
} catch (error) {
  console.error('❌ Processing failed:', error);
  process.exit(1);
}

