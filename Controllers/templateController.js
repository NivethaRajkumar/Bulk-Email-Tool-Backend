import Template from '../Models/Template.js';

export const saveTemplate = async (req, res) => {
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
};
