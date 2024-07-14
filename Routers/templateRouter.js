import express from 'express';
import { saveTemplate } from '../controllers/templateController.js';
import Template from '../Models/Template.js'; 

const router = express.Router();

router.post('/templates', saveTemplate);

export default router;