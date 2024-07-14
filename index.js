import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './Database/config.js';
import Template from './Models/Template.js';
import User from './Models/User.js';
import emailRouter from './Routers/emailRouter.js';
import templateRouter from './Routers/templateRouter.js'; 
import fs from 'fs';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());
app.use(cors({
  origin: ['http://localhost:3000', 'https://massmessagetransmitter.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api', emailRouter);
app.use('/api', templateRouter); 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

connectDB();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

const sendEmail = async (email, subject, htmlContent, attachmentPath) => {
  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: subject,
    html: htmlContent,
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
  const { email, subject, message, imageUrl, linkUrl, sendType } = req.body;

  let htmlContent = `<p>${message}</p>`;

  if (req.file) {
    const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
    htmlContent += `<p>Here is an uploaded file: <a href="${fileUrl}">${req.file.originalname}</a></p>`;
  }

  htmlContent += `
    ${imageUrl ? `<p>Here is an image from URL:</p><img src="${imageUrl}" alt="Image" style="max-width: 100%;"/>` : ''}
    ${linkUrl ? `<p>Here is a link: <a href="${linkUrl}">${linkUrl}</a></p>` : ''}
  `;

  if (sendType === 'individual') {
    try {
      await sendEmail(email, subject, htmlContent, req.file ? req.file.path : null);
      res.status(200).json({ message: 'Email sent successfully' });
    } catch (error) {
      res.status(500).json({ message: `Error sending email: ${error.message}` });
    }
  } else if (sendType === 'bulk') {
    try {
      const filePath = path.join(__dirname, req.file.path);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const emailIds = fileContent.split(/\r?\n/).filter(email => email);

      for (const emailId of emailIds) {
        await sendEmail(emailId, subject, htmlContent, req.file ? req.file.path : null);
      }

      res.status(200).json({ message: 'Bulk email sent successfully' });
    } catch (error) {
      res.status(500).json({ message: `Error sending bulk email: ${error.message}` });
    }
  }
});

app.post('/api/auth/signup', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: 'User signed up successfully' });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'User signed in successfully', token });
  } catch (error) {
    console.error('Error during signin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/templates', async (req, res) => {
  const { subject, content } = req.body;

  try {
    const newTemplate = new Template({
      subject,
      content,
    });

    await newTemplate.save();

    res.status(201).json({ message: 'Template saved successfully' });
  } catch (error) {
    console.error('Error saving template:', error);
    res.status(500).json({ message: 'Failed to save template' });
  }
});

app.post('/upload', upload.single('file'), (req, res) => {
  const filePath = path.join(__dirname, req.file.path);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const emailIds = fileContent.split(/\r?\n/).filter(email => email);

  res.json({ emailIds });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});