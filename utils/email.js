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
  const welcomeText = `We appreciate you joining and becoming a part of this community. You are now among the increasing number of people who aspire to improve their understanding of money, make solid investments, and fortify their financial future. Each edition aims to instruct, mentor, and push you to reconsider how you handle your finances.

Simple lessons, market insights, investing techniques, and useful tools that support your growth one choice at a time are what you can anticipate. This is a mindset journey rather than just a newsletter.

Welcome to the adventure. This is where your financial development begins.`;
  
  const welcomeHtml = `
    <p>We appreciate you joining and becoming a part of this community. You are now among the increasing number of people who aspire to improve their understanding of money, make solid investments, and fortify their financial future. Each edition aims to instruct, mentor, and push you to reconsider how you handle your finances.</p>
    
    <p>Simple lessons, market insights, investing techniques, and useful tools that support your growth one choice at a time are what you can anticipate. This is a mindset journey rather than just a newsletter.</p>
    
    <p>Welcome to the adventure. This is where your financial development begins.</p>
  `;
  
  return await sendEmail({
    to: email,
    subject: 'Welcome to The Diary of an Investor Newsletter',
    text: welcomeText,
    html: welcomeHtml,
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

export const sendNewsletterToSubscribers = async (subscribers, newsletterTitle, newsletterUrl) => {
  const emails = subscribers.map(sub => sub.email);
  
  return await sendEmail({
    to: emails,
    subject: `New Newsletter: ${newsletterTitle}`,
    text: `A new newsletter "${newsletterTitle}" is now available. View it at: ${newsletterUrl}`,
    html: `<h2>New Newsletter Available</h2><p><strong>${newsletterTitle}</strong></p><p><a href="${newsletterUrl}">Read Newsletter</a></p>`,
  });
};
