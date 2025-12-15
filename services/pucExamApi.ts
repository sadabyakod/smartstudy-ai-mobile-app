import { API_BASE_URL, getUserFriendlyErrorMessage, fetchWithTimeout as baseFetchWithTimeout, ERROR_MESSAGES } from "../config/api";

// Types for Karnataka 2nd PUC Exam Generator

export interface GenerateExamRequest {
  subject: string;
  grade: string;
  chapter?: string;
  difficulty?: string;
  examType?: string;
}

export interface SubPart {
  partLabel: string;
  questionText: string;
  correctAnswer: string;
}

export interface ExamQuestion {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  topic: string;
  subParts?: SubPart[];
}

export interface ExamPart {
  partName: string;
  partDescription: string;
  questionType: string;
  marksPerQuestion: number;
  totalQuestions: number;
  questionsToAnswer: number;
  questions: ExamQuestion[];
}

export interface GeneratedExam {
  examId: string;
  subject: string;
  grade: string;
  chapter: string;
  difficulty: string;
  examType: string;
  totalMarks: number;
  duration: number;
  instructions: string[];
  parts: ExamPart[];
  questionCount: number;
  createdAt: string;
}

// Answer submission types
export interface McqAnswer {
  questionId: string;
  selectedOption: string;
}

export interface McqSubmissionRequest {
  examId: string;
  studentId: string;
  answers: McqAnswer[];
}

export interface McqSubmissionResult {
  mcqSubmissionId: string;
  score: number;
  totalMarks: number;
  percentage: number;
  results: {
    questionId: string;
    selectedOption: string;
    correctOption: string;
    isCorrect: boolean;
    marksAwarded: number;
  }[];
}

export interface WrittenSubmissionResult {
  writtenSubmissionId: string;
  status: "PendingEvaluation" | "Completed" | "Failed";
  message: string;
}

// Submission status polling types
export type SubmissionStatus = 
  | "PendingEvaluation" 
  | "OcrProcessing" 
  | "Evaluating" 
  | "Completed" 
  | "Failed";

export interface SubmissionStatusResponse {
  writtenSubmissionId: string;
  status: SubmissionStatus;
  statusMessage: string;
  submittedAt: string;
  evaluatedAt: string | null;
  isComplete: boolean;
  examId: string;
  studentId: string;
  result: ExamResult | null;
}

export interface McqQuestionResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  studentAnswer?: string;
  isCorrect: boolean;
  marks: number;
}

// Step-by-step analysis for subjective answers (matches API response)
export interface StepAnalysisItem {
  step?: number;           // Step number from API
  stepNumber?: number;     // Alternative field name
  description: string;
  isCorrect?: boolean;
  marks?: number;          // Alternative field name
  marksAwarded?: number;   // API field name
  maxMarks?: number;       // Alternative field name
  maxMarksForStep?: number; // API field name
  feedback?: string;
}

export interface SubjectiveResult {
  questionId: string;
  questionNumber: number;
  questionText?: string;
  earnedMarks: number;
  maxMarks: number;
  score?: number; // Alternative name for earnedMarks
  isFullyCorrect?: boolean; // From API - true if answer is complete
  expectedAnswer: string;
  studentAnswer?: string;
  studentAnswerEcho?: string; // API field for extracted student answer
  stepAnalysis?: StepAnalysisItem[];
  overallFeedback: string;
  feedback?: string; // Alternative name for overallFeedback
  improvementSuggestions?: string;
  isComplete?: boolean; // Indicates if answer was fully complete
}

export interface ExamResult {
  examId: string;
  studentId: string;
  examTitle?: string; // From API
  mcqScore: number;
  mcqTotalMarks: number;
  subjectiveScore: number;
  subjectiveTotalMarks: number;
  grandScore: number;
  grandTotalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  evaluatedAt?: string; // From API
  mcqResults?: McqQuestionResult[];
  subjectiveResults: SubjectiveResult[];
}

// Legacy types for backward compatibility
export interface AnswerSubmission {
  questionId: string;
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  maxMarks: number;
  textAnswer?: string;
  imageUri?: string; // Local URI for image file
}

export interface AnswerEvaluationResult {
  questionId: string;
  questionNumber: number;
  score: number;
  maxMarks: number;
  feedback: string;
  isCorrect: boolean;
  extractedText?: string; // Text extracted from image by OCR
}

export interface ExamSubmissionResult {
  examId: string;
  totalScore: number;
  totalMaxScore: number;
  percentage: number;
  grade: string;
  questionsAnswered: number;
  totalQuestions: number;
  results: AnswerEvaluationResult[];
  evaluatedAt: string;
}

