import express from 'express';
import { saveTemplate } from '../Controllers/templateController.js';
import Template from '../Models/Template.js'; 

const router = express.Router();

router.post('/templates', saveTemplate);

export default router;