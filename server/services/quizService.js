const axios = require('axios');

// Generate one MCQ question using DeepSeek
async function generateQuizQuestion(selectedTopics = []) {
  try {
    // Build context from selected topic names
    let topicContext = '';
    if (selectedTopics && selectedTopics.length > 0) {
      topicContext = `Topics: ${selectedTopics.join(', ')}`;
    } else {
      topicContext = 'General Artificial Intelligence and Machine Learning';
    }

    // Call DeepSeek to generate quiz question based on topic context
    const deepseekPrompt = `Generate ONE unique multiple choice question about: ${topicContext}

Use your general knowledge to create a challenging and relevant question.
ALWAYS PUT THE CORRECT ANSWER AS OPTION A.
Make sure all 4 options are plausible but distinct.

Format your response EXACTLY as JSON (no markdown, no code blocks):
{
  "question": "Your question here?",
  "choices": {
    "A": "Correct answer - this is always the right one",
    "B": "Incorrect option",
    "C": "Incorrect option",
    "D": "Incorrect option"
  },
  "answer": "A",
  "explanation": "Why this answer is correct."
}`;

    const response = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: deepseekPrompt }],
        temperature: 1.2,
        top_p: 0.95,
        max_tokens: 600,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.choices[0].message.content.trim();
    
    // Parse JSON response (handle potential markdown wrapping)
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }

    const quiz = JSON.parse(jsonStr);
    return quiz;
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    throw new Error('Failed to generate quiz question');
  }
}

module.exports = {
  generateQuizQuestion,
};
