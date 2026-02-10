import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.CLIENT_URL || 'https://predict-frontend-one.vercel.app/'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@predictwin.com',
    to: email,
    subject: 'Verify your email address - PredictWin',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #2563eb; text-align: center;">Welcome to PredictWin!</h1>
        <p>Thank you for registering with PredictWin. Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link in your browser:</p>
        <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Verification email sent to:', email);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
}

/** Send email to guest after order: account created with default password */
export async function sendGuestAccountEmail(email: string, name: string, tempPassword: string) {
  const loginUrl = `${process.env.CLIENT_URL || 'https://predict-frontend-one.vercel.app/'}/login`;
  const mailOptions = {
    from: process.env.SMTP_FROM || 'noreply@predictwin.com',
    to: email,
    subject: 'Tài khoản của bạn đã được tạo - PredictWin',
    html: `
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
        <h1 style="color: #2563eb; text-align: center;">Chào ${name || 'bạn'}!</h1>
        <p>Bạn vừa đặt hàng thành công. Chúng tôi đã tạo tài khoản cho bạn để bạn có thể theo dõi đơn hàng và sử dụng các tính năng khác.</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0;"><strong>Email đăng nhập:</strong> ${email}</p>
          <p style="margin: 0;"><strong>Mật khẩu mặc định:</strong> ${tempPassword}</p>
        </div>
        <p><strong>Lưu ý bảo mật:</strong> Lần đầu đăng nhập, bạn sẽ được yêu cầu đổi mật khẩu. Vui lòng đổi sang mật khẩu mới để bảo vệ tài khoản.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Đăng nhập ngay
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">Nếu bạn không thực hiện đặt hàng này, vui lòng bỏ qua email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Guest account email sent to:', email);
  } catch (error) {
    console.error('Error sending guest account email:', error);
    throw new Error('Failed to send guest account email');
  }
} 