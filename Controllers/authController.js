// controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../Models/User.js';
import dotenv from 'dotenv';

dotenv.config();

export const signup = async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Please fill all the fields' });
  }

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

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ token, message: 'Signup successful' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
};

export const signin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Please fill all the fields' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({ message: 'User does not exist' });
    }

    const isPasswordValid = await bcrypt.compare(password, existingUser.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: existingUser._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token, message: 'Signin successful' });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Signin failed', error: error.message });
  }
};