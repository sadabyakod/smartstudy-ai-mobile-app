import { EXAM_ENDPOINTS } from "../config/api";

export type QuestionType = "MultipleChoice" | "TrueFalse" | "ShortAnswer";
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";
export type ExamStatus = "InProgress" | "Completed" | "Cancelled";

export interface ExamTemplateRequest {
  name: string;
  subject: string;
  chapter: string;
  totalQuestions: number;
  durationMinutes: number;
  adaptiveEnabled: boolean;
}

export interface ExamTemplateResponse extends ExamTemplateRequest {
  id: number;
  createdAt: string;
}

export interface ExamOption {
  optionId: number;
  optionText: string;
}

export interface ExamQuestion {
  id: number;
  subject: string;
  chapter: string;
  topic: string;
  text: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  options: ExamOption[];
}

export interface StartExamRequest {
  studentId: string;
  examTemplateId: number;
}

export interface StartExamResponse {
  attemptId: number;
  template: ExamTemplateResponse;
  firstQuestion: ExamQuestion;
}

export interface SubmitAnswerRequest {
  questionId: number;
  selectedOptionId: number | null;
  freeTextAnswer: string | null;
  timeTakenSeconds: number;
}

export interface DifficultyStats {
  attempted: number;
  correct: number;
  accuracy: number;
}

export interface DifficultyBreakdown {
  Easy: DifficultyStats;
  Medium: DifficultyStats;
  Hard: DifficultyStats;
}

export interface SubmitAnswerResponse {
  isCorrect: boolean | null;
  isCompleted: boolean;
  nextQuestion: ExamQuestion | null;
  currentStats: {
    answeredCount: number;
    correctCount: number;
    wrongCount: number;
    currentAccuracy: number;
    difficultyBreakdown: DifficultyBreakdown;
  };
}

export interface ExamSummaryAnswerLogEntry {
  questionId: number;
  questionText: string;
  selectedOptionId: number | null;
  correctOptionId: number | null;
  isCorrect: boolean | null;
  timeTakenSeconds: number;
}

export interface ExamSummaryResponse {
  attemptId: number;
  studentId: string;
  template: ExamTemplateResponse;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  startedAt: string;
  completedAt: string;
  status: ExamStatus;
  perDifficultyStats: DifficultyBreakdown;
  answerLog: ExamSummaryAnswerLogEntry[];
}

export interface ExamHistoryEntry {
  attemptId: number;
  studentId: string;
  examTemplateId: number;
  examName: string;
  subject: string;
  chapter: string;
  scorePercent: number;
  correctCount: number;
  wrongCount: number;
  totalQuestions: number;
  status: ExamStatus;
  startedAt: string;
  completedAt: string;
}

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const raw = await response.text();
  if (!raw) {
    return {} as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new ApiError(response.status, `Failed to parse JSON: ${raw}`);
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers ?? {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    try {
      const body = await parseJson<{ message?: string; error?: string }>(
        response
      );
      message = body?.message || body?.error || message;
    } catch {
      // Body was not JSON, keep default message.
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return parseJson<T>(response);
}

export async function createExamTemplate(
  payload: ExamTemplateRequest
): Promise<ExamTemplateResponse> {
  return request<ExamTemplateResponse>(EXAM_ENDPOINTS.createTemplate, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function startExam(
  payload: StartExamRequest
): Promise<StartExamResponse> {
  return request<StartExamResponse>(EXAM_ENDPOINTS.startExam, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function submitExamAnswer(
  attemptId: number,
  payload: SubmitAnswerRequest
): Promise<SubmitAnswerResponse> {
  return request<SubmitAnswerResponse>(EXAM_ENDPOINTS.submitAnswer(attemptId), {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getExamSummary(
  attemptId: number
): Promise<ExamSummaryResponse> {
  return request<ExamSummaryResponse>(EXAM_ENDPOINTS.getSummary(attemptId));
}

export async function getExamHistory(
  studentId: string
): Promise<ExamHistoryEntry[]> {
  return request<ExamHistoryEntry[]>(EXAM_ENDPOINTS.getHistory(studentId));
}

export { ApiError };
