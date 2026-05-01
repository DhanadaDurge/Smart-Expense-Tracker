const { Resend } = require("resend");

// Lazy initialization of Resend client
let resendClient = null;

function getResendClient() {
    if (resendClient) return resendClient;
    
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === "re_your_api_key") {
        console.warn("⚠️  RESEND_API_KEY is missing or not configured. Email features will not work.");
        return null;
    }
    
    console.log("ℹ️  Initializing Resend with API Key:", apiKey.substring(0, 7) + "...");
    resendClient = new Resend(apiKey);
    return resendClient;
}

/**
 * Sends a permission email for SMS tracking using Resend.
 * @param {string} toEmail 
 * @param {string} userName
 */
async function sendPermissionEmail(toEmail, userName = "Valued User") {
    const resend = getResendClient();
    
    if (!resend) {
        console.error("❌ Cannot send email: RESEND_API_KEY is missing.");
        throw new Error("Email service is not configured. Please add RESEND_API_KEY to your .env file.");
    }

    try {
        console.log(`📧 Attempting to send email to: ${toEmail} (${userName})`);
        
        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"; 
        
        const baseUrl = process.env.BASE_URL || "http://localhost:3000";
        const approvalLink = `${baseUrl}/approve-sms`;

        const { data, error } = await resend.emails.send({
            from: `ExpenseIQ <${fromEmail}>`,
            to: [toEmail],
            subject: `Action Required: Authorize SMS Access for ${userName}`,
            text: `Hello ${userName},\n\nWe received a request to enable Automatic SMS Tracking for your ExpenseIQ account. Please authorize this by visiting: ${approvalLink}\n\nIf you didn't request this, please ignore this email.`,
            html: `
                <!DOCTYPE html>
                <html>
                <body style="font-family: sans-serif; background-color: #f9fafb; padding: 40px 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
                        <div style="background: #4f46e5; padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 20px;">ExpenseIQ Authorization</h1>
                        </div>
                        <div style="padding: 30px; color: #374151;">
                            <p style="font-size: 16px;">Hello <strong>${userName}</strong>,</p>
                            <p>To enable <strong>Automatic SMS Tracking</strong> and start categorizing your expenses effortlessly, please confirm your authorization:</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${approvalLink}" 
                                   style="background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                                   Authorize Access
                                </a>
                            </div>
                            <p style="font-size: 14px; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 20px;">
                                If you didn't request this, you can safely ignore this email.
                            </p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        });

        if (error) {
            console.error("❌ Resend API Error:", error);
            throw error;
        }

        console.log("✅ Email sent successfully via Resend. ID:", data.id);
        return { success: true, messageId: data.id };
    } catch (error) {
        console.error("Email Service Error (Resend):", error);
        throw error;
    }
}

module.exports = {
    sendPermissionEmail
};
