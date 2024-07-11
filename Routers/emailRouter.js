import express from 'express';
import multer from 'multer';
import csvParser from 'csv-parser';
import fs from 'fs';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/send-email', upload.single('file'), async (req, res) => {
  try {
    const { email, subject, message, imageUrl, linkUrl, sendType } = req.body;
    const file = req.file;

    let emailList = [];

    if (sendType === 'bulk' && file) {
      // Parse the uploaded file to extract email IDs
      fs.createReadStream(file.path)
        .pipe(csvParser())
        .on('data', (row) => {
          emailList.push(row.email); 
        })
        .on('end', async () => {
          // Send emails to extracted email IDs
          await sendEmails(emailList, subject, message, imageUrl, linkUrl);
          res.json({ message: 'Emails sent successfully' });
        });
    } else {
      // Send email to a single recipient
      await sendEmail(email, subject, message, imageUrl, linkUrl);
      res.json({ message: 'Email sent successfully' });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

const sendEmails = async (emailList, subject, message, imageUrl, linkUrl) => {
  // Implement email sending logic here
  // Example:
  for (let email of emailList) {
    await sendEmail(email, subject, message, imageUrl, linkUrl);
  }
};

const sendEmail = async (email, subject, message, imageUrl, linkUrl) => {
  // Implement single email sending logic here
  // Example using nodemailer:
  // Configure your nodemailer transporter outside of this file and import it here
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: `<p>${message}</p>`,
  };

  await transporter.sendMail(mailOptions);
  
  console.log(`Email sent to: ${email}`);
};

export { router as default }; 