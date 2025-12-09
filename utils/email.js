import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, text, html }) => {
  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  };
  
  return await sgMail.send(msg);
};

export const sendWelcomeEmail = async (email, name) => {
  return await sendEmail({
    to: email,
    subject: 'Welcome to Diary of an Investor Newsletter',
    text: `Hi ${name || 'there'},\n\nThank you for subscribing to our newsletter!`,
    html: `<p>Hi ${name || 'there'},</p><p>Thank you for subscribing to our newsletter!</p>`,
  });
};

export const sendContactEmail = async ({ name, email, message }) => {
  return await sendEmail({
    to: process.env.ADMIN_EMAIL,
    subject: `New Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Message:</strong></p><p>${message}</p>`,
  });
};
