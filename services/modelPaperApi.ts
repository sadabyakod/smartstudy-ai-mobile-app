import { API_BASE_URL } from "../config/api";

// Types for Template-based Exam Flow
export interface GenerateModelPaperRequest {
  subject: string;
  grade: string;
  chapter: string;
  difficulty: "Easy" | "Medium" | "Hard";
  questionCount: number;
  examType: "MCQ";
}

export interface QuestionOption {
  id: number;
  optionText: string;
}

export interface ExamQuestion {
  id: number;
  subject: string;
  chapter: string;
  topic: string;
  text: string;
  type: string;
  difficulty: string;
  options: QuestionOption[];
}

export interface ExamTemplate {
  id: number;
  name: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  durationMinutes: number;
  adaptiveEnabled: boolean;
  createdAt: string;
}

export interface StartExamResponse {
  attemptId: number;
  template: ExamTemplate;
  firstQuestion: ExamQuestion;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean;
  isCompleted: boolean;
  nextQuestion: ExamQuestion | null;
  currentStats: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    currentAccuracy: number;
  };
}

export interface ExamSummary {
  attemptId: number;
  studentId: string;
  template: ExamTemplate;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string | null;
  status: string;
}

// State for active exam
export interface ActiveExam {
  attemptId: number;
  template: ExamTemplate;
  currentQuestion: ExamQuestion;
  questionsAnswered: number;
  correctCount: number;
  wrongCount: number;
}

// Random payload generator
export function generateRandomModelPaperRequest(): GenerateModelPaperRequest {
  const subjects = ["Mathematics"];
  // Only using "Algebra" as it's the only chapter with questions in the database
  const chapters = ["Algebra"];
  const difficulties: ("Easy" | "Medium" | "Hard")[] = ["Easy", "Medium", "Hard"];
  const questionCounts = [5, 10];

  return {
    subject: subjects[Math.floor(Math.random() * subjects.length)],
    grade: "10",
    chapter: chapters[Math.floor(Math.random() * chapters.length)],
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    questionCount: questionCounts[Math.floor(Math.random() * questionCounts.length)],
    examType: "MCQ",
  };
}

// Shuffle array utility
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// API calls

// Step 1: Create exam template
export async function createExamTemplate(
  request: GenerateModelPaperRequest
): Promise<ExamTemplate> {
  try {
    const templatePayload = {
      name: `Model Paper - ${request.subject} - ${request.chapter}`,
      subject: request.subject,
      chapter: request.chapter,
      totalQuestions: request.questionCount,
      durationMinutes: request.questionCount * 2,
      adaptiveEnabled: true,
    };
    
    console.log("Creating template:", templatePayload);
    
    const response = await fetch(`${API_BASE_URL}/api/exams/templates`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
    });

    console.log("Template response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Template creation error:", errorText);
      throw new Error(`Failed to create template: ${response.status} - ${errorText}`);
    }

    const template = await response.json();
    console.log("Template created:", template);
    
    return template;
  } catch (error) {
    console.error("Create template error:", error);
    throw error;
  }
}

// Step 2: Start exam
export async function startExam(
  templateId: number,
  studentId: string = "model-paper-student"
): Promise<StartExamResponse> {
  try {
    const startPayload = {
      studentId,
      examTemplateId: templateId,
    };
    
    console.log("Starting exam:", startPayload);
    
    const response = await fetch(`${API_BASE_URL}/api/exams/start`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(startPayload),
    });

    console.log("Start exam response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Start exam error:", errorText);
      throw new Error(`Failed to start exam: ${response.status} - ${errorText}`);
    }

    const examData = await response.json();
    console.log("Exam started:", examData);
    
    return examData;
  } catch (error) {
    console.error("Start exam error:", error);
    throw error;
  }
}

// Step 3: Submit answer and get next question
export async function submitAnswer(
  attemptId: number,
  questionId: number,
  selectedOptionId: number,
  timeTakenSeconds: number = 30
): Promise<SubmitAnswerResponse> {
  try {
    const answerPayload = {
      questionId,
      selectedOptionId,
      timeTakenSeconds,
    };
    
    console.log("Submitting answer:", answerPayload);
    
    const response = await fetch(`${API_BASE_URL}/api/exams/${attemptId}/answer`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answerPayload),
    });

    console.log("Submit answer response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Submit answer error:", errorText);
      throw new Error(`Failed to submit answer: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Answer result:", result);
    
    return result;
  } catch (error) {
    console.error("Submit answer error:", error);
    throw error;
  }
}

// Step 4: Get exam summary
export async function getExamSummary(attemptId: number): Promise<ExamSummary> {
  try {
    console.log("Getting exam summary for attemptId:", attemptId);
    
    const response = await fetch(`${API_BASE_URL}/api/exams/${attemptId}/summary`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
      },
    });

    console.log("Summary response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Get summary error:", errorText);
      throw new Error(`Failed to get summary: ${response.status} - ${errorText}`);
    }

    const summary = await response.json();
    console.log("Exam summary:", summary);
    
    return summary;
  } catch (error) {
    console.error("Get summary error:", error);
    throw error;
  }
}

// Exam History interface
export interface ExamHistory {
  attemptId: number;
  examName: string;
  subject: string;
  chapter: string;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

// Step 5: Get exam history for a student
export async function getExamHistory(
  studentId: string = "model-paper-student"
): Promise<ExamHistory[]> {
  try {
    console.log("Getting exam history for studentId:", studentId);
    
    const response = await fetch(
      `${API_BASE_URL}/api/exams/history?studentId=${encodeURIComponent(studentId)}`,
      {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
        },
      }
    );

    console.log("History response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Get history error:", errorText);
      throw new Error(`Failed to get history: ${response.status} - ${errorText}`);
    }

    const history = await response.json();
    console.log("Exam history:", history);
    
    return history;
  } catch (error) {
    console.error("Get history error:", error);
    throw error;
  }
}
