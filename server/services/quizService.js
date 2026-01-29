const axios = require('axios');

// Generate quiz question using DeepSeek (supports multiple question types)
async function generateQuizQuestion(selectedTopics = [], questionType = 'MC') {
  try {
    // Build context from selected topic names
    let topicContext = '';
    if (selectedTopics && selectedTopics.length > 0) {
      topicContext = `Topics: ${selectedTopics.join(', ')}`;
    } else {
      topicContext = 'General Artificial Intelligence and Machine Learning';
    }

    let deepseekPrompt = '';
    
    // Generate different prompts based on question type
    switch (questionType) {
      case 'MC': // Multiple Choice
        deepseekPrompt = `Generate ONE unique multiple choice question about: ${topicContext}

Use your general knowledge to create a challenging and relevant question.
ALWAYS PUT THE CORRECT ANSWER AS OPTION A.
Make sure all 4 options are plausible but distinct.

Format your response EXACTLY as JSON (no markdown, no code blocks):
{
  "type": "MC",
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
        break;

      case 'TF': // True/False
        deepseekPrompt = `Generate ONE unique true/false question about: ${topicContext}

Use your general knowledge to create a challenging and relevant question.
The statement should be either clearly true or clearly false.

Format your response EXACTLY as JSON (no markdown, no code blocks):
{
  "type": "TF",
  "question": "Your statement here.",
  "answer": "TRUE",
  "explanation": "Why this statement is true/false."
}`;
        break;

      case 'SA': // Short Answer
        deepseekPrompt = `Generate ONE unique short answer question about: ${topicContext}

Use your general knowledge to create a question that can be answered in 1-3 words or a short phrase.
Provide the exact answer and up to 2 alternative acceptable answers.

Format your response EXACTLY as JSON (no markdown, no code blocks):
{
  "type": "SA",
  "question": "Your question here?",
  "answers": [
    "Primary correct answer",
    "Alternative answer 1",
    "Alternative answer 2"
  ],
  "explanation": "Why this answer is correct."
}`;
        break;

      case 'MS': // Multi-Select
        deepseekPrompt = `Generate ONE unique multi-select question about: ${topicContext}

Use your general knowledge to create a challenging question with multiple correct answers.
ALWAYS MARK CORRECT ANSWERS AS OPTIONS A AND B (and optionally C).
Make sure all options are plausible but distinct.
There should be 2-3 correct answers out of 4-5 total options.

Format your response EXACTLY as JSON (no markdown, no code blocks):
{
  "type": "MS",
  "question": "Select all that apply:",
  "choices": {
    "A": "Correct option 1",
    "B": "Correct option 2",
    "C": "Incorrect option 1",
    "D": "Incorrect option 2"
  },
  "answers": ["A", "B"],
  "explanation": "Why these answers are correct."
}`;
        break;

      default:
        throw new Error(`Unsupported question type: ${questionType}`);
    }

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
