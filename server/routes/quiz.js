const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { generateQuizQuestion } = require('../services/quizService');

// Generate one quiz question for selected topics
router.post('/generate', authenticate, async (req, res) => {
  try {
    const { selectedTopics } = req.body;
    const quiz = await generateQuizQuestion(selectedTopics || []);
    res.json({ quiz });
  } catch (err) {
    console.error('Quiz generation failed:', err.message);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

// Download quiz as PDF
router.post('/download-pdf', authenticate, async (req, res) => {
  try {
    const { moduleTitle, topicTitles, quizzes, score, totalAttempts } = req.body;

    if (!quizzes || !Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ error: 'No quizzes provided' });
    }

    const doc = new PDFDocument({ margin: 40, bufferPages: true });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `quiz-${moduleTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe to response
    doc.pipe(res);

    // ===== TITLE PAGE =====
    doc.fontSize(24).font('Helvetica-Bold').text('Quiz Assessment', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(16).font('Helvetica').text(moduleTitle, { align: 'center' });
    doc.fontSize(10).text(`Generated: ${new Date().toLocaleDateString()}`, {
      align: 'center',
      underline: true
    });
    doc.fontSize(10).text(`Topics: ${topicTitles.join(', ')}`, { align: 'center' });
    doc.moveDown(1);

    // ===== QUESTIONS SECTION =====
    quizzes.forEach((item, index) => {
      // Add new page for each question (or after several questions)
      if (index > 0 && index % 2 === 0) {
        doc.addPage();
      }

      doc.fontSize(12).font('Helvetica-Bold').text(`Question ${index + 1}`, { underline: true });
      doc.moveDown(0.3);

      doc.fontSize(11).font('Helvetica').text(item.quiz.question);
      doc.moveDown(0.5);

      // Answer options
      const options = ['A', 'B', 'C', 'D'];
      options.forEach((opt) => {
        const optionText = `${opt}. ${item.quiz.choices[opt]}`;
        doc.fontSize(10).text(optionText);
      });

      doc.moveDown(0.5);

      // Show user's answer if answered
      if (item.selectedChoice) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('green');
        doc.text(`✓ Your Answer: ${item.selectedChoice} (${item.selectedChoice === item.quiz.answer ? 'Correct' : 'Incorrect'})`);
        doc.fillColor('black').font('Helvetica');
      } else {
        doc.fontSize(9).fillColor('#999999').font('Helvetica');
        doc.text('(Not answered)');
        doc.fillColor('black');
      }

      // Always show correct answer and explanation
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(`Correct Answer: ${item.quiz.answer}`);
      doc.fontSize(9).font('Helvetica');
      doc.text(`Explanation: ${item.quiz.explanation}`);

      doc.moveDown(1);
    });

    // ===== FOOTER =====
    doc.addPage();
    doc.fontSize(12).font('Helvetica-Bold').text('Assessment Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Module: ${moduleTitle}`);
    doc.text(`Topics: ${topicTitles.join(', ')}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica-Bold').text(`Total Score: ${score}/${totalAttempts}`);
    const percentage = totalAttempts > 0 ? ((score / totalAttempts) * 100).toFixed(1) : 0;
    doc.fontSize(10).font('Helvetica').text(`Percentage: ${percentage}%`);

    doc.end();
  } catch (err) {
    console.error('Error generating quiz PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
    }
  }
});

module.exports = router;
