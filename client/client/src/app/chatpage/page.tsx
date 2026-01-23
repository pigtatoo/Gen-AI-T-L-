"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  type: "user" | "bot";
  text: string;
  quiz?: {question:string; choices:{A:string;B:string;C:string;D:string}; answer:'A'|'B'|'C'|'D'; explanation:string};
  selectedChoice?: 'A'|'B'|'C'|'D'|null;
  showExplanation?: boolean;
}

interface Module {
  module_id: number;
  title: string;
  description: string;
}

interface Topic {
  topic_id: number;
  module_id: number;
  title: string;
  created_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [module, setModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTopic, setShowAddTopic] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [newsletterRegion, setNewsletterRegion] = useState('Singapore');
  const [newsletterCustomRegion, setNewsletterCustomRegion] = useState('');
  const [isGeneratingNewsletter, setIsGeneratingNewsletter] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleId = searchParams.get("moduleId");

  // Convert plain URLs to markdown links, but skip URLs already in markdown format [text](url)
  const convertUrlsToMarkdown = (text: string): string => {
    // First, fix empty markdown links [](url) -> [url](url)
    text = text.replace(/\[\]\(https?:\/\/[^\)]+\)/g, (match) => {
      const url = match.match(/\(https?:\/\/[^\)]+\)/)?.[0]?.slice(1, -1) || '';
      return url ? `[${url}](${url})` : match;
    });
    
    // Then, convert plain URLs that are NOT already in markdown link format
    // Match URLs that are not preceded by ]( and not followed by )
    const urlRegex = /(?<!\]\()https?:\/\/[^\s\)\]]+/g;
    return text.replace(urlRegex, '[$&]($&)');
  };

  useEffect(() => {
    if (moduleId) {
      fetchModuleDetails();
      fetchTopics();
      loadChatHistory();
    } else {
      setIsLoading(false);
    }
  }, [moduleId]);

  const loadChatHistory = async () => {
    try {
      if (!moduleId) return;
      // Load from localStorage instead of database
      const stored = localStorage.getItem(`chat_${moduleId}`);
      if (stored) {
        setMessages(JSON.parse(stored));
      }
    } catch (err) {
      console.error("Error loading chat history:", err);
    }
  };

  const saveChatHistory = (messagesToSave: ChatMessage[]) => {
    try {
      if (!moduleId) return;
      // Save to localStorage only
      localStorage.setItem(`chat_${moduleId}`, JSON.stringify(messagesToSave));
    } catch (err) {
      console.error("Error saving chat history:", err);
    }
  };

  const fetchModuleDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch(`http://localhost:5000/api/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch module");

      const data = await response.json();
      setModule(data);
    } catch (err) {
      console.error("Error fetching module:", err);
    }
  };

  const fetchTopics = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      if (!moduleId) {
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}/topics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to fetch topics");

      const data = await response.json();
      setTopics(data);
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicTitle.trim()) return;

    setIsAddingTopic(true);
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}/topics`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title: newTopicTitle }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add topic");
      }

      const newTopic = await response.json();
      setTopics([newTopic, ...topics]);
      setNewTopicTitle("");
      setShowAddTopic(false);
    } catch (err) {
      console.error("Error adding topic:", err);
      alert(err instanceof Error ? err.message : "Error adding topic");
    } finally {
      setIsAddingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: number) => {
    if (!window.confirm("Delete this topic?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}/topics/${topicId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to delete topic");

      setTopics(topics.filter((t) => t.topic_id !== topicId));
      setSelectedTopics(selectedTopics.filter((id) => id !== topicId));
    } catch (err) {
      console.error("Error deleting topic:", err);
    }
  };

  const handleDownloadNewsletter = async () => {
    if (selectedTopics.length === 0) {
      alert("Please select at least one topic");
      return;
    }

    try {
      setIsGeneratingNewsletter(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const selectedTopicTitles = topics
        .filter((t) => selectedTopics.includes(t.topic_id))
        .map((t) => t.title);

      const selectedRegion = newsletterCustomRegion.trim() || newsletterRegion;

      console.log("Sending newsletter request with:", {
        moduleId: parseInt(moduleId || "0"),
        moduleTitle: module?.title,
        topicIds: selectedTopics,
        topicTitles: selectedTopicTitles,
        region: selectedRegion,
      });

      const response = await fetch("http://localhost:5000/api/newsletters/generate", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleId: parseInt(moduleId || "0"),
          moduleTitle: module?.title || "Module Newsletter",
          topicIds: selectedTopics,
          topicTitles: selectedTopicTitles,
          region: selectedRegion || null,
        }),
      });

      console.log("Newsletter response status:", response.status);

      if (!response.ok) {
        let errorMessage = "Failed to generate newsletter";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error("Error details:", errorData);
        } catch (parseErr) {
          console.error("Could not parse error response:", parseErr);
          const text = await response.text();
          console.error("Response text:", text);
        }
        throw new Error(errorMessage);
      }

      // Create blob and download
      const blob = await response.blob();
      console.log("Received blob of size:", blob.size);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `newsletter-${module?.title?.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setShowNewsletterModal(false);
      alert("Newsletter downloaded successfully!");
    } catch (err) {
      console.error("Error downloading newsletter:", err);
      alert(err instanceof Error ? err.message : "Failed to download newsletter");
    } finally {
      setIsGeneratingNewsletter(false);
    }
  };

  const handleSendMessageToOpenRouter = async (userMessage: string) => {
    try {
      setIsSendingMessage(true);

      const token = localStorage.getItem("token");
      
      // Get selected topic titles
      const selectedTopicTitles = topics
        .filter(t => selectedTopics.includes(t.topic_id))
        .map(t => t.title);

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          message: userMessage,
          moduleTitle: module?.title,
          moduleDescription: module?.description,
          selectedTopics: selectedTopicTitles
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from chatbot");
      }

      const data = await response.json();
      const fullText = data.reply;

      // Typewriter effect using requestAnimationFrame for better tab-switching support
      let displayedText = '';
      let currentIndex = 0;
      const startTime = Date.now();
      const charsPerMs = 0.05; // Adjust for typing speed (higher = faster)

      const typeCharacter = () => {
        const elapsedTime = Date.now() - startTime;
        const targetIndex = Math.floor(elapsedTime * charsPerMs);

        if (targetIndex > currentIndex && currentIndex < fullText.length) {
          currentIndex = Math.min(targetIndex, fullText.length);
          displayedText = fullText.substring(0, currentIndex);
          
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { type: "bot", text: displayedText };
            saveChatHistory(updated);
            return updated;
          });
        }

        if (currentIndex < fullText.length) {
          requestAnimationFrame(typeCharacter);
        }
      };

      requestAnimationFrame(typeCharacter);
    } catch (err) {
      console.error("Error sending message to OpenRouter:", err);
      throw err;
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const userMessage = input;
    const updatedMessages: ChatMessage[] = [...messages, { type: "user", text: userMessage }];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);
    setInput(""); // Input clears before thinking starts
    setIsSendingMessage(true);

    // Check if user is asking for a quiz (case-insensitive)
    if (/\bquiz\b/i.test(userMessage)) {
      setIsSendingMessage(false);
      handleGenerateQuizForChat();
      return;
    }

    // Add loading message immediately
    setMessages((prev) => {
      const withLoading: ChatMessage[] = [...prev, { type: "bot", text: "🤔 Thinking..." }];
      saveChatHistory(withLoading);
      return withLoading;
    });

    handleSendMessageToOpenRouter(userMessage)
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : "Error getting response from chatbot";
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { type: "bot", text: `Sorry, there was an error: ${errorMessage}` };
          saveChatHistory(updated);
          return updated;
        });
      });
  };

  const handleGenerateQuizForChat = async () => {
    try {
      const token = localStorage.getItem("token");
      const selectedTopicTitles = topics
        .filter(t => selectedTopics.includes(t.topic_id))
        .map(t => t.title);

      const res = await fetch('http://localhost:5000/api/quiz/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selectedTopics: selectedTopicTitles })
      });
      if (!res.ok) throw new Error('Failed to generate quiz');
      const data = await res.json();
      
      // Shuffle the quiz choices on frontend
      const quiz = data.quiz;
      const choices = ['A', 'B', 'C', 'D'];
      const choiceTexts: {[key: string]: string} = {
        A: quiz.choices.A,
        B: quiz.choices.B,
        C: quiz.choices.C,
        D: quiz.choices.D
      };
      
      // Fisher-Yates shuffle of the positions
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      
      // Build new shuffled choices
      const shuffledChoices: {A: string; B: string; C: string; D: string} = {
        A: choiceTexts[choices[0]],
        B: choiceTexts[choices[1]],
        C: choiceTexts[choices[2]],
        D: choiceTexts[choices[3]]
      };
      
      // Find where 'A' (the correct answer) ended up
      const newAnswerPosition = choices.indexOf('A');
      const answerMap = ['A', 'B', 'C', 'D'];
      const newAnswer = answerMap[newAnswerPosition] as 'A'|'B'|'C'|'D';
      
      quiz.choices = shuffledChoices;
      quiz.answer = newAnswer;
      
      setMessages((prev) => [...prev, { 
        type: "bot", 
        text: "Here's a quiz question for you:", 
        quiz: quiz,
        selectedChoice: null,
        showExplanation: false
      }]);
      
      // Save quiz message to history
      setMessages((prev) => {
        saveChatHistory(prev);
        return prev;
      });
    } catch (e) {
      console.error('Quiz error:', e);
      setMessages((prev) => {
        const withError: ChatMessage[] = [...prev, { 
          type: "bot", 
          text: `Error generating quiz: ${e instanceof Error ? e.message : 'Unknown error'}` 
        }];
        saveChatHistory(withError);
        return withError;
      });
    }
  };

  const handleClearChat = () => {
    if (!window.confirm("Clear all chat history? This cannot be undone.")) {
      return;
    }
    setMessages([]);
    if (moduleId) {
      localStorage.removeItem(`chat_${moduleId}`);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    const userMessage: ChatMessage = { type: "user", text: question };
    const updatedMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(updatedMessages);
    saveChatHistory(updatedMessages);

    // Check if user is asking for a quiz (case-insensitive)
    if (/\bquiz\b/i.test(question)) {
      handleGenerateQuizForChat();
      return;
    }

    setIsSendingMessage(true);

    // Add loading message
    setMessages((prev) => {
      const withLoading: ChatMessage[] = [...prev, { type: "bot", text: "🤔 Thinking..." }];
      saveChatHistory(withLoading);
      return withLoading;
    });

    handleSendMessageToOpenRouter(question)
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : "Error getting response from chatbot";
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { type: "bot", text: `Sorry, there was an error: ${errorMessage}` };
          saveChatHistory(updated);
          return updated;
        });
      });
  };

  const handleTopicSelect = (topicId: number) => {
    setSelectedTopics((prev) =>
      prev.includes(topicId) ? prev.filter((t) => t !== topicId) : [...prev, topicId]
    );
  };

  const sortedTopics = [
    ...topics.filter((t) => selectedTopics.includes(t.topic_id)),
    ...topics.filter((t) => !selectedTopics.includes(t.topic_id)),
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "Summarised Newsletter",
    "Quiz me",
    "Give me a case study",
  ];


  return (
    <div className="flex h-screen w-full gap-4 bg-white p-4">
      {/* Topics Container */}
      <div className="flex w-48 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-lg overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">Topics</h2>
          <button
            onClick={() => setShowAddTopic(!showAddTopic)}
            className="text-lg font-bold text-black hover:text-gray-600"
            title="Add topic"
          >
            +
          </button>
        </div>

        {showAddTopic && (
          <form onSubmit={handleAddTopic} className="mb-4 flex flex-col gap-2">
            <input
              type="text"
              value={newTopicTitle}
              onChange={(e) => setNewTopicTitle(e.target.value)}
              placeholder="Topic name"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={isAddingTopic}
                className="flex-1 rounded-lg bg-black px-2 py-1 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isAddingTopic ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddTopic(false);
                  setNewTopicTitle("");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-black hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="space-y-2 flex-1">
          {sortedTopics.length === 0 ? (
            <p className="text-xs text-gray-500">No topics yet. Add one to get started!</p>
          ) : (
            sortedTopics.map((topic) => (
              <div
                key={topic.topic_id}
                className={`rounded-lg px-4 py-3 cursor-pointer transition-colors flex items-center justify-between group ${
                  selectedTopics.includes(topic.topic_id)
                    ? "bg-blue-100 border border-blue-300"
                    : "bg-white border border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div onClick={() => handleTopicSelect(topic.topic_id)} className="flex-1">
                  <p
                    className={`text-sm font-medium ${
                      selectedTopics.includes(topic.topic_id) ? "text-blue-900" : "text-gray-700"
                    }`}
                  >
                    {topic.title}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTopic(topic.topic_id);
                  }}
                  className="text-lg text-red-500 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete topic"
                >
                  -
                </button>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => router.push(`/quizpage?moduleId=${moduleId}`)}
          className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors text-left"
        >
          Take Full Quiz
        </button>

        <button
          onClick={() => {
            if (selectedTopics.length === 0) {
              alert("Please select at least one topic");
            } else {
              setShowNewsletterModal(true);
            }
          }}
          className="mt-2 rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors text-left"
        >
          Download Newsletter PDF
        </button>

        {/* Newsletter Modal */}
        {showNewsletterModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 pointer-events-auto">
            <div className="max-w-sm rounded-lg bg-white p-6 shadow-xl w-96 z-50">
              <h2 className="mb-2 text-lg font-semibold text-black">📰 Download Newsletter</h2>
              <p className="mb-4 text-sm text-gray-600">
                Generate a PDF newsletter with articles from your selected topics.
              </p>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-semibold text-black">Country/Region (Optional):</label>
                <div className="space-y-2">
                  {[
                    { value: '', label: '🌐 Global - Based on Featured Articles' },
                    { value: 'Singapore', label: '🇸🇬 Singapore' },
                    { value: 'Asia', label: '🌏 Asia' },
                    { value: 'America', label: '🌎 America' },
                    { value: 'Europe', label: '🌍 Europe' },
                  ].map((option) => (
                    <label key={option.value || 'global'} className="flex items-center text-sm text-gray-700">
                      <input
                        type="radio"
                        name="region"
                        value={option.value}
                        checked={newsletterRegion === option.value && !newsletterCustomRegion}
                        onChange={(e) => {
                          setNewsletterRegion(e.target.value);
                          setNewsletterCustomRegion('');
                        }}
                        className="mr-2"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <div className="mt-3 border-t pt-3">
                  <label className="mb-2 block text-sm font-semibold text-black">Or Enter Custom Region:</label>
                  <input
                    type="text"
                    value={newsletterCustomRegion}
                    onChange={(e) => setNewsletterCustomRegion(e.target.value)}
                    placeholder="e.g., Australia, Japan, India"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-black placeholder-gray-400 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
                <p>ℹ️ Selected topics: {topics
                  .filter((t) => selectedTopics.includes(t.topic_id))
                  .map((t) => t.title)
                  .join(", ")}</p>
                <p className="mt-2">📍 Region: {(newsletterCustomRegion.trim() || newsletterRegion) ? (newsletterCustomRegion.trim() || newsletterRegion) : "Global - Based on Featured Articles"}</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewsletterModal(false)}
                  className="flex-1 rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-50"
                  disabled={isGeneratingNewsletter}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDownloadNewsletter}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  disabled={isGeneratingNewsletter}
                >
                  {isGeneratingNewsletter ? "Generating..." : "Download"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/landingpage")}
              className="text-gray-600 hover:text-gray-900 transition-colors"
              title="Back to modules"
            >
              ←
            </button>
            <h1 className="text-xl font-semibold text-black">ChatBot</h1>
          </div>
          <button
            onClick={handleClearChat}
            className="px-3 py-1 text-sm font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
            title="Clear chat history"
          >
            🗑️ Clear
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-8 rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold">
                  AI
                </div>
                <span className="font-semibold text-gray-800">Teacher AI</span>
              </div>
              <p className="text-sm text-gray-600">
                Welcome to <span className="font-semibold">{module ? module.title : "Topics Selected"}</span>. Ask anything about this topic.
              </p>
            </div>

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

            {messages.map((message, index) => (
              <div key={index} className={`mb-4 mt-6 flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`rounded-lg px-4 py-2 ${message.type === "user" ? "bg-black text-white" : "bg-gray-100 text-gray-800"}`} style={{ maxWidth: "80%" }}>
                  {message.type === "user" ? (
                    <p className="text-sm break-words">{message.text}</p>
                  ) : (
                    <>
                      {message.text && (
                        <div className="text-sm break-words prose prose-sm max-w-none">
                          <ReactMarkdown
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-2 mb-2" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-bold mt-2 mb-1" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-bold mt-1 mb-1" {...props} />,
                              strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                              em: ({node, ...props}) => <em className="italic" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc list-inside my-1" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal list-inside my-1" {...props} />,
                              li: ({node, ...props}) => <li className="ml-2" {...props} />,
                              p: ({node, ...props}) => <p className="my-1" {...props} />,
                              a: ({node, href, ...props}) => (
                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline cursor-pointer" {...props} />
                              ),
                              code: ({node, className, ...props}) => (
                                className ? 
                                <code className="bg-gray-300 px-2 py-1 rounded block text-xs my-1 overflow-x-auto" {...props} /> :
                                <code className="bg-gray-300 px-1 rounded text-xs" {...props} />
                              ),
                            }}
                          >
                            {convertUrlsToMarkdown(message.text)}
                          </ReactMarkdown>
                        </div>
                      )}
                      {message.quiz && (
                        <div className="mt-3 rounded-lg bg-white p-4 border border-gray-300 relative">
                          <p className="text-sm font-semibold text-gray-800 mb-3">{message.quiz.question}</p>
                          <div className="space-y-2">
                            {(['A','B','C','D'] as const).map((opt) => {
                              const text = message.quiz!.choices[opt];
                              const isSelected = message.selectedChoice === opt;
                              const isCorrect = message.quiz!.answer === opt;
                              const bg = message.selectedChoice
                                ? (isCorrect && isSelected ? 'bg-green-100 border-green-400' : (isSelected ? 'bg-red-100 border-red-400' : 'bg-gray-50 border-gray-200'))
                                : 'bg-gray-50 border-gray-200 hover:bg-gray-100';
                              const textColor = message.selectedChoice
                                ? (isCorrect && isSelected ? 'text-green-800' : (isSelected ? 'text-red-800' : 'text-gray-800'))
                                : 'text-gray-800';
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    const newMessages = [...messages];
                                    newMessages[index] = { ...newMessages[index], selectedChoice: opt };
                                    setMessages(newMessages);
                                    saveChatHistory(newMessages);
                                  }}
                                  className={`w-full text-left rounded-lg border px-3 py-2 ${bg} ${textColor} transition-colors cursor-pointer font-normal`}
                                >
                                  <span className="font-semibold mr-2">{opt}.</span>{text}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-3">
                            <button
                              onClick={() => {
                                const newMessages = [...messages];
                                newMessages[index] = { ...newMessages[index], showExplanation: !message.showExplanation };
                                setMessages(newMessages);
                                saveChatHistory(newMessages);
                              }}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                            >
                              {message.showExplanation ? "Hide Explanation" : "Reveal Explanation"}
                            </button>
                          </div>
                          {message.showExplanation && (
                            <div className="mt-2 rounded bg-gray-50 p-3 text-sm text-gray-800">
                              <p><span className="font-semibold">Correct Answer:</span> {message.quiz.answer}</p>
                              <p className="mt-1"><span className="font-semibold">Explanation:</span> {message.quiz.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Enter your question"
              className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-300 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={isSendingMessage}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 text-white transition-colors hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title={isSendingMessage ? "Waiting for response..." : "Send message"}
            >
              {isSendingMessage ? (
                <span className="animate-spin inline-block">⏳</span>
              ) : (
                "▶"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
