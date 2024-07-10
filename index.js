// Import necessary modules and configurations
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import multer from 'multer';
import nodemailer from 'nodemailer';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import connectDB from './Database/config.js'; // Adjust path as necessary
import Template from './models/Template.js'; // Assuming you have a Template model defined

dotenv.config();

// Initialize Express app
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware setup
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer configuration for file uploads
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
connectDB(); // Ensure this function connects to your MongoDB instance

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASSWORD,
  },
});

// Function to send email
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
    return info;
  } catch (error) {
    console.error(`Error sending email to: ${email} - Error: ${error.message}`);
    throw new Error(`Failed to send email to ${email}`);
  }
};

// Endpoint to save email template
app.post('/api/templates', async (req, res) => {
  const { subject, content } = req.body;

  try {
    // Create a new Template object
    const newTemplate = new Template({
      subject,
      content,
    });

    // Save the template to the database
    await newTemplate.save();

    // Send a success response
    res.status(201).json({ message: 'Template saved successfully' });
  } catch (error) {
    // Handle errors if template saving fails
    console.error('Error saving template:', error);
    res.status(500).json({ message: 'Failed to save template' });
  }
});

// Endpoint to send email with optional attachment and links/images
app.post('/send-email', upload.single('file'), async (req, res) => {
  const { email, subject, message, imageUrl, linkUrl } = req.body;

  let htmlContent = `<p>${message}</p>`;

  // Include file link if uploaded
  if (req.file) {
    const fileUrl = `http://localhost:8000/uploads/${req.file.filename}`;
    htmlContent += `<p>Here is an uploaded file: <a href="${fileUrl}">${req.file.originalname}</a></p>`;
  }

  // Include image if provided
  htmlContent += `
    ${imageUrl ? `<p>Here is an image from URL:</p><img src="${imageUrl}" alt="Image" style="max-width: 100%;"/>` : ''}
    ${linkUrl ? `<p>Here is a link: <a href="${linkUrl}">${linkUrl}</a></p>` : ''}
  `;

  try {
    // Send email using defined function
    await sendEmail(email, subject, htmlContent);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    // Handle email sending errors
    res.status(500).json({ message: `Error sending email: ${error.message}` });
  }
});

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  res.status(200).json({ message: 'File uploaded successfully', file: req.file });
});

// Define port for the server to listen on
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`App is listening on port ${PORT}`);
});