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

  const saveKey = moduleId ? `saved_quiz_module_${moduleId}` : null;

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
      if (quizzes.length === 0) { setIsDownloadingExcel(false); return; }
      // Produce Brightspace import style rows for MULTIPLE CHOICE (MC) questions.
      // Format follows the sample: NewQuestion,MC then rows like ID, Title, QuestionText, Points, Difficulty, Image, Option,..., Hint, Feedback
      const rows: any[][] = [];

      // Optional header lines similar to sample guidance
      rows.push(["//MULTIPLE CHOICE QUESTION TYPE"]);
      rows.push(["//Options must include text in column3"]);
      rows.push([]);

      quizzes.forEach((item, idx) => {
        const qIndex = idx + 1;
        const safeModule = module?.title ? String(module.title).replace(/\s+/g, "-") : "module";
        const generatedId = `${safeModule}-${qIndex}`;

        rows.push(["NewQuestion", "MC", "", "", ""]);
        rows.push(["ID", generatedId, "", "", ""]);
        rows.push(["Title", `Question ${qIndex}`, "", "", ""]);
        rows.push(["QuestionText", item.quiz.question, "", "", ""]);
        rows.push(["Points", 1, "", "", ""]);
        rows.push(["Difficulty", 1, "", "", ""]);
        rows.push(["Image", "", "", "", ""]);

        // Add each option as: Option,scorePercent,optionText,,feedback
        (['A', 'B', 'C', 'D'] as const).forEach((opt) => {
          const text = item.quiz.choices[opt] || "";
          const score = item.quiz.answer === opt ? 100 : 0;
          rows.push(["Option", score, text, "", item.quiz.explanation || ""]);
        });

        rows.push(["Hint", "", "", "", ""]);
        rows.push(["Feedback", item.quiz.explanation || "", "", "", ""]);
        rows.push([]);
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
      // Generate CSV UTF-8 (with BOM) for Brightspace import
      const csv = XLSX.utils.sheet_to_csv(ws);
      const csvWithBOM = "\uFEFF" + csv;
      const filename = `brightspace-quiz-${module?.title?.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().split("T")[0]}.csv`;
      const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      alert("Brightspace CSV downloaded successfully! (UTF-8)");
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

  // Load saved quiz state from localStorage for this module
  useEffect(() => {
    if (!moduleId) return;
    try {
      const key = `saved_quiz_module_${moduleId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.quizzes) setQuizzes(parsed.quizzes);
        if (typeof parsed.score === 'number') setScore(parsed.score);
        if (typeof parsed.totalAttempts === 'number') setTotalAttempts(parsed.totalAttempts);
        if (typeof parsed.numQuestions === 'number') setNumQuestions(parsed.numQuestions);
        if (Array.isArray(parsed.selectedTopics)) setSelectedTopics(parsed.selectedTopics);
      }
    } catch (err) {
      console.error('Failed to load saved quiz from localStorage', err);
    }
  }, [moduleId]);

  // Persist quiz state to localStorage whenever it changes
  useEffect(() => {
    if (!moduleId) return;
    try {
      const key = `saved_quiz_module_${moduleId}`;
      const toSave = {
        quizzes,
        score,
        totalAttempts,
        numQuestions,
        selectedTopics,
      };
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to save quiz to localStorage', err);
    }
  }, [moduleId, quizzes, score, totalAttempts, numQuestions, selectedTopics]);

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
      
      // Generate multiple quizzes (replace existing set)
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
      
      // Replace existing quizzes with newly generated set
      setQuizzes(newQuizzes);
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
                {isDownloadingExcel ? '⬇️ Downloading...' : '⬇️ BrightspaceCSV'}
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
            <button
              onClick={() => {
                // Clear saved quiz for this module and reset state
                if (moduleId) {
                  try { localStorage.removeItem(`saved_quiz_module_${moduleId}`); } catch (e) {}
                }
                setQuizzes([]);
                setScore(0);
                setTotalAttempts(0);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 ml-2"
            >
              Clear Saved Quiz
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