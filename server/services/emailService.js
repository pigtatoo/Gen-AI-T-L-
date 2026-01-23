const { Resend } = require('resend');
require('dotenv').config();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send newsletter email with PDF attachment
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.moduleTitle - Module title
 * @param {Array} options.topics - Topic titles
 * @param {Buffer} options.pdfBuffer - PDF buffer to attach
 * @returns {Promise} Result of sending email
 */
async function sendNewsletterEmail(options) {
  const { to, moduleTitle, topics, pdfBuffer } = options;

  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured. Set RESEND_API_KEY in .env');
  }

  // Email body HTML
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f44336; color: white; padding: 20px; text-align: center; border-radius: 5px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header p { margin: 5px 0 0 0; font-size: 14px; }
          .content { padding: 20px; }
          .topics { background-color: #f5f5f5; padding: 10px; border-left: 4px solid #2196F3; margin: 15px 0; }
          .topics strong { color: #2196F3; }
          .footer { border-top: 1px solid #ddd; padding-top: 10px; margin-top: 20px; font-size: 12px; color: #666; }
          .cta-button { display: inline-block; background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📰 Your Weekly Newsletter</h1>
            <p>Module: <strong>${moduleTitle}</strong></p>
          </div>
          
          <div class="content">
            <h2>Hello,</h2>
            <p>Your weekly newsletter for <strong>${moduleTitle}</strong> has been generated and is ready for review!</p>
            
            <div class="topics">
              <strong>📌 Topics Covered:</strong><br>
              ${topics.map(t => `• ${t}`).join('<br>')}
            </div>
            
            <p>This newsletter includes:</p>
            <ul>
              <li>Latest relevant articles from your selected topics</li>
              <li>Real-world case studies</li>
              <li>Key concepts and definitions</li>
              <li>Important Q&A pairs</li>
            </ul>
            
            <p>Please find the complete newsletter PDF attached below.</p>
            
            <p>
              <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/chatpage?moduleId=${options.moduleId}" class="cta-button">
                View in App
              </a>
            </p>
          </div>
          
          <div class="footer">
            <p>This newsletter was auto-generated based on your subscription preferences.</p>
            <p>You can manage your newsletter subscriptions anytime by visiting your newsletter preferences.</p>
            <p><strong>Synthora Learning Platform</strong></p>
          </div>
        </div>
      </body>
    </html>
  `;

  // Convert PDF buffer to base64 for attachment
  const pdfBase64 = pdfBuffer.toString('base64');
  const filename = `newsletter-${moduleTitle.replace(/\s+/g, '-').toLowerCase()}.pdf`;

  try {
    console.log(`[Email] Sending newsletter to ${to}...`);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: to,
      subject: `📰 Weekly Newsletter: ${moduleTitle}`,
      html: htmlBody,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer
        }
      ]
    });
    
    if (result.error) {
      throw new Error(result.error.message);
    }
    
    console.log(`✓ [Email] Newsletter sent successfully to ${to}. Message ID: ${result.data.id}`);
    return result;
  } catch (error) {
    console.error(`✗ [Email] Failed to send newsletter to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Verify email service is working
 * @returns {Promise<boolean>} True if connection is successful
 */
async function verifyEmailService() {
  try {
    console.log('[Email] Verifying Resend connection...');
    
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not set');
    }
    
    console.log('✓ [Email] Resend API key configured');
    return true;
  } catch (error) {
    console.error('✗ [Email] Resend setup failed:', error.message);
    console.warn('[Email] Make sure RESEND_API_KEY and RESEND_FROM_EMAIL are set in .env');
    return false;
  }
}

module.exports = {
  sendNewsletterEmail,
  verifyEmailService
};
