"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ChatMessage {
  type: "user" | "bot";
  text: string;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleId = searchParams.get("moduleId");

  useEffect(() => {
    if (moduleId) {
      fetchModuleDetails();
      fetchTopics();
    } else {
      setIsLoading(false);
    }
  }, [moduleId]);

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

  const handleSendMessageToOpenRouter = async (userMessage: string) => {
    try {
      setIsSendingMessage(true);

      const token = localStorage.getItem("token"); // optional if your backend uses auth

      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to get response from chatbot");
      }

      const data = await response.json();
      return data.reply;
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
    setMessages([...messages, { type: "user", text: userMessage }]);
    setInput("");

    handleSendMessageToOpenRouter(userMessage)
      .then((botResponse) => {
        setMessages((prev) => [...prev, { type: "bot", text: botResponse }]);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : "Error getting response from chatbot";
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: `Sorry, there was an error: ${errorMessage}` },
        ]);
      });
  };

  const handleSuggestedQuestion = (question: string) => {
    const userMessage = { type: "user" as const, text: question };
    setMessages([...messages, userMessage]);

    handleSendMessageToOpenRouter(question)
      .then((botResponse) => {
        setMessages((prev) => [...prev, { type: "bot", text: botResponse }]);
      })
      .catch((err) => {
        const errorMessage = err instanceof Error ? err.message : "Error getting response from chatbot";
        setMessages((prev) => [
          ...prev,
          { type: "bot", text: `Sorry, there was an error: ${errorMessage}` },
        ]);
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
    "Illustrations of Frameworks",
    "Real world examples",
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
      </div>

      {/* Chat container */}
      <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-xl font-semibold text-black">ChatBot</h1>
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
                  <p className="text-sm break-words">{message.text}</p>
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
            >
              {isSendingMessage ? "..." : "▶"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
