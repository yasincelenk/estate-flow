import { NextRequest, NextResponse } from 'next/server';

interface EmailData {
  to: string;
  subject: string;
  template: 'listing-confirmation' | 'general';
  data: {
    agentName: string;
    agentEmail: string;
    licenseNumber: string;
    title: string;
    address: string;
    price: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { to, subject, template, data }: EmailData = await request.json();

    if (!to || !subject || !template) {
      return NextResponse.json(
        { error: 'Missing required email parameters' },
        { status: 400 }
      );
    }

    // Simple email template for listing confirmation
    const getEmailTemplate = (template: string, data: EmailData['data']) => {
      if (template === 'listing-confirmation') {
        return `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Listing Created Successfully</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .listing-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
              .detail-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
              .detail-label { font-weight: bold; color: #555; }
              .detail-value { color: #333; }
              .price { font-size: 1.2em; font-weight: bold; color: #28a745; }
              .footer { text-align: center; margin-top: 30px; padding: 20px; color: #666; font-size: 0.9em; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>🏠 Listing Created Successfully!</h1>
              <p>Your property listing has been published</p>
            </div>
            
            <div class="content">
              <p>Dear ${data.agentName},</p>
              
              <p>Great news! Your property listing has been successfully created and is now live in our system. Here are the details:</p>
              
              <div class="listing-details">
                <h3>📍 Property Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Listing Title:</span>
                  <span class="detail-value">${data.title}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">${data.address}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Price:</span>
                  <span class="detail-value price">$${data.price.toLocaleString()}</span>
                </div>
              </div>
              
              <div class="listing-details">
                <h3>👤 Agent Information</h3>
                <div class="detail-row">
                  <span class="detail-label">Agent Name:</span>
                  <span class="detail-value">${data.agentName}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">License Number:</span>
                  <span class="detail-value">${data.licenseNumber}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Contact Email:</span>
                  <span class="detail-value">${data.agentEmail}</span>
                </div>
              </div>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Your listing will be reviewed by our team within 24 hours</li>
                <li>You'll receive additional marketing materials shortly</li>
                <li>Professional photography can be scheduled if needed</li>
              </ul>
              
              <p>If you have any questions or need to make changes to your listing, please don't hesitate to contact our support team.</p>
              
              <p>Thank you for choosing EstateFlow AI for your real estate needs!</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="button">View Your Listing</a>
              </div>
            </div>
            
            <div class="footer">
              <p>EstateFlow AI - Your Real Estate Technology Partner</p>
              <p>This is an automated email. Please do not reply to this address.</p>
            </div>
          </body>
          </html>
        `;
      }
      
      return `<p>${subject}</p><p>Data: ${JSON.stringify(data)}</p>`;
    };

    const emailHtml = getEmailTemplate(template, data);

    // For development, we'll log the email content
    // In production, you would integrate with an email service like:
    // - SendGrid
    // - AWS SES
    // - Mailgun
    // - Nodemailer with SMTP
    
    console.log('📧 Email Notification Details:');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('Template:', template);
    console.log('HTML Length:', emailHtml.length);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // In a real implementation, you would call your email service here
    // Example with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to,
    //   from: 'noreply@estateflow.ai',
    //   subject,
    //   html: emailHtml,
    // });

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
      details: {
        to,
        subject,
        template,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send email notification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}