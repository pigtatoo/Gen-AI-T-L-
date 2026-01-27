const supabase = require('../config/supabase');
const nodemailer = require('nodemailer');

// Create transporter using env vars. Make sure EMAIL_FROM and PASS are set (use app-password for Gmail).
const EMAIL_FROM = process.env.EMAIL_FROM;
const PASS = process.env.PASS;

let transporter;
async function initTransporter() {
  if (!EMAIL_FROM || !PASS) return null;

  // primary: secure 465
  const primary = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: EMAIL_FROM, pass: PASS },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    greetingTimeout: 5000,
    socketTimeout: 10000
  });

  try {
    await primary.verify();
    console.log('[Mailer] SMTP primary transporter (465) verified');
    return primary;
  } catch (err) {
    console.error('[Mailer] primary transporter verify failed:', err && err.code ? err.code : err);
    // If primary fails, try fallback to 587 (STARTTLS)
    const fallback = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: EMAIL_FROM, pass: PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    try {
      await fallback.verify();
      console.log('[Mailer] SMTP fallback transporter (587) verified');
      return fallback;
    } catch (fbErr) {
      console.error('[Mailer] fallback transporter verify failed:', fbErr && fbErr.code ? fbErr.code : fbErr);
      return null;
    }
  }
}

// Initialize transporter asynchronously but do not block server start
initTransporter().then(t => { transporter = t; if (!t) console.warn('[Mailer] no working SMTP transporter configured'); });

exports.createTest = async (req, res) => {
  try {
    const { email, content } = req.body;
    if (!email || !content) return res.status(400).json({ error: 'Missing email or content' });

    const payload = { email, content, created_at: new Date().toISOString() };

    // Try to insert into Supabase (log errors but don't block email send)
    let supabaseRecord = null;
    try {
      const { data, error } = await supabase.from('Tests').insert([payload]).select();
      if (error) {
        console.error('Supabase insert error:', error);
      } else {
        supabaseRecord = data && data[0] ? data[0] : null;
      }
    } catch (sbErr) {
      console.error('Supabase exception:', sbErr);
    }

    // Send email if transporter available
    let emailSent = false;
    if (transporter) {
      try {
        const mailOptions = {
          from: EMAIL_FROM,
          to: email,
          subject: 'Test Message from Gen-AI',
          text: content,
          html: `<pre style="white-space:pre-wrap">${content}</pre>`
        };
        await transporter.sendMail(mailOptions);
        emailSent = true;
      } catch (mailErr) {
        console.error('Failed to send email:', mailErr);
      }
    } else {
      console.warn('Email transporter not configured. Set EMAIL_FROM and PASS in .env');
    }

    return res.json({ success: true, record: supabaseRecord, emailSent });
  } catch (e) {
    console.error('createTest error:', e);
    return res.status(500).json({ error: e.message });
  }
};
