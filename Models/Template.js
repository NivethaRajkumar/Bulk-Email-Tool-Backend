import mongoose from 'mongoose';

const templateSchema = new mongoose.Schema({
  subject: { type: String, required: true },
  content: { type: String, required: true },
});

const Template = mongoose.model('Template', templateSchema);

export default Template; 

