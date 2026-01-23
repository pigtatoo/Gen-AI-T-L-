const cron = require('node-cron');
const PDFDocument = require('pdfkit');
const UserNewsletterSubscription = require('../models/UserNewsletterSubscription');
const Modules = require('../models/Modules');
const Topics = require('../models/Topics');
const { sendNewsletterEmail } = require('../services/emailService');
const { generateAIContent, getLatestArticles, filterArticlesByModuleAndTopics, renderMarkdownToPDF } = require('../controllers/newsletterController');

let newsletterScheduledTask = null;

/**
 * Generate PDF buffer for newsletter
 * @param {Object} params - Newsletter parameters
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDFBuffer(params) {
  return new Promise((resolve, reject) => {
    const { articles, moduleTitle, selectedTopics, aiContent, region } = params;

    const doc = new PDFDocument({ margin: 40, bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

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
      doc.fontSize(10).fillColor('#999999').text('(Case study could not be generated)', {
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
      doc.fontSize(10).fillColor('#999999').text('(Definitions could not be generated)', {
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
      doc.fontSize(10).fillColor('#999999').text('(Q&A could not be generated)', {
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

    doc.end();
  });
}

/**
 * Process and send newsletters for all active subscriptions
 */
async function sendAllNewsletters() {
  try {
    console.log('\n📬 [Newsletter Job] Starting scheduled newsletter delivery...');
    console.log(`⏰ [Newsletter Job] Execution time: ${new Date().toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} (Singapore Time)`);

    // Get all active subscriptions
    const subscriptions = await UserNewsletterSubscription.findAll({
      where: { is_active: true },
      include: [
        { model: Modules, attributes: ['module_id', 'title', 'description'] }
      ]
    });

    console.log(`📊 [Newsletter Job] Found ${subscriptions.length} active subscriptions`);

    if (subscriptions.length === 0) {
      console.log('ℹ️  [Newsletter Job] No active subscriptions to process');
      return;
    }

    // Get latest articles
    const allArticles = getLatestArticles();
    console.log(`📰 [Newsletter Job] Loaded ${allArticles.length} article collections`);

    let successCount = 0;
    let failureCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        console.log(`\n📧 [Newsletter Job] Processing: ${subscription.email} - Module: ${subscription.Module.title}`);

        const moduleId = subscription.module_id;
        const topicIds = subscription.topic_ids;
        const moduleTitle = subscription.Module.title;
        const email = subscription.email;

        // Get topic titles
        const topics = await Topics.findAll({
          where: { topic_id: topicIds }
        });
        const topicTitles = topics.map(t => t.title);

        console.log(`  Topics: ${topicTitles.join(', ')}`);

        // Filter articles for this subscription
        const filteredArticles = filterArticlesByModuleAndTopics(allArticles, moduleId, topicIds);
        console.log(`  Articles found: ${filteredArticles.length}`);

        // Generate AI content
        console.log(`  Generating AI content...`);
        const [caseStudy, qa, definitions] = await Promise.all([
          generateAIContent(topicTitles, moduleTitle, 'case-study', null, filteredArticles),
          generateAIContent(topicTitles, moduleTitle, 'qa'),
          generateAIContent(topicTitles, moduleTitle, 'definitions')
        ]);

        const aiContent = {
          caseStudy: caseStudy || 'Unable to generate case study at this time.',
          qa: qa || 'Unable to generate Q&A at this time.',
          definitions: definitions || 'Unable to generate definitions at this time.'
        };

        // Generate PDF buffer
        console.log(`  Generating PDF...`);
        const pdfBuffer = await generatePDFBuffer({
          articles: filteredArticles,
          moduleTitle: moduleTitle,
          selectedTopics: topicTitles,
          aiContent: aiContent
        });

        // Send email
        console.log(`  Sending email...`);
        await sendNewsletterEmail({
          to: email,
          moduleTitle: moduleTitle,
          topics: topicTitles,
          pdfBuffer: pdfBuffer,
          moduleId: moduleId
        });

        // Update last_sent timestamp
        subscription.last_sent = new Date();
        await subscription.save();

        console.log(`✓ [Newsletter Job] Successfully sent to ${email}`);
        successCount++;
      } catch (err) {
        console.error(`✗ [Newsletter Job] Failed for ${subscription.email}:`, err.message);
        failureCount++;
      }
    }

    console.log(`\n📬 [Newsletter Job] Complete!`);
    console.log(`✓ Sent: ${successCount} | ✗ Failed: ${failureCount}`);
  } catch (err) {
    console.error('✗ [Newsletter Job] Fatal error:', err);
  }
}

/**
 * Initialize newsletter scheduler
 * Runs every Monday at 7 AM Singapore Time
 */
function initNewsletterScheduler() {
  if (!process.env.NEWSLETTER_ENABLED || process.env.NEWSLETTER_ENABLED !== 'true') {
    console.log('ℹ️  Newsletter scheduler is disabled (set NEWSLETTER_ENABLED=true to enable)');
    return;
  }

  // Cron: 0 7 * * 1 = Every Monday at 7:00 AM
  // Note: Cron times are in server timezone; consider running in UTC and adjusting
  const schedule = '0 7 * * 1';
  console.log(`📬 Scheduling newsletter job with cron: "${schedule}" (Every Monday at 7:00 AM)`);

  newsletterScheduledTask = cron.schedule(schedule, async () => {
    console.log('\n🔔 Newsletter scheduled time reached');
    await sendAllNewsletters();
  });

  console.log('✓ Newsletter scheduler initialized');
}

/**
 * Stop newsletter scheduler
 */
function stopNewsletterScheduler() {
  if (newsletterScheduledTask) {
    newsletterScheduledTask.stop();
    console.log('✓ Newsletter scheduler stopped');
  }
}

/**
 * Manually trigger newsletter job (for testing)
 */
async function triggerNewsletterJob() {
  console.log('🔨 Manual trigger: Running newsletter job...');
  await sendAllNewsletters();
}

module.exports = {
  initNewsletterScheduler,
  stopNewsletterScheduler,
  triggerNewsletterJob,
  sendAllNewsletters
};
