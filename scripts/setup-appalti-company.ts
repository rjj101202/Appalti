import { getDatabase } from '../src/lib/mongodb';
import { getCompanyRepository } from '../src/lib/db/repositories/companyRepository';
import { getUserRepository } from '../src/lib/db/repositories/userRepository';
import { getMembershipRepository } from '../src/lib/db/repositories/membershipRepository';
import { CompanyRole, PlatformRole } from '../src/lib/db/models/Membership';
import { ObjectId } from 'mongodb';

async function setupAppaltiCompany() {
  try {
    console.log('🚀 Setting up Appalti company...');
    
    // Get repositories
    const companyRepo = await getCompanyRepository();
    const userRepo = await getUserRepository();
    const membershipRepo = await getMembershipRepository();
    
    // Check if Appalti company already exists
    let appaltiCompany = await companyRepo.getAppaltiCompany();
    
    if (appaltiCompany) {
      console.log('✅ Appalti company already exists:', appaltiCompany.name);
      return;
    }
    
    // Create system user for Appalti
    const systemUser = await userRepo.findOrCreate({
      auth0Id: 'system',
      email: 'system@appalti.nl',
      name: 'Appalti System',
      emailVerified: true,
    });
    
    console.log('✅ System user created/found');
    
    // Create Appalti company
    appaltiCompany = await companyRepo.create({
      name: 'Appalti',
      kvkNumber: '12345678', // Replace with actual KVK number
      isAppaltiInternal: true,
      createdBy: systemUser.user._id!.toString(),
      settings: {
        primaryColor: '#9333ea',
        allowedEmailDomains: ['appalti.nl'],
      },
    });
    
    console.log('✅ Appalti company created:', appaltiCompany.name);
    console.log('   Tenant ID:', appaltiCompany.tenantId);
    
    // Create membership for system user
    await membershipRepo.create({
      userId: systemUser.user._id!.toString(),
      companyId: appaltiCompany._id!.toString(),
      tenantId: appaltiCompany.tenantId,
      companyRole: CompanyRole.OWNER,
      platformRole: PlatformRole.SUPER_ADMIN,
      invitedBy: systemUser.user._id!.toString(),
    });
    
    console.log('✅ System user membership created');
    
    console.log('\n🎉 Appalti company setup complete!');
    console.log('   Employees with @appalti.nl emails will be automatically added to this company.');
    
  } catch (error) {
    console.error('❌ Error setting up Appalti company:', error);
  } finally {
    process.exit(0);
  }
}

// Run the setup
setupAppaltiCompany();