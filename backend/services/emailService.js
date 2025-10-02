const nodemailer = require('nodemailer');
const { generateReferralLink } = require('../utils/helpers');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Email templates
const emailTemplates = {
  verification: (data) => ({
    subject: 'Welcome to B-Bike - Verify Your Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">B-Bike</h1>
          <p style="color: #6b7280; margin: 5px 0;">Crypto-Powered Referral Platform</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
          <h2 style="color: #1f2937; margin-top: 0;">Welcome, ${data.fullName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">
            Thank you for joining B-Bike! To complete your registration and start earning, 
            please verify your email address using the code below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: #2563eb; color: white; padding: 15px 30px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 3px; display: inline-block;">
              ${data.otp}
            </div>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            This code will expire in 10 minutes.
          </p>
        </div>
        
        ${data.referralCode ? `
        <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h3 style="color: #059669; margin-top: 0;">Your Referral Code</h3>
          <p style="color: #065f46; margin-bottom: 10px;">
            Start earning by sharing your unique referral code:
          </p>
          <div style="background: white; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 18px; font-weight: bold; text-align: center; color: #059669;">
            ${data.referralCode}
          </div>
        </div>
        ` : ''}
        
        <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; color: #6b7280; font-size: 14px;">
          <p>If you didn't create this account, please ignore this email.</p>
          <p>Best regards,<br>B-Bike Team</p>
        </div>
      </div>
    `
  }),

  depositConfirmation: (data) => ({
    subject: 'Deposit Confirmed - B-Bike',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">B-Bike</h1>
        </div>
        
        <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 30px; border-radius: 10px;">
          <h2 style="color: #059669; margin-top: 0;">✅ Deposit Confirmed!</h2>
          <p style="color: #065f46;">Hi ${data.fullName},</p>
          <p style="color: #065f46;">Your deposit has been successfully confirmed and added to your wallet.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${data.amount} ${data.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Transaction ID:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px; text-align: right;">${data.transactionId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">New Balance:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669; text-align: right;">${data.newBalance} ${data.currency}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #065f46;">
            Your funds are now earning daily returns! Login to your dashboard to track your growth.
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard" 
             style="background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Dashboard
          </a>
        </div>
      </div>
    `
  }),

  withdrawalRequest: (data) => ({
    subject: 'Withdrawal Request Received - B-Bike',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">B-Bike</h1>
        </div>
        
        <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 30px; border-radius: 10px;">
          <h2 style="color: #92400e; margin-top: 0;">⏳ Withdrawal Request Received</h2>
          <p style="color: #92400e;">Hi ${data.fullName},</p>
          <p style="color: #92400e;">We've received your withdrawal request and it's being processed.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${data.amount} ${data.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Wallet Address:</td>
                <td style="padding: 8px 0; font-family: monospace; font-size: 12px; text-align: right;">${data.walletAddress}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Request ID:</td>
                <td style="padding: 8px 0; font-family: monospace; text-align: right;">${data.requestId}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #92400e;">
            Your request is being reviewed by our team. You'll receive another email once it's processed.
          </p>
        </div>
      </div>
    `
  }),

  referralBonus: (data) => ({
    subject: 'Referral Bonus Earned! - B-Bike',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin: 0;">B-Bike</h1>
        </div>
        
        <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 30px; border-radius: 10px;">
          <h2 style="color: #059669; margin-top: 0;">🎉 Referral Bonus Earned!</h2>
          <p style="color: #065f46;">Hi ${data.fullName},</p>
          <p style="color: #065f46;">Great news! You've earned a referral bonus.</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Referred User:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${data.referredUser}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Bonus Amount:</td>
                <td style="padding: 8px 0; font-weight: bold; color: #059669; text-align: right;">${data.bonusAmount} ${data.currency}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Total Referrals:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${data.totalReferrals}</td>
              </tr>
            </table>
          </div>
          
          <p style="color: #065f46;">
            Keep sharing your referral link to earn more bonuses!
          </p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${generateReferralLink(process.env.FRONTEND_URL, data.referralCode)}" 
             style="background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Share Referral Link
          </a>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    const transporter = createTransporter();
    
    let emailContent;
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = { subject, html };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject: emailContent.subject,
      html: emailContent.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return result;

  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

// Send bulk emails
const sendBulkEmails = async (emails) => {
  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push({ success: true, messageId: result.messageId, to: email.to });
    } catch (error) {
      results.push({ success: false, error: error.message, to: email.to });
    }
  }
  
  return results;
};

module.exports = {
  sendEmail,
  sendBulkEmails
};
