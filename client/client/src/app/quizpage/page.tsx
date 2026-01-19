"use client";

import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { useSearchParams, useRouter } from "next/navigation";

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

interface Quiz {
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface QuizMessage {
  quiz: Quiz;
  selectedChoice: 'A' | 'B' | 'C' | 'D' | null;
  showExplanation: boolean;
  score?: boolean;
}

export default function QuizPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const moduleId = searchParams.get("moduleId");
  
  const [module, setModule] = useState<Module | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<number[]>([]);
  const [quizzes, setQuizzes] = useState<QuizMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [score, setScore] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [numQuestions, setNumQuestions] = useState(5);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  // Download as Kahoot CSV
  const downloadKahootCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      if (quizzes.length === 0) return;
      // Kahoot expects: Question, Correct answer, Incorrect 1, Incorrect 2, Incorrect 3
      const rows = quizzes.map((item) => {
        // Find correct and incorrect answers
        const correct = item.quiz.choices[item.quiz.answer];
        const incorrect = (['A', 'B', 'C', 'D'] as const)
          .filter(opt => opt !== item.quiz.answer)
          .map(opt => item.quiz.choices[opt]);
        return {
          Question: item.quiz.question,
          "Correct answer": correct,
          "Incorrect 1": incorrect[0] || "",
          "Incorrect 2": incorrect[1] || "",
          "Incorrect 3": incorrect[2] || ""
        };
      });
      const header = Object.keys(rows[0]);
      const csv = [header.join(",")].concat(
        rows.map(row => header.map(h => '"' + String((row as Record<string, unknown>)[h]).replace(/"/g, '""') + '"').join(","))
      ).join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `kahoot-quiz-${module?.title?.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Kahoot CSV downloaded successfully!");
    } catch (err) {
      console.error("Error downloading Kahoot CSV:", err);
      alert("Failed to download Kahoot CSV");
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  // Download as Brightspace CSV/Excel
  const downloadBrightspaceExcel = async () => {
    try {
      setIsDownloadingExcel(true);
      if (quizzes.length === 0) return;
      // Brightspace expects: Type, Question Text, Points, Option 1, Option 2, Option 3, Option 4, Correct Answer, Feedback
      // We'll use Multiple Choice (MC)
      const rows = quizzes.map((item) => {
        const options = [item.quiz.choices.A, item.quiz.choices.B, item.quiz.choices.C, item.quiz.choices.D];
        return {
          Type: "MC",
          "Question Text": item.quiz.question,
          Points: 1,
          "Option 1": options[0],
          "Option 2": options[1],
          "Option 3": options[2],
          "Option 4": options[3],
          "Correct Answer": item.quiz.choices[item.quiz.answer],
          Feedback: item.quiz.explanation
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "BrightspaceQuiz");
      const filename = `brightspace-quiz-${module?.title?.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      alert("Brightspace Excel downloaded successfully!");
    } catch (err) {
      console.error("Error downloading Brightspace Excel:", err);
      alert("Failed to download Brightspace Excel");
    } finally {
      setIsDownloadingExcel(false);
    }
  };

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

      const response = await fetch(
        `http://localhost:5000/api/modules/${moduleId}/topics`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) throw new Error("Failed to fetch topics");
      const data = await response.json();
      setTopics(data);
      setSelectedTopics(data.map((t: Topic) => t.topic_id));
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuiz = async () => {
    try {
      setIsGenerating(true);
      const token = localStorage.getItem("token");
      const selectedTopicTitles = topics
        .filter(t => selectedTopics.includes(t.topic_id))
        .map(t => t.title);

      const newQuizzes: QuizMessage[] = [];
      
      // Generate multiple quizzes
      for (let i = 0; i < numQuestions; i++) {
        const res = await fetch('http://localhost:5000/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ selectedTopics: selectedTopicTitles })
        });
        
        if (!res.ok) throw new Error('Failed to generate quiz');
        const data = await res.json();
        
        // Shuffle choices
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
        
        newQuizzes.push({
          quiz,
          selectedChoice: null,
          showExplanation: false
        });
        
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setQuizzes([...quizzes, ...newQuizzes]);
      setScore(0);
      setTotalAttempts(0);
    } catch (e) {
      console.error('Quiz error:', e);
      alert(`Error generating quiz: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQuizAsPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      const token = localStorage.getItem("token");

      if (!token) {
        router.push("/loginpage");
        return;
      }

      const selectedTopicTitles = topics
        .filter(t => selectedTopics.includes(t.topic_id))
        .map(t => t.title);

      const response = await fetch("http://localhost:5000/api/quiz/download-pdf", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          moduleTitle: module?.title || "Module Quiz",
          topicTitles: selectedTopicTitles,
          quizzes: quizzes,
          score: score,
          totalAttempts: totalAttempts
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate quiz PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quiz-${module?.title?.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert("Quiz downloaded successfully!");
    } catch (err) {
      console.error("Error downloading PDF:", err);
      alert("Failed to download quiz as PDF");
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handleSelectChoice = (index: number, choice: 'A' | 'B' | 'C' | 'D') => {
    const newQuizzes = [...quizzes];
    newQuizzes[index] = { ...newQuizzes[index], selectedChoice: choice };
    
    const isCorrect = newQuizzes[index].quiz.answer === choice;
    if (isCorrect) {
      setScore(score + 1);
    }
    setTotalAttempts(totalAttempts + 1);
    
    setQuizzes(newQuizzes);
  };

  const toggleExplanation = (index: number) => {
    const newQuizzes = [...quizzes];
    newQuizzes[index] = { ...newQuizzes[index], showExplanation: !newQuizzes[index].showExplanation };
    setQuizzes(newQuizzes);
  };

  const handleTopicToggle = (topicId: number) => {
    setSelectedTopics(prev =>
      prev.includes(topicId) ? prev.filter(t => t !== topicId) : [...prev, topicId]
    );
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex h-screen w-full gap-4 bg-white p-4">
      {/* Topics Sidebar */}
      <div className="flex w-48 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-lg overflow-y-auto">
        <h2 className="mb-4 text-lg font-semibold text-black">Topics</h2>
        <div className="space-y-2">
          {topics.map((topic) => (
            <div key={topic.topic_id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedTopics.includes(topic.topic_id)}
                onChange={() => handleTopicToggle(topic.topic_id)}
                className="cursor-pointer"
              />
              <label className="text-sm text-gray-700 cursor-pointer">{topic.title}</label>
            </div>
          ))}
        </div>
      </div>

      {/* Quiz Container */}
      <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-lg">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-black">{module?.title} - Quiz</h1>
            <div className="flex gap-2">
              <button
                onClick={downloadQuizAsPDF}
                disabled={quizzes.length === 0 || isDownloadingPDF}
                className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download quiz as PDF"
              >
                {isDownloadingPDF ? '📥 Downloading...' : '📥 Download PDF'}
              </button>
              <button
                onClick={downloadKahootCSV}
                disabled={quizzes.length === 0 || isDownloadingCSV}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Kahoot CSV"
              >
                {isDownloadingCSV ? '⬇️ Downloading...' : '⬇️ Kahoot CSV'}
              </button>
              <button
                onClick={downloadBrightspaceExcel}
                disabled={quizzes.length === 0 || isDownloadingExcel}
                className="px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Brightspace Excel"
              >
                {isDownloadingExcel ? '⬇️ Downloading...' : '⬇️ Brightspace Excel'}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Score: {score}/{totalAttempts}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-gray-600 text-lg">No quizzes yet. Customize and start generating!</p>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-800 mb-2">Number of Questions:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">Generate 1-20 questions</p>
              </div>
              <button
                onClick={generateQuiz}
                disabled={isGenerating || selectedTopics.length === 0}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Quiz"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {quizzes.map((item, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Question {index + 1}</h3>
                  <p className="text-base text-gray-800 mb-4">{item.quiz.question}</p>
                  
                  <div className="space-y-2 mb-4">
                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                      const text = item.quiz.choices[opt];
                      const isSelected = item.selectedChoice === opt;
                      const isCorrect = item.quiz.answer === opt;
                      const bg = item.selectedChoice
                        ? (isCorrect && isSelected ? 'bg-green-100 border-green-400' : (isSelected ? 'bg-red-100 border-red-400' : 'bg-white border-gray-200'))
                        : 'bg-white border-gray-200 hover:bg-gray-100';
                      const textColor = item.selectedChoice
                        ? (isCorrect && isSelected ? 'text-green-800' : (isSelected ? 'text-red-800' : 'text-gray-800'))
                        : 'text-gray-800';
                      
                      return (
                        <button
                          key={opt}
                          onClick={() => item.selectedChoice === null && handleSelectChoice(index, opt)}
                          disabled={item.selectedChoice !== null}
                          className={`w-full text-left rounded-lg border px-4 py-3 ${bg} ${textColor} transition-colors cursor-pointer font-normal disabled:cursor-default`}
                        >
                          <span className="font-semibold mr-2">{opt}.</span>{text}
                        </button>
                      );
                    })}
                  </div>

                  {item.selectedChoice && (
                    <>
                      <button
                        onClick={() => toggleExplanation(index)}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 mb-3"
                      >
                        {item.showExplanation ? "Hide Explanation" : "Reveal Explanation"}
                      </button>
                      {item.showExplanation && (
                        <div className="rounded bg-white p-3 border border-blue-200">
                          <p className="text-sm text-gray-800"><span className="font-semibold">Correct Answer:</span> {item.quiz.answer}</p>
                          <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">Explanation:</span> {item.quiz.explanation}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="mb-3 flex items-end gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">Number of Questions:</label>
              <input
                type="number"
                min="1"
                max="20"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">1-20 questions</p>
            </div>
            <button
              onClick={generateQuiz}
              disabled={isGenerating || selectedTopics.length === 0}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate New Quiz"}
            </button>
          </div>
          <button
            onClick={() => router.push(`/chatpage?moduleId=${moduleId}`)}
            className="w-full rounded-lg bg-gray-600 px-6 py-3 text-white font-semibold hover:bg-gray-700"
          >
            Back to Chat
          </button>
        </div>
      </div>
    </div>
  );
}