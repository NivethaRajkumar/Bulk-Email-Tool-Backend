// routes/authRoutes.js
import express from 'express';
import { signin, signup } from '../Controllers/authController.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);

export default router;