import nodemailer from "nodemailer";

interface SubmissionData {
  title: string;
  author: string;
  isbn: string | null;
  teacher: { name: string };
}

export async function sendSubmissionEmail(submission: SubmissionData) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!gmailUser || !gmailPass || !adminEmail) {
    console.log("Email not configured — skipping submission notification");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  await transporter.sendMail({
    from: `"Little Library" <${gmailUser}>`,
    to: adminEmail,
    subject: `📚 New Book Submission: "${submission.title}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 500px;">
        <h2 style="color: #4338ca;">📚 New Book Submission</h2>
        <p><strong>${submission.teacher.name}</strong> has submitted a book for review:</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Title</td><td style="padding: 8px;">${submission.title}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Author</td><td style="padding: 8px;">${submission.author}</td></tr>
          ${submission.isbn ? `<tr><td style="padding: 8px; font-weight: bold;">ISBN</td><td style="padding: 8px;">${submission.isbn}</td></tr>` : ""}
        </table>
        <p style="margin-top: 20px;">
          <a href="${baseUrl}/admin/submissions" 
             style="background: #4338ca; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px;">
            Review Submissions
          </a>
        </p>
      </div>
    `,
  });

  console.log(`Submission notification email sent to ${adminEmail}`);
}
