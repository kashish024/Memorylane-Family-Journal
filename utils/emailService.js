import Constants from 'expo-constants';

export const sendMonthlyEmail = async (toEmail, subject, htmlContent) => {
  try {
    // Get API key from EAS environment variable
    const RESEND_API_KEY = process.env.RESEND_API_KEY || Constants.expoConfig?.extra?.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY not found in environment variables');
      throw new Error('Email service unavailable on client. Configure server-side Resend integration.');
    }
    
    console.log('📧 Sending email to:', toEmail);
    
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'MemoryLane <noreply@mymemorlylane.com>', // Verified domain
        to: [toEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('📧 Email error:', errorText);
      throw new Error(`Email failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('📧 Email sent successfully! ID:', data.id);
    
    return data;
  } catch (error) {
    console.error('📧 Error sending email:', error);
    throw error;
  }
};
