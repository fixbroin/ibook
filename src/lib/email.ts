
'use server';

import nodemailer from 'nodemailer';
import { getAdminSettings } from './data';
import fs from 'fs';
import path from 'path';

type PlaceholderData = { [key: string]: string };

export async function sendEmail({
    to,
    subject,
    template,
    data
}: {
    to: string,
    subject: string,
    template: string,
    data: PlaceholderData
}): Promise<void> {
    const settings = await getAdminSettings();

    if (!settings?.smtp?.host || !settings.smtp.port || !settings.smtp.senderEmail) {
        console.warn('SMTP settings are not configured. Email will be logged to the console instead of sent.');
        // Log details for debugging
        console.log("--- Email Details (Not Sent) ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Template: ${template}`);
        console.log(`Data:`, data);
        console.log("---------------------------------");
        return;
    }
    
    const { host, port, senderEmail, username, password } = settings.smtp;

    if (!username || !password) {
        console.warn("SMTP username or password not configured. Email will be logged to console instead of sent.");
        console.log("--- Email Details (Not Sent) ---");
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Template: ${template}`);
        console.log(`Data:`, data);
        console.log("---------------------------------");
        return;
    }
    
    // Read and populate the HTML template
    let htmlContent;
    try {
        const templatePath = path.resolve(process.cwd(), 'src', 'emails', template);
        htmlContent = fs.readFileSync(templatePath, 'utf8');

        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            htmlContent = htmlContent.replace(regex, value);
        }
    } catch (error) {
        console.error(`Failed to read or populate email template ${template}:`, error);
        return; // Don't send if template fails
    }


    const transporter = nodemailer.createTransport({
        host: host,
        port: port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
            user: username,
            pass: password,
        },
    });

    const mailOptions = {
        from: `BroBookMe <${senderEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully to ${to} using template ${template}`);
    } catch (error) {
        console.error(`Failed to send email to ${to}:`, error);
    }
}
