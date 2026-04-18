/**
 * Notification Service
 *
 * Uses nodemailer for email dispatch. Falls back to console.log in development
 * when SMTP credentials are not configured — so the server never crashes.
 *
 * Required env vars for real email:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
 */

const nodemailer = require('nodemailer');

//  Transporter factory 
function createTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback: no-op transporter — just logs to console
  return {
    sendMail: async (opts) => {
      console.log(
        ` [DEV EMAIL — no SMTP configured]\n  To: ${opts.to}\n  Subject: ${opts.subject}\n  Body: ${opts.text || '(HTML only)'}`
      );
      return { messageId: 'dev-mode' };
    },
  };
}

const transporter = createTransporter();

//  Generic send helper 
async function sendEmail({ to, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Yoyo Hotels" <noreply@yoyo-hotels.com>',
      to,
      subject,
      html,
      text,
    });
    return info;
  } catch (err) {
    console.error(' Email send failed:', err.message);
    // Never throw — email failures should not crash the request
  }
}

//  Templates 
function bookingConfirmationEmail(booking, guest) {
  const refNum = `YY-${booking._id.toString().slice(-8).toUpperCase()}`;
  const checkIn = new Date(booking.checkIn).toDateString();
  const checkOut = new Date(booking.checkOut).toDateString();

  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #e63946; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Booking Confirmed! </h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 8px 8px;">
        <p style="font-size: 16px;">Hi ${guest.firstName},</p>
        <p>Your booking has been confirmed. Here are your details:</p>
        <table style="width:100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: 600;">Reference</td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${refNum}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: 600;">Check-in</td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${checkIn}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: 600;">Check-out</td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${checkOut}</td></tr>
          <tr><td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: 600;">Nights</td><td style="padding: 10px; border-bottom: 1px solid #ddd;">${booking.totalNights}</td></tr>
          <tr><td style="padding: 10px; font-weight: 600;">Total Paid</td><td style="padding: 10px;">₹${booking.totalAmount.toLocaleString('en-IN')}</td></tr>
        </table>
        <p style="color: #666;">Manage your booking at <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/my-bookings">My Bookings</a>.</p>
        <p>Thank you for choosing Yoyo Hotels! </p>
      </div>
    </div>
  `;

  return {
    to: guest.email,
    subject: `Booking Confirmed — ${refNum} | Yoyo Hotels`,
    html,
    text: `Hi ${guest.firstName}, your booking ${refNum} is confirmed. Check-in: ${checkIn}. Total: ₹${booking.totalAmount}`,
  };
}

function bookingCancellationEmail(booking, guest) {
  const refNum = `YY-${booking._id.toString().slice(-8).toUpperCase()}`;
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #6b7280; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Booking Cancelled</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 8px 8px;">
        <p>Hi ${guest.firstName},</p>
        <p>Your booking <strong>${refNum}</strong> has been cancelled.</p>
        ${booking.refundAmount > 0
          ? `<p>A refund of <strong>₹${booking.refundAmount.toLocaleString('en-IN')}</strong> will be processed within 5–7 business days.</p>`
          : '<p>This booking was not eligible for a refund per the cancellation policy.</p>'
        }
        <p>We hope to welcome you again at Yoyo Hotels soon.</p>
      </div>
    </div>
  `;

  return {
    to: guest.email,
    subject: `Booking Cancelled — ${refNum} | Yoyo Hotels`,
    html,
    text: `Hi ${guest.firstName}, your booking ${refNum} has been cancelled.`,
  };
}

function welcomeEmail(user) {
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #e63946; padding: 32px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Yoyo Hotels! </h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 8px 8px;">
        <p>Hi ${user.firstName},</p>
        <p>Your account has been created. Start exploring hotels at the best prices.</p>
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/hotels"
           style="display:inline-block;background:#e63946;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:12px;">
          Explore Hotels
        </a>
      </div>
    </div>
  `;

  return {
    to: user.email,
    subject: 'Welcome to Yoyo Hotels!',
    html,
    text: `Hi ${user.firstName}, welcome to Yoyo Hotels!`,
  };
}

//  Public notification functions 
module.exports = {
  sendBookingConfirmation: (booking, guest) =>
    sendEmail(bookingConfirmationEmail(booking, guest)),
  sendBookingCancellation: (booking, guest) =>
    sendEmail(bookingCancellationEmail(booking, guest)),
  sendWelcomeEmail: (user) => sendEmail(welcomeEmail(user)),
};
