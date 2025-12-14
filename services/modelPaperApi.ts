import { API_BASE_URL, getUserFriendlyErrorMessage, fetchWithTimeout, ERROR_MESSAGES } from "../config/api";

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

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/exams/templates`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(templatePayload),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/exams/start`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(startPayload),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
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

    const response = await fetchWithTimeout(`${API_BASE_URL}/api/exams/${attemptId}/answer`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answerPayload),
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

// Step 4: Get exam summary
export async function getExamSummary(attemptId: number): Promise<ExamSummary> {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/exams/${attemptId}/summary`, {
      method: "GET",
      headers: { 
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      throw new Error(ERROR_MESSAGES.UNKNOWN_ERROR);
    }

    return await response.json();
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
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
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/exams/history?studentId=${encodeURIComponent(studentId)}`,
      {
        method: "GET",
        headers: { 
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error(ERROR_MESSAGES.SERVER_ERROR);
      }
      return []; // Return empty array for non-server errors
    }

    const history = await response.json();
    return history;
  } catch (error) {
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}