// Supported subjects for Karnataka 2nd PUC
export const PUC_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Computer Science",
  "Electronics",
];

// Supported grades
export const PUC_GRADES = [
  "2nd PUC",
  "1st PUC",
  "Class 12",
  "Class 11",
];

// Custom error class for API errors
export class ApiError extends Error {
  public statusCode: number;
  public isNetworkError: boolean;
  public isTimeout: boolean;
  public userMessage: string;
  
  constructor(message: string, statusCode: number = 0, isNetworkError: boolean = false, isTimeout: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
    // Provide user-friendly message based on error type
    if (isNetworkError) {
      this.userMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (isTimeout) {
      this.userMessage = ERROR_MESSAGES.TIMEOUT_ERROR;
    } else if (statusCode >= 500) {
      this.userMessage = ERROR_MESSAGES.SERVER_ERROR;
    } else {
      this.userMessage = message;
    }
  }
}

// Helper to create fetch with timeout - uses centralized fetchWithTimeout from api.ts
async function pucFetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  try {
    return await baseFetchWithTimeout(url, options, timeoutMs);
  } catch (error: any) {
    if (error.message?.includes('timeout') || error.message?.includes('aborted')) {
      throw new ApiError(ERROR_MESSAGES.TIMEOUT_ERROR, 0, false, true);
    }
    throw error;
  }
}

/**
 * Generate a Karnataka 2nd PUC Model Question Paper
 * This endpoint uses AI to generate a complete exam paper with all parts
 */
export async function generatePUCExam(
  request: GenerateExamRequest
): Promise<GeneratedExam> {
  try {
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/generate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      },
      120000 // 2 minutes timeout for exam generation (AI takes time)
    );

    if (!response.ok) {
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Unable to resolve host')) {
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0, true);
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error));
  }
}

// Helper to check if a question is MCQ
export function isMCQ(question: ExamQuestion): boolean {
  return question.options !== null && question.options !== undefined && question.options.length > 0;
}

// Helper to check if a question has sub-parts
export function hasSubParts(question: ExamQuestion): boolean {
  return question.subParts !== null && question.subParts !== undefined && question.subParts.length > 0;
}

// Format duration in minutes to hours and minutes string
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours}h ${mins}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  }
  return `${mins}m`;
}

/**
 * Submit exam answers for AI evaluation
 * Supports both text answers and image uploads of handwritten answers
 */
