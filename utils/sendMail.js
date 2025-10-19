require("dotenv").config();
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendPurchaseMail(to, courseName, amount, orderId) {
  const dashboardLink = "https://www.mathesis-coaching.com/dashboard"; // change if needed

  const msg = {
    to,
    from: {
      name: "Mathesis Coaching Institute",
      email: process.env.EMAIL_USER, // must be verified in SendGrid
    },
    subject: "🎉 Successful Course Purchase Confirmation",
    html: `
      <div style="font-family: Arial, sans-serif; padding: 25px; border-radius: 12px; background: #f8f9fa; color: #333;">
        <h2 style="color: #2e86de;">Thank you for your purchase!</h2>
        <p>Hi <b>${to.split('@')[0]}</b>,</p>
        <p>We’re excited to confirm your successful purchase of the course:</p>
        
        <div style="background: #fff; border: 1px solid #ddd; padding: 15px; border-radius: 8px;">
          <p><b>Course:</b> ${courseName}</p>
          <p><b>Amount Paid:</b> ₹${amount}</p>
          <p><b>Order ID:</b> ${orderId}</p>
        </div>

        <p style="margin-top: 20px;">You can start learning right away by clicking the button below:</p>
        
        <a href="${dashboardLink}" 
          style="display: inline-block; background-color: #2e86de; color: white; padding: 12px 22px; 
                 text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 10px;">
          🎓 View My Course
        </a>

        <p style="margin-top: 30px;">For any queries, feel free to contact our support team.</p>
        <p>Best regards,<br><b>Mathesis Coaching Institute Team</b></p>
        <hr style="margin-top: 20px;">
        <small style="color: #888;">This is a system-generated mail. Please do not reply directly.</small>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("✅ Purchase confirmation email sent successfully to:", to);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    if (error.response) console.error(error.response.body);
  }
}

module.exports = sendPurchaseMail;
