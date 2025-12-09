import { API_BASE_URL } from "../config/api";

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

export interface SubjectiveResult {
  questionId: string;
  questionNumber: number;
  questionText?: string;
  earnedMarks: number;
  maxMarks: number;
  score?: number; // Alternative name for earnedMarks
  expectedAnswer: string;
  studentAnswer?: string;
  stepAnalysis?: any[];
  overallFeedback: string;
  feedback?: string; // Alternative name for overallFeedback
  improvementSuggestions?: string;
}

export interface ExamResult {
  examId: string;
  studentId: string;
  mcqScore: number;
  mcqTotalMarks: number;
  subjectiveScore: number;
  subjectiveTotalMarks: number;
  grandScore: number;
  grandTotalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
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
  
  constructor(message: string, statusCode: number = 0, isNetworkError: boolean = false, isTimeout: boolean = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isNetworkError = isNetworkError;
    this.isTimeout = isTimeout;
  }
}

// Helper to create fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your internet connection and try again.', 0, false, true);
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
    console.log("Generating PUC Exam:", request);
    
    const response = await fetchWithTimeout(
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

    console.log("Generate exam response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Generate exam error:", errorText);
      throw new ApiError(
        `Server error (${response.status}). Please try again later.`,
        response.status
      );
    }

    const exam = await response.json();
    console.log("Exam generated:", exam.examId);
    
    return exam;
  } catch (error: any) {
    console.error("Generate PUC exam error:", error);
    
    // Already an ApiError, re-throw
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Network error (no internet, server down, etc.)
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('Unable to resolve host')) {
      throw new ApiError(
        'Cannot connect to server. Please check:\n• Your internet connection\n• That you are on the same WiFi network as the server\n• The server is running',
        0,
        true
      );
    }
    
    throw new ApiError(error.message || 'Unknown error occurred. Please try again.');
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
    console.log("Submitting exam answers:", examId, answers.length, "answers");
    
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
        // Create file object from URI for React Native
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
    
    const response = await fetch(`${API_BASE_URL}/api/exam/submit`, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - let fetch set it with boundary for multipart
    });

    console.log("Submit exam response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Submit exam error:", errorText);
      throw new Error(`Failed to submit exam: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Exam evaluated:", result.examId, "Score:", result.totalScore);
    
    return result;
  } catch (error) {
    console.error("Submit exam error:", error);
    throw error;
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
    console.log("Submitting MCQ answers:", examId, answers.length, "answers");
    
    const response = await fetchWithTimeout(
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
      30000 // 30 seconds timeout
    );

    console.log("Submit MCQ response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Submit MCQ error:", errorText);
      throw new ApiError(
        `Failed to submit MCQ answers (${response.status}). Please try again.`,
        response.status
      );
    }

    const result = await response.json();
    console.log("MCQ evaluated:", result.mcqSubmissionId, "Score:", result.score);
    
    return result;
  } catch (error: any) {
    console.error("Submit MCQ error:", error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch')) {
      throw new ApiError(
        'Cannot connect to server. Please check your internet connection.',
        0,
        true
      );
    }
    
    throw new ApiError(error.message || 'Failed to submit MCQ answers. Please try again.');
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
    console.log("Uploading written answers:", examId, imageUris.length, "images");
    
    const formData = new FormData();
    formData.append("examId", examId);
    formData.append("studentId", studentId);
    
    for (let i = 0; i < imageUris.length; i++) {
      const uri = imageUris[i];
      
      // Check if running in web environment (blob: or data: URI)
      if (uri.startsWith('blob:') || uri.startsWith('data:')) {
        // Web environment: fetch the blob and append as file
        const response = await fetch(uri);
        const blob = await response.blob();
        const filename = `written_answer_${i}.jpg`;
        formData.append("files", blob, filename);
      } else {
        // React Native environment: use uri/name/type object
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
    
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/exam/upload-written`,
      {
        method: "POST",
        body: formData,
      },
      60000 // 60 seconds timeout for image upload
    );

    console.log("Upload written response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Upload written error:", errorText);
      throw new ApiError(
        `Failed to upload answer sheets (${response.status}). Please try again.`,
        response.status
      );
    }

    const result = await response.json();
    console.log("Written answers uploaded:", result.writtenSubmissionId);
    
    return result;
  } catch (error: any) {
    console.error("Upload written error:", error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch')) {
      throw new ApiError(
        'Cannot connect to server. Please check your internet connection.',
        0,
        true
      );
    }
    
    throw new ApiError(error.message || 'Failed to upload answer sheets. Please try again.');
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
    console.log("Getting exam results:", examId, studentId);
    
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/exam/result/${examId}/${studentId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      30000 // 30 seconds timeout
    );

    console.log("Get results response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Get results error:", errorText);
      throw new ApiError(
        `Failed to get exam results (${response.status}). Results may not be ready yet.`,
        response.status
      );
    }

    const result = await response.json();
    console.log("Results retrieved:", result.examId, "Grade:", result.grade);
    
    return result;
  } catch (error: any) {
    console.error("Get results error:", error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch')) {
      throw new ApiError(
        'Cannot connect to server. Please check your internet connection.',
        0,
        true
      );
    }
    
    throw new ApiError(error.message || 'Failed to get exam results. Please try again.');
  }
}

/**
 * Generate a unique student ID for the current device/session
 */
export function generateStudentId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 8);
  return `STU-${timestamp}-${randomPart}`.toUpperCase();
}