export async function submitExamAnswers(
  examId: string,
  answers: AnswerSubmission[]
): Promise<ExamSubmissionResult> {
  try {
    const formData = new FormData();
    formData.append("examId", examId);
    
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      formData.append(`answers[${i}].questionId`, answer.questionId);
      formData.append(`answers[${i}].questionNumber`, answer.questionNumber.toString());
      formData.append(`answers[${i}].questionText`, answer.questionText);
      formData.append(`answers[${i}].correctAnswer`, answer.correctAnswer);
      formData.append(`answers[${i}].maxMarks`, answer.maxMarks.toString());
      
      if (answer.textAnswer) {
        formData.append(`answers[${i}].textAnswer`, answer.textAnswer);
      }
      
      if (answer.imageUri) {
        const filename = answer.imageUri.split('/').pop() || `answer_${answer.questionId}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append(`answers[${i}].imageFile`, {
          uri: answer.imageUri,
          name: filename,
          type: type,
        } as any);
      }
    }
    
    const response = await pucFetchWithTimeout(`${API_BASE_URL}/api/exam/submit`, {
      method: "POST",
      body: formData,
    }, 60000);

    if (!response.ok) {
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get grade color based on grade string
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#22C55E'; // green
    case 'B+':
    case 'B':
      return '#3B82F6'; // blue
    case 'C':
      return '#F97316'; // orange
    case 'D':
      return '#EA580C'; // deep orange
    default:
      return '#EF4444'; // red
  }
}

/**
 * Get grade description
 */
export function getGradeDescription(grade: string): string {
  switch (grade) {
    case 'A+': return 'Outstanding!';
    case 'A': return 'Excellent!';
    case 'B+': return 'Very Good';
    case 'B': return 'Good';
    case 'C': return 'Average';
    case 'D': return 'Below Average';
    default: return 'Needs Improvement';
  }
}

/**
 * Submit MCQ answers for instant evaluation
 */
export async function submitMcqAnswers(
  examId: string,
  studentId: string,
  answers: McqAnswer[]
): Promise<McqSubmissionResult> {
  try {
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/submit-mcq`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId,
          studentId,
          answers,
        }),
      },
      30000
    );

    if (!response.ok) {
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0, 
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Upload written/subjective answers for AI evaluation
 * Supports image uploads of handwritten answers
 */
export async function uploadWrittenAnswers(
  examId: string,
  studentId: string,
  imageUris: string[]
): Promise<WrittenSubmissionResult> {
  try {
    const formData = new FormData();
    formData.append("examId", examId);
    formData.append("studentId", studentId);
    
    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];
      
      if (uri.startsWith('blob:') || uri.startsWith('data:')) {
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `written_answer_${i}.jpg`;
        formData.append("files", blob, filename);
      } else {
        const filename = uri.split('/').pop() || `written_answer_${i}.jpg`;
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append("files", {
          uri: uri,
          name: filename,
          type: type,
        } as any);
      }
    }
    
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/upload-written`,
      {
        method: "POST",
        body: formData,
      },
      15000 // API now returns immediately (<1 second), reduced from 60s
    );

    if (!response.ok) {
      // Handle specific error codes
      if (response.status === 409) {
        throw new ApiError(
          'You have already submitted answers for this exam. Duplicate submissions are not allowed.',
          409,
          false,
          false
        );
      }
      if (response.status === 400) {
        let errorMessage = 'Invalid file. Please check file type (jpg, jpeg, png, webp, pdf) and size (max 10MB per file, max 20 files).';
        try {
          const errorBody = await response.json();
          if (errorBody?.message) {
            errorMessage = errorBody.message;
          }
        } catch {}
        throw new ApiError(errorMessage, 400);
      }
      if (response.status === 404) {
        throw new ApiError('Exam not found. Please generate a new exam and try again.', 404);
      }
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    const result = await response.json();
    
    return result;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Get full exam results including MCQ and subjective scores
 */
export async function getExamResults(
  examId: string,
  studentId: string
): Promise<ExamResult> {
  try {
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/result/${examId}/${studentId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      30000
    );

    if (!response.ok) {
      throw new ApiError(
        "Results are not available yet. Please wait a moment and try again.",
        response.status
      );
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Check the status of a written submission evaluation
 * Use this to poll for evaluation progress and get results when complete
 * 
 * @param writtenSubmissionId The ID returned when answer sheet was uploaded
 * @returns Status information, includes full results when isComplete is true
 */
export async function checkSubmissionStatus(
  writtenSubmissionId: string
): Promise<SubmissionStatusResponse> {
  try {
    const response = await pucFetchWithTimeout(
      `${API_BASE_URL}/api/exam/submission-status/${writtenSubmissionId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      30000
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new ApiError(
          'Submission not found. Please check and try again.',
          404
        );
      }
      throw new ApiError(ERROR_MESSAGES.SERVER_ERROR, response.status);
    }

    return await response.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(getUserFriendlyErrorMessage(error), 0,
      error.message?.includes('Network') || error.message?.includes('fetch'));
  }
}

/**
 * Poll for submission status until evaluation is complete
 * Automatically checks every 5 seconds for up to 10 minutes
 * 
 * @param writtenSubmissionId The ID returned when answer sheet was uploaded
 * @param onStatusUpdate Callback function called on each status update
 * @param pollInterval Interval in milliseconds (default: 5000 = 5 seconds)
 * @param maxAttempts Maximum number of polling attempts (default: 120 = 10 minutes)
 * @returns Promise that resolves when evaluation is complete with full results
 */
export async function pollSubmissionStatus(
  writtenSubmissionId: string,
  onStatusUpdate: (status: SubmissionStatusResponse) => void,
  pollInterval: number = 3000, // Poll every 3 seconds (updated from 5s)
  maxAttempts: number = 100 // 100 attempts × 3s = 5 minutes max (updated from 10 min)
): Promise<SubmissionStatusResponse> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const poll = async () => {
      try {
        attempts++;
        
        const statusData = await checkSubmissionStatus(writtenSubmissionId);
        
        // Call the status update callback
        onStatusUpdate(statusData);
        
        // Check if evaluation is complete
        if (statusData.isComplete) {
          clearInterval(pollIntervalId);
          resolve(statusData);
          return;
        }
        
        // Check if max attempts reached
        if (attempts >= maxAttempts) {
          clearInterval(pollIntervalId);
          reject(new ApiError(
            'Evaluation is taking longer than expected. Please check back later.',
            0,
            false,
            true
          ));
          return;
        }
        
      } catch (error) {
        clearInterval(pollIntervalId);
        reject(error);
      }
    };
    
    // Start polling immediately
    poll();
    
    // Then poll at regular intervals
    const pollIntervalId = setInterval(poll, pollInterval);
  });
}

/**
 * Generate a unique student ID for the current device/session
 */
export function generateStudentId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `STU-${timestamp}-${randomPart}`.toUpperCase();
}
