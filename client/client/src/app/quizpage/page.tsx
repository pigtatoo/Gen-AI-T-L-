"use client";

import { useState, useEffect, Suspense } from "react";
import * as XLSX from "xlsx";
import { useSearchParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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

interface QuizMC {
  type: 'MC';
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
}

interface QuizTF {
  type: 'TF';
  question: string;
  answer: 'TRUE' | 'FALSE';
  explanation: string;
}

interface QuizSA {
  type: 'SA';
  question: string;
  answers: string[];
  explanation: string;
}

interface QuizMS {
  type: 'MS';
  question: string;
  choices: { A: string; B: string; C: string; D: string; E?: string };
  answers: string[];
  explanation: string;
}

type Quiz = QuizMC | QuizTF | QuizSA | QuizMS;

interface QuizMessage {
  quiz: Quiz;
  selectedChoice?: 'A' | 'B' | 'C' | 'D' | 'E' | 'TRUE' | 'FALSE' | null;
  selectedChoices?: string[];
  userAnswer?: string;
  showExplanation: boolean;
  score?: boolean;
}

function QuizPage() {
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
  const [questionTypes, setQuestionTypes] = useState({
    MC: 3,
    TF: 1,
    SA: 1,
    MS: 0
  });
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

  const saveKey = moduleId ? `saved_quiz_module_${moduleId}` : null;

  // Download as Kahoot CSV
  const downloadKahootCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      if (quizzes.length === 0) return;
      
      // Kahoot only supports multiple choice - filter MC questions only
      const mcQuizzes = quizzes.filter(item => item.quiz.type === 'MC');
      
      if (mcQuizzes.length === 0) {
        alert("No Multiple Choice questions available for Kahoot export.");
        setIsDownloadingCSV(false);
        return;
      }
      
      // Kahoot expects: Question, Correct answer, Incorrect 1, Incorrect 2, Incorrect 3
      const rows = mcQuizzes.map((item) => {
        const quiz = item.quiz as QuizMC;
        const correct = quiz.choices[quiz.answer];
        const incorrect = (['A', 'B', 'C', 'D'] as const)
          .filter(opt => opt !== quiz.answer)
          .map(opt => quiz.choices[opt]);
        return {
          Question: quiz.question,
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
      alert(`Kahoot CSV downloaded successfully! (${mcQuizzes.length} MC questions)`);
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
      
      const rows: any[][] = [];
      rows.push(["//Brightspace Question Import File"]);
      rows.push(["//Generated from Gen-AI-T-L Quiz System"]);
      rows.push([]);

      quizzes.forEach((item, idx) => {
        const qIndex = idx + 1;
        const safeModule = module?.title ? String(module.title).replace(/\s+/g, "-") : "module";
        const generatedId = `${safeModule}-${qIndex}`;
        const quiz = item.quiz;

        if (quiz.type === 'MC') {
          // Multiple Choice
          rows.push(["NewQuestion", "MC", "", "", ""]);
          rows.push(["ID", generatedId, "", "", ""]);
          rows.push(["Title", `Question ${qIndex}`, "", "", ""]);
          rows.push(["QuestionText", quiz.question, "", "", ""]);
          rows.push(["Points", 1, "", "", ""]);
          rows.push(["Difficulty", 1, "", "", ""]);
          rows.push(["Image", "", "", "", ""]);

          (['A', 'B', 'C', 'D'] as const).forEach((opt) => {
            const text = quiz.choices[opt] || "";
            const score = quiz.answer === opt ? 100 : 0;
            rows.push(["Option", score, text, "", ""]);
          });

          rows.push(["Hint", "", "", "", ""]);
          rows.push(["Feedback", quiz.explanation || "", "", "", ""]);
          rows.push([]);

        } else if (quiz.type === 'TF') {
          // True/False
          rows.push(["NewQuestion", "TF", "", "", ""]);
          rows.push(["ID", generatedId, "", "", ""]);
          rows.push(["Title", `Question ${qIndex}`, "", "", ""]);
          rows.push(["QuestionText", quiz.question, "", "", ""]);
          rows.push(["Points", 1, "", "", ""]);
          rows.push(["Difficulty", 1, "", "", ""]);
          rows.push(["Image", "", "", "", ""]);
          
          const isTrue = quiz.answer === 'TRUE';
          rows.push(["TRUE", isTrue ? 100 : 0, isTrue ? quiz.explanation : "", "", ""]);
          rows.push(["FALSE", !isTrue ? 100 : 0, !isTrue ? quiz.explanation : "", "", ""]);
          
          rows.push(["Hint", "", "", "", ""]);
          rows.push(["Feedback", quiz.explanation || "", "", "", ""]);
          rows.push([]);

        } else if (quiz.type === 'SA') {
          // Short Answer
          rows.push(["NewQuestion", "SA", "", "", ""]);
          rows.push(["ID", generatedId, "", "", ""]);
          rows.push(["Title", `Question ${qIndex}`, "", "", ""]);
          rows.push(["QuestionText", quiz.question, "", "", ""]);
          rows.push(["Points", 1, "", "", ""]);
          rows.push(["Difficulty", 1, "", "", ""]);
          rows.push(["Image", "", "", "", ""]);
          rows.push(["InputBox", 3, 40, "", ""]);
          
          quiz.answers.forEach((ans, aIdx) => {
            const weight = aIdx === 0 ? 100 : 50;
            rows.push(["Answer", weight, ans, "regexp", ""]);
          });
          
          rows.push(["Hint", "", "", "", ""]);
          rows.push(["Feedback", quiz.explanation || "", "", "", ""]);
          rows.push([]);

        } else if (quiz.type === 'MS') {
          // Multi-Select
          rows.push(["NewQuestion", "MS", "", "", ""]);
          rows.push(["ID", generatedId, "", "", ""]);
          rows.push(["Title", `Question ${qIndex}`, "", "", ""]);
          rows.push(["QuestionText", quiz.question, "", "", ""]);
          rows.push(["Points", 1, "", "", ""]);
          rows.push(["Difficulty", 1, "", "", ""]);
          rows.push(["Image", "", "", "", ""]);
          rows.push(["Scoring", "RightAnswers", "", "", ""]);
          
          const choiceKeys = Object.keys(quiz.choices) as ('A' | 'B' | 'C' | 'D' | 'E')[];
          choiceKeys.forEach((opt) => {
            const text = quiz.choices[opt] || "";
            const isCorrect = quiz.answers.includes(opt) ? 1 : 0;
            rows.push(["Option", isCorrect, text, "", ""]);
          });
          
          rows.push(["Hint", "", "", "", ""]);
          rows.push(["Feedback", quiz.explanation || "", "", "", ""]);
          rows.push([]);
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(rows);
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
      alert("Brightspace CSV downloaded successfully!");
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
        if (parsed.questionTypes) setQuestionTypes(parsed.questionTypes);
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
        questionTypes,
        selectedTopics,
      };
      localStorage.setItem(key, JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to save quiz to localStorage', err);
    }
  }, [moduleId, quizzes, score, totalAttempts, questionTypes, selectedTopics]);

  const fetchModuleDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/loginpage");
        return;
      }

      const response = await fetch(`${API_URL}/api/modules/${moduleId}`, {
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
        `${API_URL}/api/modules/${moduleId}/topics`,
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
      
      // Build array of question types based on user selections
      const questionTypeArray: string[] = [];
      Object.entries(questionTypes).forEach(([type, count]) => {
        for (let i = 0; i < count; i++) {
          questionTypeArray.push(type);
        }
      });

      // Shuffle the question types for variety
      for (let i = questionTypeArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionTypeArray[i], questionTypeArray[j]] = [questionTypeArray[j], questionTypeArray[i]];
      }
      
      // Generate quizzes for each type
      for (const qType of questionTypeArray) {
        const res = await fetch(`${API_URL}/api/quiz/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ selectedTopics: selectedTopicTitles, questionType: qType })
        });
        
        if (!res.ok) throw new Error('Failed to generate quiz');
        const data = await res.json();
        const quiz = data.quiz;

        // Shuffle choices for MC and MS questions
        if (quiz.type === 'MC' && quiz.choices) {
          const choices = ['A', 'B', 'C', 'D'];
          const choiceTexts: {[key: string]: string} = {
            A: quiz.choices.A,
            B: quiz.choices.B,
            C: quiz.choices.C,
            D: quiz.choices.D
          };
          
          for (let i = choices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choices[i], choices[j]] = [choices[j], choices[i]];
          }
          
          const shuffledChoices: {A: string; B: string; C: string; D: string} = {
            A: choiceTexts[choices[0]],
            B: choiceTexts[choices[1]],
            C: choiceTexts[choices[2]],
            D: choiceTexts[choices[3]]
          };
          
          const newAnswerPosition = choices.indexOf('A');
          const answerMap = ['A', 'B', 'C', 'D'];
          quiz.choices = shuffledChoices;
          quiz.answer = answerMap[newAnswerPosition] as 'A'|'B'|'C'|'D';
        } else if (quiz.type === 'MS' && quiz.choices && quiz.answers) {
          const choiceKeys = Object.keys(quiz.choices);
          const choiceTexts: {[key: string]: string} = { ...quiz.choices };
          
          for (let i = choiceKeys.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [choiceKeys[i], choiceKeys[j]] = [choiceKeys[j], choiceKeys[i]];
          }
          
          const shuffledChoices: any = {};
          const mapping: {[key: string]: string} = {};
          const newAnswers: string[] = [];
          
          choiceKeys.forEach((oldKey, idx) => {
            const newKey = String.fromCharCode(65 + idx); // A, B, C, D, E
            shuffledChoices[newKey] = choiceTexts[oldKey];
            mapping[oldKey] = newKey;
          });
          
          quiz.answers.forEach((oldAns: string) => {
            newAnswers.push(mapping[oldAns]);
          });
          
          quiz.choices = shuffledChoices;
          quiz.answers = newAnswers;
        }
        
        newQuizzes.push({
          quiz,
          selectedChoice: quiz.type === 'TF' ? null : null,
          selectedChoices: quiz.type === 'MS' ? [] : undefined,
          userAnswer: quiz.type === 'SA' ? '' : undefined,
          showExplanation: false
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
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

      const response = await fetch(`${API_URL}/api/quiz/download-pdf`, {
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

  const handleSelectChoice = (index: number, choice: 'A' | 'B' | 'C' | 'D' | 'TRUE' | 'FALSE') => {
    const newQuizzes = [...quizzes];
    const quiz = newQuizzes[index].quiz;
    newQuizzes[index] = { ...newQuizzes[index], selectedChoice: choice };
    
    let isCorrect = false;
    if (quiz.type === 'MC') {
      isCorrect = quiz.answer === choice;
    } else if (quiz.type === 'TF') {
      isCorrect = quiz.answer === choice;
    }
    
    if (isCorrect) {
      setScore(score + 1);
    }
    setTotalAttempts(totalAttempts + 1);
    
    setQuizzes(newQuizzes);
  };

  const handleMultiSelectToggle = (index: number, choice: string) => {
    const newQuizzes = [...quizzes];
    const currentSelections = newQuizzes[index].selectedChoices || [];
    
    if (currentSelections.includes(choice)) {
      newQuizzes[index].selectedChoices = currentSelections.filter(c => c !== choice);
    } else {
      newQuizzes[index].selectedChoices = [...currentSelections, choice];
    }
    
    setQuizzes(newQuizzes);
  };

  const handleMultiSelectSubmit = (index: number) => {
    const newQuizzes = [...quizzes];
    const quiz = newQuizzes[index].quiz;
    const selected = newQuizzes[index].selectedChoices || [];
    
    if (quiz.type === 'MS') {
      const correctAnswers = quiz.answers.sort().join(',');
      const userAnswers = selected.sort().join(',');
      const isCorrect = correctAnswers === userAnswers;
      
      if (isCorrect) {
        setScore(score + 1);
      }
      setTotalAttempts(totalAttempts + 1);
      
      newQuizzes[index].selectedChoice = 'submitted' as any;
      setQuizzes(newQuizzes);
    }
  };

  const handleShortAnswerSubmit = (index: number) => {
    const newQuizzes = [...quizzes];
    const quiz = newQuizzes[index].quiz;
    const userAnswer = (newQuizzes[index].userAnswer || '').trim().toLowerCase();
    
    if (quiz.type === 'SA') {
      const isCorrect = quiz.answers.some(ans => 
        ans.toLowerCase().trim() === userAnswer
      );
      
      if (isCorrect) {
        setScore(score + 1);
      }
      setTotalAttempts(totalAttempts + 1);
      
      newQuizzes[index].selectedChoice = 'submitted' as any;
      setQuizzes(newQuizzes);
    }
  };

  const handleShortAnswerChange = (index: number, value: string) => {
    const newQuizzes = [...quizzes];
    newQuizzes[index].userAnswer = value;
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
    <div className="flex flex-col md:flex-row h-screen w-full gap-4 bg-white p-4">
      {/* Topics Sidebar */}
      <div className="flex w-full md:w-48 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-lg overflow-y-auto max-h-56 md:max-h-none">
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
      <div className="flex-1 flex flex-col rounded-2xl border border-gray-200 bg-white shadow-lg min-h-0">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-semibold text-black">{module?.title} - Quiz</h1>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={downloadQuizAsPDF}
                disabled={quizzes.length === 0 || isDownloadingPDF}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download quiz as PDF"
              >
                {isDownloadingPDF ? '📥 Downloading...' : '📥 Download PDF'}
              </button>
              <button
                onClick={downloadKahootCSV}
                disabled={quizzes.length === 0 || isDownloadingCSV}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Kahoot CSV"
              >
                {isDownloadingCSV ? '⬇️ Downloading...' : '⬇️ Kahoot CSV'}
              </button>
              <button
                onClick={downloadBrightspaceExcel}
                disabled={quizzes.length === 0 || isDownloadingExcel}
                className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Download Brightspace Excel"
              >
                {isDownloadingExcel ? '⬇️ Downloading...' : '⬇️ BrightspaceCSV'}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">Score: {score}/{totalAttempts}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {quizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <p className="text-gray-600 text-lg">No quizzes yet. Customize and start generating!</p>
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 w-full max-w-md">
                <label className="block text-sm font-semibold text-gray-800 mb-3">Question Types:</label>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Multiple Choice (MC)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={questionTypes.MC}
                      onChange={(e) => setQuestionTypes({...questionTypes, MC: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">True/False (TF)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={questionTypes.TF}
                      onChange={(e) => setQuestionTypes({...questionTypes, TF: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Short Answer (SA)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={questionTypes.SA}
                      onChange={(e) => setQuestionTypes({...questionTypes, SA: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-700">Multi-Select (MS)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={questionTypes.MS}
                      onChange={(e) => setQuestionTypes({...questionTypes, MS: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Total: {questionTypes.MC + questionTypes.TF + questionTypes.SA + questionTypes.MS} questions</p>
              </div>
              <button
                onClick={generateQuiz}
                disabled={isGenerating || selectedTopics.length === 0 || (questionTypes.MC + questionTypes.TF + questionTypes.SA + questionTypes.MS) === 0}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? "Generating..." : "Generate Quiz"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {quizzes.map((item, index) => {
                const quiz = item.quiz;
                const isAnswered = item.selectedChoice !== null && item.selectedChoice !== undefined;
                
                return (
                  <div key={index} className="rounded-lg border border-gray-200 p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">Question {index + 1}</h3>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {quiz.type === 'MC' ? 'Multiple Choice' : quiz.type === 'TF' ? 'True/False' : quiz.type === 'SA' ? 'Short Answer' : 'Multi-Select'}
                      </span>
                    </div>
                    <p className="text-base text-gray-800 mb-4">{quiz.question}</p>
                    
                    {/* Multiple Choice */}
                    {quiz.type === 'MC' && (
                      <div className="space-y-2 mb-4">
                        {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                          const text = quiz.choices[opt];
                          const isSelected = item.selectedChoice === opt;
                          const isCorrect = quiz.answer === opt;
                          const bg = isAnswered
                            ? (isCorrect && isSelected ? 'bg-green-100 border-green-400' : (isSelected ? 'bg-red-100 border-red-400' : 'bg-white border-gray-200'))
                            : 'bg-white border-gray-200 hover:bg-gray-100';
                          const textColor = isAnswered
                            ? (isCorrect && isSelected ? 'text-green-800' : (isSelected ? 'text-red-800' : 'text-gray-800'))
                            : 'text-gray-800';
                          
                          return (
                            <button
                              key={opt}
                              onClick={() => !isAnswered && handleSelectChoice(index, opt)}
                              disabled={isAnswered}
                              className={`w-full text-left rounded-lg border px-4 py-3 ${bg} ${textColor} transition-colors cursor-pointer font-normal disabled:cursor-default`}
                            >
                              <span className="font-semibold mr-2">{opt}.</span>{text}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* True/False */}
                    {quiz.type === 'TF' && (
                      <div className="space-y-2 mb-4">
                        {(['TRUE', 'FALSE'] as const).map((opt) => {
                          const isSelected = item.selectedChoice === opt;
                          const isCorrect = quiz.answer === opt;
                          const bg = isAnswered
                            ? (isCorrect && isSelected ? 'bg-green-100 border-green-400' : (isSelected ? 'bg-red-100 border-red-400' : 'bg-white border-gray-200'))
                            : 'bg-white border-gray-200 hover:bg-gray-100';
                          const textColor = isAnswered
                            ? (isCorrect && isSelected ? 'text-green-800' : (isSelected ? 'text-red-800' : 'text-gray-800'))
                            : 'text-gray-800';
                          
                          return (
                            <button
                              key={opt}
                              onClick={() => !isAnswered && handleSelectChoice(index, opt)}
                              disabled={isAnswered}
                              className={`w-full text-left rounded-lg border px-4 py-3 ${bg} ${textColor} transition-colors cursor-pointer font-normal disabled:cursor-default`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Answer */}
                    {quiz.type === 'SA' && (
                      <div className="mb-4">
                        <input
                          type="text"
                          value={item.userAnswer || ''}
                          onChange={(e) => handleShortAnswerChange(index, e.target.value)}
                          disabled={isAnswered}
                          placeholder="Type your answer here..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                        />
                        {!isAnswered && (
                          <button
                            onClick={() => handleShortAnswerSubmit(index)}
                            disabled={!item.userAnswer || item.userAnswer.trim() === ''}
                            className="mt-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Submit Answer
                          </button>
                        )}
                        {isAnswered && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-800">
                              <span className="font-semibold">Your Answer:</span> {item.userAnswer}
                              {quiz.answers.some(ans => ans.toLowerCase().trim() === (item.userAnswer || '').toLowerCase().trim()) 
                                ? <span className="ml-2 text-green-600 font-semibold">✓ Correct</span>
                                : <span className="ml-2 text-red-600 font-semibold">✗ Incorrect</span>
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Multi-Select */}
                    {quiz.type === 'MS' && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2 italic">Select all that apply:</p>
                        <div className="space-y-2 mb-3">
                          {Object.keys(quiz.choices).map((opt) => {
                            const text = quiz.choices[opt as keyof typeof quiz.choices];
                            const isSelected = (item.selectedChoices || []).includes(opt);
                            const isCorrect = quiz.answers.includes(opt);
                            const bg = isAnswered
                              ? (isCorrect ? 'bg-green-100 border-green-400' : (isSelected ? 'bg-red-100 border-red-400' : 'bg-white border-gray-200'))
                              : isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:bg-gray-100';
                            const textColor = isAnswered
                              ? (isCorrect ? 'text-green-800' : (isSelected ? 'text-red-800' : 'text-gray-800'))
                              : 'text-gray-800';
                            
                            return (
                              <button
                                key={opt}
                                onClick={() => !isAnswered && handleMultiSelectToggle(index, opt)}
                                disabled={isAnswered}
                                className={`w-full text-left rounded-lg border px-4 py-3 ${bg} ${textColor} transition-colors cursor-pointer font-normal disabled:cursor-default`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected || (isAnswered && isCorrect)}
                                  disabled={isAnswered}
                                  className="mr-3"
                                  readOnly
                                />
                                <span className="font-semibold mr-2">{opt}.</span>{text}
                              </button>
                            );
                          })}
                        </div>
                        {!isAnswered && (
                          <button
                            onClick={() => handleMultiSelectSubmit(index)}
                            disabled={(item.selectedChoices || []).length === 0}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            Submit Answers
                          </button>
                        )}
                      </div>
                    )}

                    {isAnswered && (
                      <>
                        <button
                          onClick={() => toggleExplanation(index)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 mb-3"
                        >
                          {item.showExplanation ? "Hide Explanation" : "Reveal Explanation"}
                        </button>
                        {item.showExplanation && (
                          <div className="rounded bg-white p-3 border border-blue-200">
                            <p className="text-sm text-gray-800">
                              <span className="font-semibold">Correct Answer:</span>{' '}
                              {quiz.type === 'MC' || quiz.type === 'TF' ? quiz.answer : 
                               quiz.type === 'SA' ? quiz.answers.join(', ') : 
                               quiz.answers.join(', ')}
                            </p>
                            <p className="text-sm text-gray-800 mt-2"><span className="font-semibold">Explanation:</span> {quiz.explanation}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Generate Button */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="mb-3">
            <label className="block text-sm font-semibold text-gray-800 mb-2">Question Types:</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              <div>
                <label className="text-xs text-gray-600">MC</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={questionTypes.MC}
                  onChange={(e) => setQuestionTypes({...questionTypes, MC: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">TF</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={questionTypes.TF}
                  onChange={(e) => setQuestionTypes({...questionTypes, TF: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">SA</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={questionTypes.SA}
                  onChange={(e) => setQuestionTypes({...questionTypes, SA: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">MS</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={questionTypes.MS}
                  onChange={(e) => setQuestionTypes({...questionTypes, MS: Math.max(0, Math.min(20, parseInt(e.target.value) || 0))})}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-gray-800 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">Total: {questionTypes.MC + questionTypes.TF + questionTypes.SA + questionTypes.MS} questions</p>
          </div>
          <div className="flex gap-2 mb-3">
            <button
              onClick={generateQuiz}
              disabled={isGenerating || selectedTopics.length === 0 || (questionTypes.MC + questionTypes.TF + questionTypes.SA + questionTypes.MS) === 0}
              className="flex-1 rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? "Generating..." : "Generate New Quiz"}
            </button>
            <button
              onClick={() => {
                if (moduleId) {
                  try { localStorage.removeItem(`saved_quiz_module_${moduleId}`); } catch (e) {}
                }
                setQuizzes([]);
                setScore(0);
                setTotalAttempts(0);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100"
            >
              Clear Quiz
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

function QuizPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="text-gray-600">Loading quiz...</div></div>}>
      <QuizPage />
    </Suspense>
  );
}

export default QuizPageWrapper;