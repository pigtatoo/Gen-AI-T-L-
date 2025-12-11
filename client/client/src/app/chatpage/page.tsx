"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Sidebar from "../components/Sidebar";

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface QuizMessage {
  type: "quiz";
  question: QuizQuestion;
  userAnswer: number | null;
}

interface Module {
  module_id: number;
  title: string;
  description: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<(({ type: "user" | "bot"; text: string }) | QuizMessage)[]>([]);
  const [input, setInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleId = searchParams.get("moduleId");

  useEffect(() => {
    if (moduleId) {
      fetchModuleDetails();
    } else {
      setIsLoading(false);
    }
  }, [moduleId]);

  const fetchModuleDetails = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch module");
      }

      const data = await response.json();
      setModule(data);
    } catch (err) {
      console.error("Error fetching module:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const topics = [
    "Machine Learning",
    "Deep Learning",
    "Natural Language Processing",
    "Computer Vision",
    "Data Science",
    "Cloud Computing",
    "Cybersecurity",
    "Web Development",
    "Mobile Development",
    "Database Management",
  ];

  const sampleQuizzes: QuizQuestion[] = [
    {
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
      question: "Which of the following is a supervised learning algorithm?",
      options: ["K-Means Clustering", "Principal Component Analysis", "Linear Regression", "DBSCAN"],
      correctAnswer: 2,
    },
    {
      question: "What does GPU stand for?",
      options: [
        "General Purpose Unit",
        "Graphics Processing Unit",
        "Global Programming Utility",
        "Graphical Performance Updater",
      ],
      correctAnswer: 1,
    },
  ];

  const handleTopicSelect = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const sortedTopics = [
    ...selectedTopics,
    ...topics.filter((t) => !selectedTopics.includes(t)),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "Summarised Newsletter",
    "Quizes",
    "Illustrations of Frameworks",
    "Real world examples",
  ];

  const handleSendMessage = () => {
    if (input.trim()) {
      const userMessage = { type: "user" as const, text: input };
      setMessages([...messages, userMessage]);
      setInput("");

      // Simulate bot response after a short delay
      setTimeout(() => {
        const botMessage = { type: "bot" as const, text: "This is a response from the bot." };
        setMessages((prev) => [...prev, botMessage]);
      }, 500);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    const userMessage = { type: "user" as const, text: question };
    setMessages([...messages, userMessage]);

    // Handle Quizes specifically
    if (question === "Quizes") {
      setTimeout(() => {
        const randomQuiz = sampleQuizzes[Math.floor(Math.random() * sampleQuizzes.length)];
        const quizMessage: QuizMessage = {
          type: "quiz",
          question: randomQuiz,
          userAnswer: null,
        };
        setMessages((prev) => [...prev, quizMessage]);
      }, 500);
    } else {
      // Simulate bot response for other questions
      setTimeout(() => {
        const botMessage = { type: "bot" as const, text: "This is a response from the bot." };
        setMessages((prev) => [...prev, botMessage]);
      }, 500);
    }
  };

  const handleQuizAnswer = (messageIndex: number, answerIndex: number) => {
    const updatedMessages = [...messages];
    const quizMessage = updatedMessages[messageIndex] as QuizMessage;
    quizMessage.userAnswer = answerIndex;
    setMessages(updatedMessages);
  };

  return (
    <div className="flex h-screen w-full gap-4 bg-white p-4">
      {/* <Sidebar /> */}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center text-gray-600">Loading module...</div>
        </div>
      ) : (
        <>
      {/* Topics Container */}
      <div className="flex w-48 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-lg overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-black">Topics</h2>
        <div className="space-y-2 flex-1">
          {sortedTopics.map((topic) => (
            <div
              key={topic}
              onClick={() => handleTopicSelect(topic)}
              className={`rounded-lg px-4 py-3 cursor-pointer transition-colors ${
                selectedTopics.includes(topic)
                  ? "bg-blue-100 border border-blue-300"
                  : "bg-white border border-gray-200 hover:bg-gray-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  selectedTopics.includes(topic) ? "text-blue-900" : "text-gray-700"
                }`}
              >
                {topic}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Empty space on left */}
      <div className="flex-1"></div>

      {/* Right side - Chat container (3/4 width) */}
      <div className="flex w-3/4 flex-col rounded-2xl border border-gray-200 bg-white shadow-lg">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-black">ChatBot</h1>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {/* Welcome Section - always visible */}
            <div className="mb-8 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                  AI
                </div>
                <span className="font-semibold text-gray-800">Nyp AI</span>
              </div>
              <p className="text-sm text-gray-600">
                Welcome to <span className="font-semibold">{module ? module.title : "Topics Selected"}</span> In this topic you'll learn from A-Z about
                <span> {module ? module.title : "topic selected"}</span> and can ask about anything related with the topic.
              </p>
            </div>

            {/* Most Asked Questions - always visible */}
            <div>
              <h3 className="mb-3 text-sm font-semibold text-gray-700">Most asked questions</h3>
              <div className="space-y-2">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedQuestion(question)}
                    className="flex w-full items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    <span>{question}</span>
                    <span className="text-gray-400">→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            {messages.map((message, index) => (
              <div key={index}>
                {message.type === "quiz" ? (
                  // Quiz Question Display
                  <div className="mb-4 mt-6 flex justify-start">
                    <div className="w-full max-w-2xl rounded-lg bg-gray-50 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                          AI
                        </div>
                        <span className="font-semibold text-gray-800">Quiz Question</span>
                      </div>
                      <p className="mb-4 text-sm font-medium text-gray-800">{(message as QuizMessage).question.question}</p>
                      <div className="space-y-2">
                        {(message as QuizMessage).question.options.map((option, optionIndex) => {
                          const quizMsg = message as QuizMessage;
                          const isAnswered = quizMsg.userAnswer !== null;
                          const isSelected = quizMsg.userAnswer === optionIndex;
                          const isCorrect = optionIndex === quizMsg.question.correctAnswer;
                          
                          let bgColor = "bg-white border border-gray-300 hover:bg-gray-50";
                          let textColor = "text-gray-700";
                          
                          if (isAnswered) {
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
                              key={optionIndex}
                              onClick={() => handleQuizAnswer(index, optionIndex)}
                              disabled={isAnswered}
                              className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors ${bgColor} ${textColor} cursor-pointer disabled:cursor-not-allowed`}
                            >
                              {option}
                              {isAnswered && isCorrect && " ✓"}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Regular Chat Message
                  <div className={`mb-4 mt-6 flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`rounded-lg px-4 py-2 ${message.type === "user" ? "bg-black text-white" : "bg-gray-100 text-gray-800"}`} style={{ maxWidth: "80%" }}>
                      <p className="text-sm break-words">{(message as any).text}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleSendMessage();
                }
              }}
              placeholder="Enter your question"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-300 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
