import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './Database/config.js';
import multer from 'multer';
import nodemailer from 'nodemailer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import xlsx from 'xlsx';
import authRoutes from './Routers/authRouter.js'; 

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://massmessagetransmitter.netlify.app'],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

connectDB();

app.use('/api/auth', authRoutes);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads');
    }
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendEmail = async (email, subject, htmlContent, attachmentPath, imageUrl, linkUrl) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: `${htmlContent}<br><img src="${imageUrl}" /><br><a href="${linkUrl}">${linkUrl}</a>`,
    attachments: attachmentPath ? [{ path: attachmentPath }] : [],
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${email} - Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`Error sending email to: ${email} - Error: ${error.message}`);
    throw new Error(`Failed to send email to ${email}`);
  }
};

app.post('/send-email', upload.single('file'), async (req, res) => {
  console.log('Request received at /send-email');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);

  const { email, subject, message, imageUrl, linkUrl } = req.body;
  let htmlContent = `<p>${message}</p>`;

  try {
    if (req.file && req.file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      const workbook = xlsx.readFile(req.file.path);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const emailIds = xlsx.utils.sheet_to_json(worksheet, { header: 1 }).flat();

      for (const emailId of emailIds) {
        await sendEmail(emailId, subject, htmlContent, req.file.path, imageUrl, linkUrl);
        console.log(`Email sent to: ${emailId}`);
      }
      res.status(200).json({ message: 'Emails sent successfully' });
    } else {
      await sendEmail(email, subject, htmlContent, req.file ? req.file.path : null, imageUrl, linkUrl);
      res.status(200).json({ message: 'Email sent successfully' });
    }

    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
  } catch (error) {
    console.error('Error in /send-email route:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
});

const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});