"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import Link from "next/link";

interface QuizQuestion {
  id: number;
  question: string;
  type: "mcq" | "saq";
  options?: string[];
  correctAnswer?: number;
  userAnswer?: number | string | null;
}

const topicQuizBank: Record<string, QuizQuestion[]> = {
  "Machine Learning": [
    {
      id: 1,
      type: "mcq",
      question: "What is the primary goal of Machine Learning?",
      options: [
        "To make computers think exactly like humans",
        "To enable systems to learn from data and improve without explicit programming",
        "To replace all human decision-making",
        "To create artificial consciousness",
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "mcq",
      question: "Which of the following is a supervised learning algorithm?",
      options: ["K-Means Clustering", "Principal Component Analysis", "Linear Regression", "DBSCAN"],
      correctAnswer: 2,
    },
    {
      id: 3,
      type: "saq",
      question: "Explain the difference between supervised and unsupervised learning.",
      correctAnswer: 0,
    },
    {
      id: 4,
      type: "mcq",
      question: "What is overfitting in machine learning?",
      options: [
        "Model performs well on training data but poorly on test data",
        "Model performs poorly on both training and test data",
        "Model is too simple",
        "Model uses too few features",
      ],
      correctAnswer: 0,
    },
    {
      id: 5,
      type: "saq",
      question: "What is cross-validation and why is it important?",
      correctAnswer: 0,
    },
  ],
  "Deep Learning": [
    {
      id: 1,
      type: "mcq",
      question: "What is a neural network?",
      options: [
        "A computer network",
        "A computational model inspired by biological neurons",
        "A social network",
        "A database",
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "mcq",
      question: "What is the purpose of activation functions in neural networks?",
      options: [
        "To activate the computer",
        "To introduce non-linearity",
        "To store data",
        "To reduce memory usage",
      ],
      correctAnswer: 1,
    },
    {
      id: 3,
      type: "saq",
      question: "Explain the vanishing gradient problem in deep neural networks.",
      correctAnswer: 0,
    },
    {
      id: 4,
      type: "mcq",
      question: "What does CNN stand for?",
      options: [
        "Central Neural Network",
        "Convolutional Neural Network",
        "Connected Neural Network",
        "Computational Neural Network",
      ],
      correctAnswer: 1,
    },
  ],
  "Natural Language Processing": [
    {
      id: 1,
      type: "mcq",
      question: "What is tokenization in NLP?",
      options: [
        "Encrypting text",
        "Breaking text into smaller units like words or sentences",
        "Translating text",
        "Compressing text",
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "saq",
      question: "What is the purpose of word embeddings in NLP?",
      correctAnswer: 0,
    },
    {
      id: 3,
      type: "mcq",
      question: "What does BERT stand for?",
      options: [
        "Basic English Representation Transformer",
        "Bidirectional Encoder Representations from Transformers",
        "Binary Encoded Response Text",
        "Bayesian Enhanced Recognition Task",
      ],
      correctAnswer: 1,
    },
  ],
  "Computer Vision": [
    {
      id: 1,
      type: "mcq",
      question: "What is edge detection used for?",
      options: [
        "Detecting file boundaries",
        "Finding borders and outlines in images",
        "Compressing images",
        "Increasing image brightness",
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "saq",
      question: "Explain the concept of image segmentation.",
      correctAnswer: 0,
    },
  ],
  "Data Science": [
    {
      id: 1,
      type: "mcq",
      question: "What is data preprocessing?",
      options: [
        "Creating new data",
        "Preparing raw data for analysis",
        "Storing data",
        "Visualizing data",
      ],
      correctAnswer: 1,
    },
    {
      id: 2,
      type: "saq",
      question: "Describe the steps in a typical data science workflow.",
      correctAnswer: 0,
    },
  ],
  "Cloud Computing": [
    {
      id: 1,
      type: "mcq",
      question: "What are the main cloud service models?",
      options: [
        "IaaS, PaaS, SaaS",
        "HTTP, FTP, SMTP",
        "RAM, ROM, SSD",
        "LAN, WAN, MAN",
      ],
      correctAnswer: 0,
    },
    {
      id: 2,
      type: "saq",
      question: "What are the advantages of cloud computing?",
      correctAnswer: 0,
    },
  ],
};

export default function QuizPage() {
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [mcqCount, setMcqCount] = useState(1);
  const [saqCount, setSaqCount] = useState(1);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [saqAnswers, setSaqAnswers] = useState<Record<number, string>>({});

  const allTopics = Object.keys(topicQuizBank);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const generateQuiz = () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic!");
      return;
    }

    const generatedQuestions: QuizQuestion[] = [];
    const totalNeeded = mcqCount + saqCount;

    // Collect all questions from selected topics
    const availableQuestions = selectedTopics
      .flatMap((topic) => topicQuizBank[topic] || [])
      .map((q, idx) => ({ ...q, id: idx }));

    // Separate MCQ and SAQ
    const mcqQuestions = availableQuestions.filter((q) => q.type === "mcq");
    const saqQuestions = availableQuestions.filter((q) => q.type === "saq");

    // Get random MCQ and SAQ
    const selectedMcq = mcqQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(mcqCount, mcqQuestions.length));

    const selectedSaq = saqQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(saqCount, saqQuestions.length));

    generatedQuestions.push(...selectedMcq, ...selectedSaq);
    generatedQuestions.sort(() => Math.random() - 0.5); // Shuffle all

    setQuestions(generatedQuestions);
    setCurrentQuestionIndex(0);
    setSaqAnswers({});
    setQuizStarted(true);
  };

  const handleMcqAnswer = (answerIndex: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions[currentQuestionIndex].userAnswer = answerIndex;
    setQuestions(updatedQuestions);
  };

  const handleSaqAnswer = (text: string) => {
    setSaqAnswers((prev) => ({
      ...prev,
      [questions[currentQuestionIndex].id]: text,
    }));
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const finishQuiz = () => {
    const score = questions.filter(
      (q) =>
        q.type === "mcq" &&
        q.userAnswer === q.correctAnswer
    ).length;

    const mcqTotal = questions.filter((q) => q.type === "mcq").length;
    alert(`Quiz Completed!\nScore: ${score}/${mcqTotal} MCQ correct`);
    setQuizStarted(false);
    setSelectedTopics([]);
    setMcqCount(1);
    setSaqCount(1);
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  if (quizStarted && currentQuestion) {
    return (
      <div className="flex h-screen w-full bg-white">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl mx-auto">
            {/* Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <h2 className="text-lg font-semibold text-black">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </h2>
                <span className="text-gray-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Question Container */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg mb-6">
              <div className="mb-6 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                  Q
                </div>
                <span className="text-sm font-semibold text-gray-700 uppercase">
                  {currentQuestion.type === "mcq" ? "Multiple Choice" : "Short Answer"}
                </span>
              </div>

              <p className="mb-6 text-xl font-medium text-black">
                {currentQuestion.question}
              </p>

              {currentQuestion.type === "mcq" ? (
                // MCQ Options
                <div className="space-y-3">
                  {currentQuestion.options?.map((option, idx) => {
                    const isSelected = currentQuestion.userAnswer === idx;
                    const isCorrect = idx === currentQuestion.correctAnswer;

                    let bgColor = "bg-white border border-gray-300 hover:bg-gray-50";
                    let textColor = "text-gray-700";

                    if (currentQuestion.userAnswer !== null && currentQuestion.userAnswer !== undefined) {
                      if (isCorrect) {
                        bgColor = "bg-green-100 border border-green-300";
                        textColor = "text-green-900";
                      } else if (isSelected && !isCorrect) {
                        bgColor = "bg-red-100 border border-red-300";
                        textColor = "text-red-900";
                      } else {
                        bgColor = "bg-gray-50 border border-gray-200";
                        textColor = "text-gray-600";
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleMcqAnswer(idx)}
                        disabled={currentQuestion.userAnswer !== null && currentQuestion.userAnswer !== undefined}
                        className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${bgColor} ${textColor} cursor-pointer disabled:cursor-not-allowed`}
                      >
                        <span className="mr-3 font-bold">{String.fromCharCode(65 + idx)}.</span>
                        {option}
                        {currentQuestion.userAnswer !== null && isCorrect && " ✓"}
                      </button>
                    );
                  })}
                </div>
              ) : (
                // SAQ Text Input
                <div>
                  <textarea
                    value={saqAnswers[currentQuestion.id] || ""}
                    onChange={(e) => handleSaqAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                    rows={6}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    This is a short answer question. Your response has been saved.
                  </p>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
                className="rounded-lg border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <div className="flex gap-2">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`h-10 w-10 rounded-lg font-medium transition-colors ${
                      idx === currentQuestionIndex
                        ? "bg-blue-500 text-white"
                        : questions[idx].userAnswer !== null && questions[idx].userAnswer !== undefined
                        ? "bg-green-100 text-green-900 border border-green-300"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={finishQuiz}
                  className="rounded-lg bg-red-500 px-6 py-2 font-medium text-white hover:bg-red-600"
                >
                  Finish Quiz →
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="rounded-lg bg-blue-500 px-6 py-2 font-medium text-white hover:bg-blue-600"
                >
                  Next →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-white">
      <Sidebar />

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/chatpage" className="text-blue-500 hover:text-blue-700 text-sm mb-4 inline-block">
              ← Back to Chat
            </Link>
            <h1 className="text-3xl font-bold text-black mb-2">Quiz Generator</h1>
            <p className="text-gray-600">Select topics and customize your quiz</p>
          </div>

          {/* Topics Selection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-black mb-4">Select Topics</h2>
            <div className="grid grid-cols-2 gap-3">
              {allTopics.map((topic) => (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`rounded-lg px-4 py-3 text-left font-medium transition-colors ${
                    selectedTopics.includes(topic)
                      ? "bg-blue-100 border border-blue-300 text-blue-900"
                      : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {topic}
                  {selectedTopics.includes(topic) && " ✓"}
                </button>
              ))}
            </div>
          </div>

          {/* Question Customization */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg mb-6">
            <h2 className="text-lg font-semibold text-black mb-6">Customize Your Quiz</h2>

            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* MCQ Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Multiple Choice Questions (MCQ)
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMcqCount(Math.max(0, mcqCount - 1))}
                    className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold hover:bg-gray-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={mcqCount}
                    onChange={(e) => setMcqCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center font-semibold"
                  />
                  <button
                    onClick={() => setMcqCount(mcqCount + 1)}
                    className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* SAQ Count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Short Answer Questions (SAQ)
                </label>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setSaqCount(Math.max(0, saqCount - 1))}
                    className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold hover:bg-gray-100"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={saqCount}
                    onChange={(e) => setSaqCount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 rounded-lg border border-gray-300 px-3 py-2 text-center font-semibold"
                  />
                  <button
                    onClick={() => setSaqCount(saqCount + 1)}
                    className="h-10 w-10 rounded-lg border border-gray-300 text-lg font-bold hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Total Questions Info */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-6">
              <p className="text-sm text-blue-900">
                <strong>Total Questions:</strong> {mcqCount + saqCount} ({mcqCount} MCQ + {saqCount} SAQ)
              </p>
            </div>

            {/* Start Quiz Button */}
            <button
              onClick={generateQuiz}
              className="w-full rounded-lg bg-red-500 px-6 py-3 font-semibold text-white hover:bg-red-600 transition-colors"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}