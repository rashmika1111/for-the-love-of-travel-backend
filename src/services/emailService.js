const nodemailer = require('nodemailer');
const { ENV_VARS, EMAIL_TEMPLATES } = require('../utils/constants');

// Email service class
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  // Initialize email transporter
  async initialize() {
    try {
      if (!ENV_VARS.SMTP_HOST || !ENV_VARS.SMTP_USER || !ENV_VARS.SMTP_PASS) {
        console.warn('Email configuration missing. Email service will be disabled.');
        return false;
      }

      this.transporter = nodemailer.createTransporter({
        host: ENV_VARS.SMTP_HOST,
        port: parseInt(ENV_VARS.SMTP_PORT) || 587,
        secure: ENV_VARS.SMTP_PORT === '465', // true for 465, false for other ports
        auth: {
          user: ENV_VARS.SMTP_USER,
          pass: ENV_VARS.SMTP_PASS
        },
        tls: {
          rejectUnauthorized: false
        }
      });

      // Verify connection
      await this.transporter.verify();
      this.initialized = true;
      console.log('Email service initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      this.initialized = false;
      return false;
    }
  }

  // Check if email service is available
  isAvailable() {
    return this.initialized && this.transporter;
  }

  // Send email
  async sendEmail(options) {
    if (!this.isAvailable()) {
      throw new Error('Email service is not available');
    }

    try {
      const mailOptions = {
        from: `"Love of Travel" <${ENV_VARS.SMTP_USER}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo || ENV_VARS.SMTP_USER,
        ...options.extra
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  // Send contact form confirmation
  async sendContactConfirmation(contactData) {
    const html = this.generateContactConfirmationHTML(contactData);
    const text = this.generateContactConfirmationText(contactData);

    return await this.sendEmail({
      to: contactData.email,
      subject: 'Thank you for contacting Love of Travel',
      html,
      text
    });
  }

  // Send admin notification for new contact
  async sendContactNotification(contactData) {
    const html = this.generateContactNotificationHTML(contactData);
    const text = this.generateContactNotificationText(contactData);

    return await this.sendEmail({
      to: ENV_VARS.SMTP_USER, // Admin email
      subject: `New Contact Form Submission - ${contactData.subject}`,
      html,
      text,
      replyTo: contactData.email
    });
  }

  // Send newsletter welcome email
  async sendNewsletterWelcome(newsletterData) {
    const html = this.generateNewsletterWelcomeHTML(newsletterData);
    const text = this.generateNewsletterWelcomeText(newsletterData);

    return await this.sendEmail({
      to: newsletterData.email,
      subject: 'Welcome to Love of Travel Newsletter!',
      html,
      text
    });
  }

  // Send newsletter unsubscribe confirmation
  async sendNewsletterUnsubscribe(newsletterData) {
    const html = this.generateNewsletterUnsubscribeHTML(newsletterData);
    const text = this.generateNewsletterUnsubscribeText(newsletterData);

    return await this.sendEmail({
      to: newsletterData.email,
      subject: 'You have been unsubscribed from Love of Travel Newsletter',
      html,
      text
    });
  }

  // Send comment notification to admin
  async sendCommentNotification(commentData) {
    const html = this.generateCommentNotificationHTML(commentData);
    const text = this.generateCommentNotificationText(commentData);

    return await this.sendEmail({
      to: ENV_VARS.SMTP_USER, // Admin email
      subject: `New Comment on "${commentData.postTitle}"`,
      html,
      text,
      replyTo: commentData.author.email
    });
  }

  // Send comment approval notification
  async sendCommentApproval(commentData) {
    const html = this.generateCommentApprovalHTML(commentData);
    const text = this.generateCommentApprovalText(commentData);

    return await this.sendEmail({
      to: commentData.author.email,
      subject: 'Your comment has been approved',
      html,
      text
    });
  }

  // Generate HTML templates
  generateContactConfirmationHTML(contactData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Contact Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Love of Travel</h1>
          </div>
          <div class="content">
            <h2>Thank you for contacting us!</h2>
            <p>Dear ${contactData.name},</p>
            <p>We have received your message and will get back to you as soon as possible.</p>
            <p><strong>Your message:</strong></p>
            <p style="background: white; padding: 15px; border-left: 4px solid #3498db;">
              ${contactData.message}
            </p>
            <p>We appreciate your interest in Love of Travel and look forward to helping you with your travel needs.</p>
            <p>Best regards,<br>The Love of Travel Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateContactNotificationHTML(contactData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .contact-info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #3498db; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Contact Form Submission</h1>
          </div>
          <div class="content">
            <div class="contact-info">
              <p><strong>Name:</strong> ${contactData.name}</p>
              <p><strong>Email:</strong> ${contactData.email}</p>
              <p><strong>Subject:</strong> ${contactData.subject}</p>
              <p><strong>Message:</strong></p>
              <p>${contactData.message}</p>
              <p><strong>Submitted:</strong> ${new Date(contactData.createdAt).toLocaleString()}</p>
            </div>
            <p>Please respond to this inquiry as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNewsletterWelcomeHTML(newsletterData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Love of Travel Newsletter</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Love of Travel!</h1>
          </div>
          <div class="content">
            <h2>Thank you for subscribing!</h2>
            <p>We're excited to have you join our travel community. You'll receive:</p>
            <ul>
              <li>Weekly travel inspiration and tips</li>
              <li>Exclusive travel deals and offers</li>
              <li>Destination guides and recommendations</li>
              <li>Travel stories from fellow adventurers</li>
            </ul>
            <p>Your subscription preferences:</p>
            <p><strong>Frequency:</strong> ${newsletterData.preferences.frequency}</p>
            <p><strong>Categories:</strong> ${newsletterData.preferences.categories.join(', ')}</p>
            <p>If you ever want to unsubscribe, you can do so at any time using the link in our emails.</p>
            <p>Happy travels!<br>The Love of Travel Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateNewsletterUnsubscribeHTML(newsletterData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Unsubscribed from Love of Travel Newsletter</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #95a5a6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You've been unsubscribed</h1>
          </div>
          <div class="content">
            <h2>We're sorry to see you go!</h2>
            <p>You have been successfully unsubscribed from the Love of Travel newsletter.</p>
            <p>We hope you enjoyed our content and that you'll consider subscribing again in the future.</p>
            <p>If you unsubscribed by mistake, you can always resubscribe on our website.</p>
            <p>Thank you for being part of our travel community!</p>
            <p>Best regards,<br>The Love of Travel Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateCommentNotificationHTML(commentData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Comment Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #9b59b6; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .comment-info { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #9b59b6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Comment on "${commentData.postTitle}"</h1>
          </div>
          <div class="content">
            <div class="comment-info">
              <p><strong>Author:</strong> ${commentData.author.name}</p>
              <p><strong>Email:</strong> ${commentData.author.email}</p>
              <p><strong>Website:</strong> ${commentData.author.website || 'Not provided'}</p>
              <p><strong>Comment:</strong></p>
              <p>${commentData.content}</p>
              <p><strong>Submitted:</strong> ${new Date(commentData.createdAt).toLocaleString()}</p>
            </div>
            <p>Please review and moderate this comment.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  generateCommentApprovalHTML(commentData) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Comment Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your comment has been approved!</h1>
          </div>
          <div class="content">
            <h2>Great news!</h2>
            <p>Your comment on "${commentData.postTitle}" has been approved and is now visible on our website.</p>
            <p>Thank you for contributing to the conversation!</p>
            <p>Best regards,<br>The Love of Travel Team</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate plain text versions
  generateContactConfirmationText(contactData) {
    return `
Love of Travel - Contact Confirmation

Dear ${contactData.name},

Thank you for contacting us! We have received your message and will get back to you as soon as possible.

Your message:
${contactData.message}

We appreciate your interest in Love of Travel and look forward to helping you with your travel needs.

Best regards,
The Love of Travel Team

This is an automated message. Please do not reply to this email.
    `;
  }

  generateContactNotificationText(contactData) {
    return `
New Contact Form Submission

Name: ${contactData.name}
Email: ${contactData.email}
Subject: ${contactData.subject}
Message: ${contactData.message}
Submitted: ${new Date(contactData.createdAt).toLocaleString()}

Please respond to this inquiry as soon as possible.
    `;
  }

  generateNewsletterWelcomeText(newsletterData) {
    return `
Welcome to Love of Travel Newsletter!

Thank you for subscribing! We're excited to have you join our travel community.

You'll receive:
- Weekly travel inspiration and tips
- Exclusive travel deals and offers
- Destination guides and recommendations
- Travel stories from fellow adventurers

Your subscription preferences:
Frequency: ${newsletterData.preferences.frequency}
Categories: ${newsletterData.preferences.categories.join(', ')}

If you ever want to unsubscribe, you can do so at any time using the link in our emails.

Happy travels!
The Love of Travel Team

This is an automated message. Please do not reply to this email.
    `;
  }

  generateNewsletterUnsubscribeText(newsletterData) {
    return `
You've been unsubscribed from Love of Travel Newsletter

We're sorry to see you go!

You have been successfully unsubscribed from the Love of Travel newsletter.

We hope you enjoyed our content and that you'll consider subscribing again in the future.

If you unsubscribed by mistake, you can always resubscribe on our website.

Thank you for being part of our travel community!

Best regards,
The Love of Travel Team

This is an automated message. Please do not reply to this email.
    `;
  }

  generateCommentNotificationText(commentData) {
    return `
New Comment on "${commentData.postTitle}"

Author: ${commentData.author.name}
Email: ${commentData.author.email}
Website: ${commentData.author.website || 'Not provided'}
Comment: ${commentData.content}
Submitted: ${new Date(commentData.createdAt).toLocaleString()}

Please review and moderate this comment.
    `;
  }

  generateCommentApprovalText(commentData) {
    return `
Your comment has been approved!

Great news! Your comment on "${commentData.postTitle}" has been approved and is now visible on our website.

Thank you for contributing to the conversation!

Best regards,
The Love of Travel Team

This is an automated message. Please do not reply to this email.
    `;
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.isAvailable()) {
        return { status: 'error', message: 'Email service not initialized' };
      }

      await this.transporter.verify();
      return { status: 'healthy', message: 'Email service is working properly' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();

module.exports = emailService;
