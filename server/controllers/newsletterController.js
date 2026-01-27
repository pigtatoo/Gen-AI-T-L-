const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const { marked } = require('marked');
const nodemailer = require('nodemailer');
const supabase = require('../config/supabase');

/**
 * Render markdown text to PDF with formatting
 * Supports bold (**text**), italic (*text*), lists (- item), headers (# text)
 */
function renderMarkdownToPDF(doc, markdownText, options = {}) {
  const { width = 500, fontSize = 10, lineGap = 4 } = options;

  if (!markdownText || typeof markdownText !== 'string') {
    return;
  }

  // Simple markdown parsing
  const lines = markdownText.split('\n').filter(line => line.trim());

  lines.forEach((line) => {
    let trimmed = line.trim();

    // Skip empty lines
    if (!trimmed) {
      doc.moveDown(0.3);
      return;
    }

    // Headers: # text, ## text, etc.
    if (trimmed.startsWith('# ')) {
      trimmed = trimmed.replace(/^#+\s*/, '').replace(/\*\*|\*|__?/g, '');
      doc.fontSize(14).font('Helvetica-Bold').text(trimmed, { width });
      doc.moveDown(0.2);
      return;
    }

    if (trimmed.startsWith('## ')) {
      trimmed = trimmed.replace(/^#+\s*/, '').replace(/\*\*|\*|__?/g, '');
      doc.fontSize(12).font('Helvetica-Bold').text(trimmed, { width });
      doc.moveDown(0.2);
      return;
    }

    if (trimmed.startsWith('### ')) {
      trimmed = trimmed.replace(/^#+\s*/, '').replace(/\*\*|\*|__?/g, '');
      doc.fontSize(11).font('Helvetica-Bold').text(trimmed, { width });
      doc.moveDown(0.2);
      return;
    }

    // Bullet lists: - item or * item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      trimmed = trimmed.replace(/^[-*]\s*/, '').replace(/\*\*|\*|__?/g, '');
      doc.fontSize(fontSize).font('Helvetica').text('• ' + trimmed, { width });
      doc.moveDown(0.1);
      return;
    }

    // Numbered lists: 1. item, 2. item, etc.
    if (/^\d+\.\s/.test(trimmed)) {
      trimmed = trimmed.replace(/\*\*|\*|__?/g, '');
      doc.fontSize(fontSize).font('Helvetica').text(trimmed, { width });
      doc.moveDown(0.1);
      return;
    }

    // Remove markdown formatting markers (**bold**, *italic*, __underline__)
    trimmed = trimmed.replace(/\*\*([^*]+)\*\*/g, '$1');  // Remove **bold**
    trimmed = trimmed.replace(/\*([^*]+)\*/g, '$1');       // Remove *italic*
    trimmed = trimmed.replace(/__([^_]+)__/g, '$1');       // Remove __underline__
    trimmed = trimmed.replace(/_([^_]+)_/g, '$1');         // Remove _underscore_

    // Regular paragraph text
    doc.fontSize(fontSize).font('Helvetica').fillColor('black').text(trimmed, { width });
    doc.moveDown(0.1);
  });
}

/**
 * Generate content using AI (DeepSeek/OpenRouter)
 */
async function generateAIContent(topics, moduleTitle, contentType, region = null, articles = null) {
  try {
    const topicsList = Array.isArray(topics) ? topics.join(', ') : topics;
    
    let prompt = '';
    if (contentType === 'case-study') {
      // If region is specified, generate region-specific case study
      // If not, generate case study based on featured articles
      let regionContext = '';
      if (region) {
        regionContext = ` specifically in the context of ${region}`;
      } else if (articles && articles.length > 0) {
        // Use featured articles as context for case study generation
        const articlesToUse = articles.slice(0, 3);
        const articlesContext = articlesToUse
          .map((a) => `- "${a.title}" (${a.source}, ${a.confidence ? Math.round(a.confidence * 100) + '%' : 'N/A'})`)
          .join('\n');
        regionContext = `. Use these featured articles as reference:\n${articlesContext}`;
      }
      
      prompt = `Create a detailed real-world case study for the following topics: ${topicsList} in the context of the module: ${moduleTitle}${regionContext}. 

Use this markdown format:
# Case Study Title

## Background
[Background information]

## Problem Statement
[Problem details]

## Solution
[Solution details]

## Outcome & Lessons
[Outcome and key takeaways]

Keep it under 500 words. Use markdown formatting with headers and paragraphs.`;
    } else if (contentType === 'qa') {
      prompt = `Generate 5 important Q&A pairs for the topics: ${topicsList} in the module: ${moduleTitle}. 

Use this markdown format:
## Question 1
[Your detailed answer here]

## Question 2
[Your detailed answer here]

Keep answers concise (2-3 sentences each). Use markdown formatting with ## for questions.`;
    } else if (contentType === 'definitions') {
      prompt = `List 10 key concepts and definitions related to: ${topicsList} in ${moduleTitle}. 

Use this markdown format:
## Concept 1
[Definition - 1-2 sentences]

## Concept 2
[Definition - 1-2 sentences]

Keep definitions concise (1-2 sentences). Use markdown formatting with ## for each concept.`;
    }

    console.log(`\n[AI-${contentType.toUpperCase()}] Starting generation...`);
    const apiKeyPresent = !!process.env.DEEPSEEK_KEY;
    console.log(`[AI-${contentType.toUpperCase()}] DeepSeek API Key present: ${apiKeyPresent}`);
    console.log(`[AI-${contentType.toUpperCase()}] Model: deepseek-chat`);

    if (!process.env.DEEPSEEK_KEY) {
      console.warn(`⚠️  [AI-${contentType.toUpperCase()}] DEEPSEEK_KEY not set - skipping`);
      return null;
    }

    console.log(`[AI-${contentType.toUpperCase()}] Sending request to DeepSeek API...`);
    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`[AI-${contentType.toUpperCase()}] Response status: ${response.status}`);
    console.log(`[AI-${contentType.toUpperCase()}] Response data structure:`, {
      hasChoices: !!response.data.choices,
      choicesLength: response.data.choices?.length,
      hasMessage: !!response.data.choices?.[0]?.message,
      hasContent: !!response.data.choices?.[0]?.message?.content
    });

    if (!response.data.choices || !response.data.choices[0] || !response.data.choices[0].message) {
      console.error(`[AI-${contentType.toUpperCase()}] Invalid response structure:`, JSON.stringify(response.data));
      return null;
    }

    const content = response.data.choices[0].message.content;
    console.log(`✓ [AI-${contentType.toUpperCase()}] Generated successfully (${content.length} chars)`);
    return content;
  } catch (err) {
    console.error(`✗ [AI-${contentType.toUpperCase()}] Error:`);
    console.error(`  Message: ${err.message}`);
    console.error(`  Status: ${err.response?.status || 'N/A'}`);
    console.error(`  Status Text: ${err.response?.statusText || 'N/A'}`);
    console.error(`  Error Data:`, JSON.stringify(err.response?.data, null, 2) || 'N/A');
    console.error(`  Full error:`, err);
    return null;
  }
}

/**
 * Get latest mapped articles from temp folder
 * @returns {Array} Array of mapped articles by topic/module
 */
function getLatestArticles() {
  try {
    const tempDir = process.env.ARTICLE_OUTPUT_DIR || './temp';

    if (!fs.existsSync(tempDir)) {
      return [];
    }

    const files = fs.readdirSync(tempDir).filter((f) => f.startsWith('articles_mapped_'));
    if (files.length === 0) {
      return [];
    }

    files.sort().reverse();
    const latestFile = files[0];
    const filePath = path.join(tempDir, latestFile);

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return data;
  } catch (err) {
    console.error('Error reading articles:', err);
    return [];
  }
}

/**
 * Filter articles by module and selected topics (NOT by region)
 * Shows all relevant articles regardless of source country
 * @param {Array} allArticles - All articles from temp files
 * @param {number} moduleId - Module ID to filter by
 * @param {Array} topicIds - Selected topic IDs
 * @returns {Array} Filtered articles
 */
function filterArticlesByModuleAndTopics(allArticles, moduleId, topicIds) {
  const filtered = [];

  allArticles.forEach((module) => {
    // Match by module ID
    if (module.moduleId !== moduleId) {
      return;
    }

    module.topics?.forEach((topic) => {
      // Match by selected topic IDs
      if (!topicIds.includes(topic.topicId)) {
        return;
      }

      topic.articles?.forEach((article) => {
        // Include all articles regardless of region/country
        filtered.push({
          title: article.title,
          url: article.url,
          summary: article.summary,
          source: article.source,
          published: article.published,
          confidence: article.confidence,
          topic: topic.topicTitle,
          module: module.moduleTitle,
          country: article.country || article.region || 'Global'
        });
      });
    });
  });

  return filtered.sort((a, b) => new Date(b.published) - new Date(a.published));
}

/**
 * Generate PDF newsletter with articles, case study, Q&A, and definitions
 * @param {Object} res - Express response object
 * @param {Array} articles - Articles to include in PDF
 * @param {string} moduleTitle - Module title for the newsletter
 * @param {Array} selectedTopics - Selected topic titles
 * @param {Object} aiContent - AI-generated content { caseStudy, qa, definitions }
 * @param {string} region - Country/Region for newsletter
 */
function generatePDF(res, articles, moduleTitle, selectedTopics, aiContent = {}, region = 'Singapore') {
  try {
    console.log(`Generating comprehensive PDF with ${articles.length} articles + AI content`);
    
    const doc = new PDFDocument({ margin: 40, bufferPages: true });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    const filename = `newsletter-${moduleTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    console.log(`PDF filename: ${filename}`);

    // Pipe to response
    doc.pipe(res);

    // ===== TITLE PAGE =====
    doc.fontSize(28).font('Helvetica-Bold').text('Module Newsletter', { align: 'center', width: 500 });
    doc.fontSize(18).font('Helvetica').text(moduleTitle, { align: 'center', width: 500 });
    doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, {
      align: 'center',
      underline: true,
      width: 500
    });
    doc.fontSize(10).text(`Topics: ${selectedTopics.join(', ')}`, { align: 'center', width: 500 });
    doc.moveDown(3);

    // Table of Contents
    doc.fontSize(12).font('Helvetica-Bold').text('Contents:', { width: 500 });
    doc.fontSize(10).font('Helvetica');
    doc.text('1. Featured Articles (if available)', { width: 500 });
    doc.text('2. Case Study', { width: 500 });
    doc.text('3. Key Concepts & Definitions', { width: 500 });
    doc.text('4. Q&A Section', { width: 500 });
    doc.moveDown(2);

    // ===== SECTION 1: ARTICLES =====
    if (articles.length > 0) {
      doc.addPage();
      doc.fontSize(16).font('Helvetica-Bold').text('Featured Articles', { underline: true });
      doc.fontSize(10).text(`${articles.length} relevant articles`, { 
        color: '#666666',
        width: 500 
      });
      doc.moveDown(1);

      articles.forEach((article, index) => {
        try {
          doc.fontSize(12).font('Helvetica-Bold').text(`${index + 1}. ${article.title || 'Untitled'}`, {
            align: 'left',
            width: 500
          });

          doc.fontSize(9).font('Helvetica').fillColor('#666666');
          doc.text(`Source: ${article.source || 'Unknown'}`, { width: 500 });
          doc.text(`Published: ${new Date(article.published).toLocaleDateString()}`, { width: 500 });
          if (article.confidence) {
            doc.text(`Confidence: ${(article.confidence * 100).toFixed(0)}%`, { width: 500 });
          }
          doc.fillColor('blue').text(`Link: ${article.url || '#'}`, { width: 500 });

          doc.moveDown(0.3);
          doc.fontSize(9).font('Helvetica').fillColor('black');
          
          const cleanSummary = (article.summary || '')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

          doc.text(cleanSummary, { align: 'left', width: 500 });
          doc.moveDown(1);

          if (index < articles.length - 1 && doc.y > 700) {
            doc.addPage();
          }
        } catch (articleErr) {
          console.error(`Error processing article ${index}:`, articleErr.message);
        }
      });
    } else {
      doc.fontSize(10).fillColor('#999999').text('(No articles found for this date range)', { width: 500 });
      doc.moveDown(1);
    }

    // ===== SECTION 2: CASE STUDY =====
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Case Study', { underline: true });
    doc.moveDown(0.5);

    if (aiContent.caseStudy) {
      doc.fontSize(10).font('Helvetica').fillColor('black');
      renderMarkdownToPDF(doc, aiContent.caseStudy, { width: 500, fontSize: 10 });
    } else {
      doc.fontSize(10).fillColor('#999999').text('(Case study could not be generated. Check DEEPSEEK_KEY in .env)', {
        width: 500
      });
    }

    // ===== SECTION 3: KEY CONCEPTS & DEFINITIONS =====
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Key Concepts & Definitions', { underline: true });
    doc.moveDown(0.5);

    if (aiContent.definitions) {
      doc.fontSize(10).font('Helvetica').fillColor('black');
      renderMarkdownToPDF(doc, aiContent.definitions, { width: 500, fontSize: 10 });
    } else {
      doc.fontSize(10).fillColor('#999999').text('(Definitions could not be generated. Check DEEPSEEK_KEY in .env)', {
        width: 500
      });
    }

    // ===== SECTION 4: Q&A =====
    doc.addPage();
    doc.fontSize(16).font('Helvetica-Bold').text('Questions & Answers', { underline: true });
    doc.moveDown(0.5);

    if (aiContent.qa) {
      doc.fontSize(10).font('Helvetica').fillColor('black');
      renderMarkdownToPDF(doc, aiContent.qa, { width: 500, fontSize: 10 });
    } else {
      doc.fontSize(10).fillColor('#999999').text('(Q&A could not be generated. Check DEEPSEEK_KEY in .env)', {
        width: 500
      });
    }

    // ===== FOOTER =====
    doc.addPage();
    doc.fontSize(8).fillColor('#999999');
    doc.text('---', { align: 'center' });
    doc.text('This comprehensive newsletter was auto-generated from your learning module', {
      align: 'center'
    });
    doc.text('combining relevant articles, AI-generated insights, and study materials', {
      align: 'center'
    });

    doc.on('end', () => {
      console.log("PDF generation complete");
    });

    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to generate PDF', details: err.message });
    }
  }
}

/**
 * POST /api/newsletters/generate
 * Generate and download newsletter as PDF for a module
 */
async function generateNewsletter(req, res) {
  try {
    console.log("Newsletter request received:", {
      moduleId: req.body.moduleId,
      moduleTitle: req.body.moduleTitle,
      topicIds: req.body.topicIds,
      topicTitles: req.body.topicTitles,
      daysBack: req.body.daysBack,
    });

    const { moduleId, moduleTitle, topicIds, topicTitles, region = 'Singapore' } = req.body;

    // Validate required fields
    if (!moduleId || !moduleTitle || !topicIds || !Array.isArray(topicIds) || topicIds.length === 0) {
      console.error("Missing required fields:", { moduleId, moduleTitle, topicIds });
      return res.status(400).json({ 
        error: 'Missing required fields: moduleId, moduleTitle, topicIds (array)' 
      });
    }

    // Get latest articles
    console.log("Getting latest articles from temp folder...");
    const allArticles = getLatestArticles();
    console.log(`Found ${allArticles.length} modules with articles`);
    
    // Filter articles by module and topics (NOT by region)
    // Featured articles show best relevant articles from all regions
    console.log(`Filtering articles for moduleId=${moduleId}, topicIds=${topicIds.join(",")}`);
    const filteredArticles = filterArticlesByModuleAndTopics(allArticles, moduleId, topicIds);
    console.log(`Filtered to ${filteredArticles.length} articles`);

    // Generate AI content in parallel (case study, Q&A, definitions)
    // Pass region to case study generation, or pass articles if no region selected
    console.log("Generating AI content (case study, Q&A, definitions)...");
    const [caseStudy, qa, definitions] = await Promise.all([
      generateAIContent(topicTitles, moduleTitle, 'case-study', region || null, filteredArticles),
      generateAIContent(topicTitles, moduleTitle, 'qa'),
      generateAIContent(topicTitles, moduleTitle, 'definitions')
    ]);

    const aiContent = {
      caseStudy: caseStudy || 'Unable to generate case study at this time.',
      qa: qa || 'Unable to generate Q&A at this time.',
      definitions: definitions || 'Unable to generate definitions at this time.'
    };

    console.log("AI content generation complete");

    // Generate PDF with articles (if any) and AI content
    console.log("Generating PDF with all sections...");
      generatePDF(res, filteredArticles, moduleTitle, topicTitles || [], aiContent, region);
  } catch (err) {
    console.error("Error in generateNewsletter:", err);
    res.status(500).json({ error: 'Failed to generate newsletter', details: err.message });
  }
}

  // Send newsletter for a subscription (generate PDF buffer and email it)
  async function sendSubscriptionNewsletter(subscriptionId, user) {
    try {
      const { data: subscription, error: subErr } = await supabase
        .from('user_newsletter_subscriptions')
        .select()
        .eq('id', subscriptionId)
        .single();

      if (subErr || !subscription) return { success: false, error: 'Subscription not found' };
      if (subscription.user_id !== user.id) return { success: false, error: 'Not authorized' };

      const moduleId = subscription.module_id;
      const topicIds = subscription.topic_ids || [];
      const toEmail = subscription.email;

      // Get module info
      let moduleTitle = `Module ${moduleId}`;
      try {
        const { data: modData, error: modErr } = await supabase.from('Modules').select('module_id,title,description').eq('module_id', moduleId).single();
        if (!modErr && modData) moduleTitle = modData.title || moduleTitle;
      } catch (e) {
        console.warn('Failed to fetch module title from Supabase', e.message || e);
      }

      const allArticles = getLatestArticles();
      const articles = filterArticlesByModuleAndTopics(allArticles, moduleId, topicIds);

      let aiContent = null;
      try { aiContent = await generateAIContent(topicIds, moduleTitle, 'case-study', null, articles); } catch (e) { console.warn('AI content generation failed', e); }

      const doc = new PDFDocument({ margin: 40, bufferPages: true });
      const chunks = [];
      doc.on('data', c => chunks.push(c));

      const endPromise = new Promise((resolve, reject) => {
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
      });

      doc.fontSize(20).font('Helvetica-Bold').text('Synthora Newsletter', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(16).font('Helvetica').text(moduleTitle, { align: 'center' });
      doc.moveDown();

      if (Array.isArray(topicIds) && topicIds.length) {
        doc.fontSize(12).font('Helvetica-Bold').text('Topics:');
        doc.fontSize(11).font('Helvetica').text(topicIds.join(', '));
        doc.moveDown();
      }

      if (aiContent) {
        doc.fontSize(12).font('Helvetica-Bold').text('AI Summary:');
        doc.moveDown(0.2);
        doc.fontSize(10).font('Helvetica').text(aiContent, { width: 500 });
        doc.moveDown();
      }

      if (articles && articles.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('Articles:');
        doc.moveDown(0.2);
        articles.forEach((a, idx) => {
          const title = a.title || a.headline || `Article ${idx + 1}`;
          const url = a.url || a.link || '';
          doc.fontSize(11).font('Helvetica-Bold').text(`${idx + 1}. ${title}`);
          if (url) doc.fontSize(10).font('Helvetica').fillColor('blue').text(url, { link: url });
          doc.fillColor('black');
          doc.moveDown(0.5);
        });
      } else {
        doc.fontSize(11).font('Helvetica').text('No recent articles available for these topics.');
      }

      doc.end();
      const pdfBuffer = await endPromise;

      const EMAIL_FROM = process.env.EMAIL_FROM;
      const PASS = process.env.PASS;
      if (!EMAIL_FROM || !PASS) return { success: false, error: 'Email not configured on server' };

      const primary = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 465, secure: true, auth: { user: EMAIL_FROM, pass: PASS }, tls: { rejectUnauthorized: false } });
      try {
        await primary.sendMail({ from: EMAIL_FROM, to: toEmail, subject: 'Synthora Newsletter', text: 'Please find the attached newsletter.', attachments: [{ filename: 'newsletter.pdf', content: pdfBuffer }] });
        return { success: true, info: { emailedTo: toEmail } };
      } catch (pErr) {
        console.error('Primary SMTP send failed:', pErr && pErr.code ? pErr.code : pErr.message || pErr);
        const fallback = nodemailer.createTransport({ host: 'smtp.gmail.com', port: 587, secure: false, requireTLS: true, auth: { user: EMAIL_FROM, pass: PASS }, tls: { rejectUnauthorized: false } });
        try {
          await fallback.sendMail({ from: EMAIL_FROM, to: toEmail, subject: 'Synthora Newsletter', text: 'Please find the attached newsletter.', attachments: [{ filename: 'newsletter.pdf', content: pdfBuffer }] });
          return { success: true, info: { emailedTo: toEmail, fallback: true } };
        } catch (fErr) {
          console.error('Fallback SMTP send failed:', fErr && fErr.code ? fErr.code : fErr.message || fErr);
          return { success: false, error: 'Failed to send email' };
        }
      }
    } catch (err) {
      console.error('sendSubscriptionNewsletter error:', err);
      return { success: false, error: err.message || 'Internal error' };
    }
  }

  module.exports = { 
    generateNewsletter,
    generateAIContent,
    getLatestArticles,
    filterArticlesByModuleAndTopics,
    renderMarkdownToPDF,
    sendSubscriptionNewsletter
  };
