import { EXAM_ENDPOINTS, getUserFriendlyErrorMessage, fetchWithTimeout, ERROR_MESSAGES } from "../config/api";

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
  attemptId: number;
  questionId: number;
  answer: string | number | null;
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
  userMessage: string;
  constructor(status: number, message: string, userMessage?: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
    this.userMessage = userMessage || getUserFriendlyErrorMessage(new Error(message));
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
    throw new ApiError(response.status, `Failed to parse JSON: ${raw}`, ERROR_MESSAGES.SERVER_ERROR);
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

  try {
    const response = await fetchWithTimeout(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let message = response.statusText || "Request failed";
      let userMessage = ERROR_MESSAGES.UNKNOWN_ERROR;
      
      if (response.status >= 500) {
        userMessage = ERROR_MESSAGES.SERVER_ERROR;
      } else if (response.status === 404) {
        userMessage = "The requested resource was not found. Please try again.";
      } else if (response.status === 401 || response.status === 403) {
        userMessage = "You don't have permission to access this resource.";
      }
      
      try {
        const body = await parseJson<{ message?: string; error?: string }>(
          response
        );
        message = body?.message || body?.error || message;
      } catch {
        // Body was not JSON, keep default message.
      }
      throw new ApiError(response.status, message, userMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return parseJson<T>(response);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(0, String(error), getUserFriendlyErrorMessage(error));
  }
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
    body: JSON.stringify({
      attemptId: payload.attemptId,
      questionId: payload.questionId,
      answer: payload.answer,
      timeTakenSeconds: payload.timeTakenSeconds,
    }),
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
