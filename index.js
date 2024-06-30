import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import xlsx from 'xlsx';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './Database/config.js';
import authRouter from './Routers/authRouter.js';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cors());

// Set up Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// Connect to MongoDB
connectDB();

app.use('/api/auth', authRouter); 

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD, 
  },
});

const sendEmail = async (email, subject, htmlContent) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${email} - Message ID: ${info.messageId}`);
  } catch (error) {
    console.error(`Error sending email to: ${email} - Error: ${error.message}`);
    throw new Error(`Failed to send email to ${email}`);
  }
};

const sendBulkEmails = async (emailData) => {
  for (const data of emailData) {
    if (data.Email) {
      try {
        const htmlContent = `
          <p>Hi, this is a bulk email.</p>
          <p>Here is an image:</p>
          <img src="https://media-ik.croma.com/prod/https://media.croma.com/image/upload/v1708677095/Croma%20Assets/Communication/Mobiles/Images/300749_0_hyore5.png" alt="Image" style="width:300px;">
          <p>And here is a link: <a href="https://example.com">Click here</a></p>
        `;

        await sendEmail(data.Email, 'Bulk Email Subject', htmlContent);
      } catch (error) {
        console.error(`Failed to send email to ${data.Email}: ${error.message}`);
      }
    }
  }
};

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const workbook = xlsx.readFile(req.file.path);
    const sheet_name_list = workbook.SheetNames;
    const jsonData = xlsx.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]]);

    // Send bulk emails based on the extracted data
    await sendBulkEmails(jsonData);

    res.status(200).json({ message: 'File uploaded and emails sent successfully' });
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    res.status(500).send(`Error processing file: ${error.message}`);
  }
});

app.post('/send-email', async (req, res) => {
  const { email, subject, message, imageUrl, linkUrl } = req.body;

  const htmlContent = `
    <p>${message}</p>
    <p>Here is an image:</p>
    <img src="${imageUrl}" alt="Image" style="width:300px;">
    <p>And here is a link: <a href="${linkUrl}">Click here</a></p>
  `;

  try {
    await sendEmail(email, subject, htmlContent);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error(`Error sending email: ${error.message}`);
    res.status(500).send(`Error sending email: ${error.message}`);
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});
