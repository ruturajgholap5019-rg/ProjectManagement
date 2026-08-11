import { emailService } from './services/email.service.js';

async function testLiveResendEmail() {
  console.log('==================================================');
  console.log('🚀 SENDING LIVE TEST EMAIL VIA RESEND API');
  console.log('==================================================\n');

  // Resend sandbox recipient address
  const testRecipient = 'ruturajgholap5019@gmail.com';

  console.log(`1️⃣ Dispatching Welcome Credentials Email to ${testRecipient}...`);
  await emailService.sendWelcomeAccountEmail(
    testRecipient,
    'Ruturaj Gholap',
    'TempPass#9821!',
    'ADMIN'
  );

  console.log(`2️⃣ Dispatching Task Assignment Email to ${testRecipient}...`);
  await emailService.sendTaskAssignmentEmail(
    testRecipient,
    'Ruturaj Gholap',
    'Build Executive Admin Dashboard & Resend Email Integration',
    'Digital Project Management System',
    'HIGH',
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    'Verify live Resend API integration for account creation and task deliverable assignments.'
  );

  console.log('==================================================');
  console.log('🎉 LIVE RESEND EMAIL DISPATCH COMPLETED!');
  console.log('==================================================');
}

testLiveResendEmail().catch(console.error);
