const twilio = require('twilio');

// Initialize Twilio client
const createTwilioClient = () => {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
};

// Send SMS function
const sendSMS = async ({ to, message }) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio credentials not configured, SMS not sent');
      return { success: false, error: 'SMS service not configured' };
    }

    const client = createTwilioClient();
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log('SMS sent successfully:', result.sid);
    return { success: true, sid: result.sid };

  } catch (error) {
    console.error('SMS sending failed:', error);
    return { success: false, error: error.message };
  }
};

// Send OTP via SMS
const sendOTPSMS = async ({ to, otp, purpose = 'verification' }) => {
  const message = `B-Bike: Your ${purpose} code is ${otp}. This code expires in 10 minutes. Do not share this code with anyone.`;
  
  return await sendSMS({ to, message });
};

// Send notification SMS
const sendNotificationSMS = async ({ to, message }) => {
  const fullMessage = `B-Bike: ${message}`;
  
  return await sendSMS({ to, message: fullMessage });
};

module.exports = {
  sendSMS,
  sendOTPSMS,
  sendNotificationSMS
};
