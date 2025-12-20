import { API_BASE_URL, getUserFriendlyErrorMessage } from '../config/api';

export interface UploadAnswerSheetParams {
  examId: string;
  studentId: string;
  files: {
    uri: string;
    type: string;
    name: string;
  }[];
}

export interface UploadAnswerSheetResponse {
  writtenSubmissionId: string;
  status: 'PendingEvaluation' | 'OcrProcessing' | 'Evaluating' | 'Completed' | 'Failed';
  message: string;
  blobPaths: string[];
  examId: string;
  studentId: string;
  queuedForProcessing: boolean;
}

export interface SubmissionStatus {
  writtenSubmissionId: string;
  status: 'PendingEvaluation' | 'OcrProcessing' | 'Evaluating' | 'Completed' | 'Failed';
  statusMessage: string;
  submittedAt: string;
  evaluatedAt: string | null;
  isComplete: boolean;
  examId: string;
  studentId: string;
  evaluationResultBlobPath: string | null;
  result?: {
    examId: string;
    studentId: string;
    examTitle: string;
    grandScore: number;
    grandTotalMarks: number;
    percentage: number;
    grade: string;
    passed: boolean;
  };
}

export interface StepAnalysis {
  step: number;
  description: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarksForStep: number;
  feedback: string;
}

export interface SubjectiveResult {
  questionId: string;
  questionNumber: number;
  questionText: string;
  earnedMarks: number;
  maxMarks: number;
  isFullyCorrect: boolean;
  expectedAnswer: string;
  studentAnswerEcho: string;
  stepAnalysis: StepAnalysis[];
  overallFeedback: string;
}

export interface MCQResult {
  questionId: string;
  questionNumber?: number;
  questionText?: string;
  selectedOption: string;
  correctAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks?: number;
  options?: string[];
}

export interface EvaluationResult {
  examId: string;
  studentId: string;
  examTitle: string;
  mcqScore: number;
  mcqTotalMarks: number;
  mcqResults: MCQResult[];
  subjectiveScore: number;
  subjectiveTotalMarks: number;
  subjectiveResults: SubjectiveResult[];
  grandScore: number;
  grandTotalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  evaluatedAt: string;
}

/**
 * Normalize API response to handle different field naming conventions
 * 
 * New format (preferred): mcqResults[], subjectiveResults[] with stepAnalysis
 * Full evaluation response: totalScore, maxScore, questionEvaluations (MCQ + subjective), rubricBreakdown
 * MCQ-only response: score, totalMarks, results (MCQ only)
 * 
 * Frontend expects: grandScore, grandTotalMarks, mcqResults, subjectiveResults, stepAnalysis
 */
function normalizeEvaluationResult(data: any): EvaluationResult {
  // Check for new format first - has separate mcqResults and subjectiveResults arrays
  const hasNewFormat = (data.mcqResults && Array.isArray(data.mcqResults)) || 
                       (data.subjectiveResults && Array.isArray(data.subjectiveResults));
  
  // Detect if this is an MCQ-only response (has 'score' and 'results' at top level)
  const isMcqOnlyResponse = data.results && Array.isArray(data.results) && !data.questionEvaluations && !hasNewFormat;
  
  let mcqResults: any[] = [];
  let subjectiveResults: any[] = [];
  
  if (hasNewFormat) {
    // New API format with separate mcqResults and subjectiveResults arrays
    console.log('\n📊 [NORMALIZE] Detected NEW format with mcqResults/subjectiveResults arrays');
    console.log('📊 [NORMALIZE] MCQ Results:', (data.mcqResults || []).length, 'items');
    console.log('📊 [NORMALIZE] Subjective Results:', (data.subjectiveResults || []).length, 'items');
    
    // Map MCQ results
    mcqResults = (data.mcqResults || []).map((m: any) => ({
      questionId: m.questionId || m.QuestionId || '',
      questionNumber: m.questionNumber ?? m.QuestionNumber ?? 0,
      questionText: m.questionText || m.QuestionText || '',
      selectedOption: m.selectedOption || m.SelectedOption || '',
      correctAnswer: m.correctAnswer || m.CorrectAnswer || '',
      isCorrect: m.isCorrect ?? m.IsCorrect ?? false,
      marksAwarded: m.marksAwarded ?? m.MarksAwarded ?? (m.isCorrect ? 1 : 0),
      maxMarks: m.maxMarks ?? m.MaxMarks ?? 1,
      options: m.options || m.Options || [],
    }));
    
    // Map Subjective results with stepAnalysis
    subjectiveResults = (data.subjectiveResults || []).map((s: any) => ({
      questionId: s.questionId || s.QuestionId || '',
      questionNumber: s.questionNumber ?? s.QuestionNumber ?? 0,
      questionText: s.questionText || s.QuestionText || '',
      earnedMarks: s.earnedMarks ?? s.EarnedMarks ?? s.awardedScore ?? s.AwardedScore ?? 0,
      maxMarks: s.maxMarks ?? s.MaxMarks ?? s.maxScore ?? s.MaxScore ?? 0,
      isFullyCorrect: s.isFullyCorrect ?? s.IsFullyCorrect ?? false,
      expectedAnswer: s.expectedAnswer || s.ExpectedAnswer || s.modelAnswer || s.ModelAnswer || '',
      studentAnswerEcho: s.studentAnswerEcho || s.StudentAnswerEcho || s.extractedAnswer || s.ExtractedAnswer || '',
      overallFeedback: s.overallFeedback || s.OverallFeedback || s.feedback || s.Feedback || '',
      stepAnalysis: (s.stepAnalysis || s.StepAnalysis || []).map((step: any, idx: number) => ({
        step: step.step ?? step.Step ?? idx + 1,
        description: step.description || step.Description || `Step ${idx + 1}`,
        isCorrect: step.isCorrect ?? step.IsCorrect ?? false,
        marksAwarded: step.marksAwarded ?? step.MarksAwarded ?? 0,
        maxMarksForStep: step.maxMarksForStep ?? step.MaxMarksForStep ?? 1,
        feedback: step.feedback || step.Feedback || '',
      })),
    }));
  } else if (isMcqOnlyResponse) {
    // MCQ-only response format
    console.log('\n📊 [NORMALIZE] Detected MCQ-only response format');
    console.log('📊 [NORMALIZE] MCQ Results array:', data.results?.length || 0, 'items');
    mcqResults = (data.results || []).map((m: any) => ({
      questionId: m.questionId || m.QuestionId || '',
      questionNumber: m.questionNumber ?? m.QuestionNumber ?? 0,
      questionText: m.questionText || m.QuestionText || '',
      selectedOption: m.selectedOption || m.SelectedOption || '',
      correctAnswer: m.correctAnswer || m.CorrectAnswer || '',
      isCorrect: m.isCorrect ?? m.IsCorrect ?? false,
      marksAwarded: m.marksAwarded ?? m.MarksAwarded ?? (m.isCorrect ? 1 : 0),
      maxMarks: 1,
      options: m.options || m.Options || [],
    }));
  } else {
    // Full evaluation response with questionEvaluations
    console.log('\n📊 [NORMALIZE] Detected full evaluation response format');
    console.log('📊 [NORMALIZE] Question Evaluations:', (data.questionEvaluations || data.QuestionEvaluations || []).length, 'items');
    
    // Handle questionEvaluations -> split into MCQ and subjective based on rubricBreakdown presence
    const questionEvaluations = data.questionEvaluations || data.QuestionEvaluations || [];
    
    for (const q of questionEvaluations) {
      const hasRubric = q.rubricBreakdown || q.RubricBreakdown;
      const isSubjective = hasRubric || (q.maxScore ?? q.MaxScore ?? 0) > 1;
      
      if (isSubjective) {
        // Subjective question
        // Parse rubricBreakdown if it's a JSON string
        let rubricBreakdown = q.rubricBreakdown || q.RubricBreakdown || q.stepAnalysis || q.StepAnalysis || [];
        if (typeof rubricBreakdown === 'string') {
          try {
            rubricBreakdown = JSON.parse(rubricBreakdown);
            if (rubricBreakdown && !Array.isArray(rubricBreakdown)) {
              // If it's an object, try to convert to array
              rubricBreakdown = Object.values(rubricBreakdown);
            }
          } catch (e) {
            console.log('⚠️ [NORMALIZE] Could not parse rubricBreakdown string:', rubricBreakdown);
            rubricBreakdown = [];
          }
        }
        if (!Array.isArray(rubricBreakdown)) {
          rubricBreakdown = [];
        }
        
        subjectiveResults.push({
          questionId: q.questionId || q.QuestionId || '',
          questionNumber: q.questionNumber ?? q.QuestionNumber ?? 0,
          questionText: q.questionText || q.QuestionText || '',
          earnedMarks: q.awardedScore ?? q.AwardedScore ?? q.earnedMarks ?? q.EarnedMarks ?? 0,
          maxMarks: q.maxScore ?? q.MaxScore ?? q.maxMarks ?? q.MaxMarks ?? 0,
          isFullyCorrect: (q.awardedScore ?? q.AwardedScore ?? 0) >= (q.maxScore ?? q.MaxScore ?? 0),
          expectedAnswer: q.modelAnswer || q.ModelAnswer || q.expectedAnswer || q.ExpectedAnswer || '',
          studentAnswerEcho: q.extractedAnswer || q.studentAnswer || q.StudentAnswer || q.studentAnswerEcho || q.StudentAnswerEcho || q.ExtractedAnswer || '',
          overallFeedback: q.feedback || q.Feedback || q.overallFeedback || q.OverallFeedback || '',
          // Map rubricBreakdown -> stepAnalysis
          stepAnalysis: rubricBreakdown.map((r: any, idx: number) => ({
            step: idx + 1,
            description: r.criterion || r.Criterion || r.description || r.Description || `Step ${idx + 1}`,
            isCorrect: (r.awarded ?? r.Awarded ?? 0) > 0,
            marksAwarded: r.awarded ?? r.Awarded ?? r.marksAwarded ?? r.MarksAwarded ?? 0,
            maxMarksForStep: r.maxMarks ?? r.MaxMarks ?? r.maxMarksForStep ?? r.MaxMarksForStep ?? 0,
            feedback: r.criterion || r.Criterion || r.feedback || r.Feedback || '',
          })),
        });
      } else {
        // MCQ question (no rubric, maxScore = 1)
        mcqResults.push({
          questionId: q.questionId || q.QuestionId || '',
          questionNumber: q.questionNumber ?? q.QuestionNumber ?? 0,
          questionText: q.questionText || q.QuestionText || '',
          selectedOption: q.studentAnswer || q.StudentAnswer || '',
          correctAnswer: q.modelAnswer || q.ModelAnswer || q.correctAnswer || q.CorrectAnswer || '',
          isCorrect: (q.awardedScore ?? q.AwardedScore ?? 0) >= (q.maxScore ?? q.MaxScore ?? 1),
          marksAwarded: q.awardedScore ?? q.AwardedScore ?? 0,
          maxMarks: q.maxScore ?? q.MaxScore ?? 1,
          options: q.options || q.Options || [],
        });
      }
    }
    
    // Also check for separate mcqEvaluations array
    const mcqEvaluations = data.mcqEvaluations || data.McqEvaluations || data.MCQEvaluations || data.mcqResults || data.McqResults || [];
    for (const m of mcqEvaluations) {
      mcqResults.push({
        questionId: m.questionId || m.QuestionId || '',
        questionNumber: m.questionNumber ?? m.QuestionNumber ?? 0,
        questionText: m.questionText || m.QuestionText || '',
        selectedOption: m.selectedOption || m.SelectedOption || m.studentAnswer || m.StudentAnswer || '',
        correctAnswer: m.correctAnswer || m.CorrectAnswer || m.correctOption || m.CorrectOption || '',
        isCorrect: m.isCorrect ?? m.IsCorrect ?? false,
        marksAwarded: m.marksAwarded ?? m.MarksAwarded ?? m.awardedScore ?? m.AwardedScore ?? (m.isCorrect ? 1 : 0),
        maxMarks: m.maxMarks ?? m.MaxMarks ?? m.maxScore ?? m.MaxScore ?? 1,
        options: m.options || m.Options || [],
      });
    }
  }

  // Calculate MCQ totals
  const mcqTotalScore = mcqResults.reduce((sum: number, m: any) => sum + (m.marksAwarded || 0), 0);
  const mcqTotalMarks = mcqResults.reduce((sum: number, m: any) => sum + (m.maxMarks || 1), 0);

  // Calculate subjective totals
  const subjectiveTotalScore = subjectiveResults.reduce((sum: number, s: any) => sum + (s.earnedMarks || 0), 0);
  const subjectiveTotalMarks = subjectiveResults.reduce((sum: number, s: any) => sum + (s.maxMarks || 0), 0);

  // Calculate grand totals - use API values if available, otherwise calculate
  const totalScore = data.totalScore ?? data.TotalScore ?? data.grandScore ?? data.GrandScore ?? 
                     data.score ?? data.Score ?? (mcqTotalScore + subjectiveTotalScore);
  const maxScore = (data.maxScore ?? data.MaxScore ?? data.grandTotalMarks ?? data.GrandTotalMarks ?? 
                   data.totalMarks ?? data.TotalMarks ?? (mcqTotalMarks + subjectiveTotalMarks)) || 75;
  const percentage = data.percentage ?? data.Percentage ?? (maxScore > 0 ? (totalScore / maxScore) * 100 : 0);
  const grade = data.grade || data.Grade || calculateGrade(percentage);
  const passed = data.passed ?? data.Passed ?? percentage >= 35;

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('🔄 [NORMALIZATION] Processing Results');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📝 MCQ Questions:', mcqResults.length);
  console.log('📝 Subjective Questions:', subjectiveResults.length);
  console.log('───────────────────────────────────────────────────────────');
  console.log('✅ MCQ Score:', mcqTotalScore, '/', mcqTotalMarks, `(${mcqTotalMarks > 0 ? ((mcqTotalScore/mcqTotalMarks)*100).toFixed(1) : 0}%)`);
  console.log('✅ Subjective Score:', subjectiveTotalScore, '/', subjectiveTotalMarks, `(${subjectiveTotalMarks > 0 ? ((subjectiveTotalScore/subjectiveTotalMarks)*100).toFixed(1) : 0}%)`);
  console.log('───────────────────────────────────────────────────────────');
  console.log('🎯 Grand Total:', totalScore, '/', maxScore, '=', percentage.toFixed(2), '%');
  console.log('📊 Grade:', grade);
  console.log('✔️  Passed:', passed ? 'YES' : 'NO');
  console.log('═══════════════════════════════════════════════════════════\n');

  return {
    examId: data.examId || data.ExamId || data.submissionId || data.SubmissionId || '',
    studentId: data.studentId || data.StudentId || '',
    examTitle: data.examTitle || data.ExamTitle || data.examId || data.ExamId || '',
    mcqScore: data.mcqScore ?? data.McqScore ?? mcqTotalScore,
    mcqTotalMarks: data.mcqTotalMarks ?? data.McqTotalMarks ?? mcqTotalMarks,
    mcqResults: mcqResults,
    subjectiveScore: data.subjectiveScore ?? data.SubjectiveScore ?? subjectiveTotalScore,
    subjectiveTotalMarks: data.subjectiveTotalMarks ?? data.SubjectiveTotalMarks ?? subjectiveTotalMarks,
    subjectiveResults: subjectiveResults,
    grandScore: totalScore,
    grandTotalMarks: maxScore,
    percentage: Math.round(percentage * 100) / 100,
    grade: grade,
    passed: passed,
    evaluatedAt: data.evaluatedAt || data.EvaluatedAt || new Date().toISOString(),
  };
}

/**
 * Calculate grade based on percentage (Karnataka 2nd PUC grading)
 */
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C+';
  if (percentage >= 40) return 'C';
  if (percentage >= 35) return 'D';
  return 'F';
}

/**
 * Upload answer sheet images/PDF for evaluation
 */
export async function uploadAnswerSheet(
  params: UploadAnswerSheetParams
): Promise<UploadAnswerSheetResponse> {
  try {
    const formData = new FormData();
    formData.append('examId', params.examId);
    formData.append('studentId', params.studentId);

    // Add files to form data
    params.files.forEach((file, index) => {
      formData.append('files', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.name || `answer${index + 1}.jpg`,
      } as any);
    });

    const response = await fetch(`${API_BASE_URL}/api/exam/upload-written`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Upload failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Upload answer sheet error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Check the evaluation status of a submitted answer sheet
 */
export async function checkSubmissionStatus(
  submissionId: string
): Promise<SubmissionStatus> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exam/submission-status/${submissionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Status check failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Check submission status error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get complete evaluation results by examId and studentId
 */
export async function getEvaluationResults(
  examId: string,
  studentId: string
): Promise<EvaluationResult> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/exam/result/${examId}/${studentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Failed to fetch results with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Get evaluation results error:', error);
    throw new Error(getUserFriendlyErrorMessage(error));
  }
}

/**
 * Get complete evaluation results directly by submissionId
 * This fetches results from blob storage using the submission ID
 * Includes retry logic with exponential backoff for when results are not immediately available
 */
export async function getEvaluationResultsBySubmissionId(
  submissionId: string,
  retries: number = 10,
  initialDelayMs: number = 5000
): Promise<EvaluationResult> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Exponential backoff: 5s, 7.5s, 11.25s, etc. (capped at 30s)
      const delayMs = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 30000);
      console.log(`📊 [GET RESULTS] Attempt ${attempt}/${retries} for submission:`, submissionId);
      
      const response = await fetch(
        `${API_BASE_URL}/api/exam/evaluation-result/${submissionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('📊 [GET RESULTS] Response status:', response.status);

      // Get raw text first to handle empty responses
      const text = await response.text();
      console.log('📊 [GET RESULTS] Response length:', text.length);
      
      if (!text || text.trim() === '') {
        console.log(`📊 [GET RESULTS] Empty response, waiting ${delayMs}ms before retry...`);
        lastError = new Error('Results not available yet');
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw lastError;
      }

      // Try to parse JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('📊 [GET RESULTS] JSON parse error:', parseError);
        console.error('📊 [GET RESULTS] Raw response:', text.substring(0, 200));
        lastError = new Error('Invalid response from server');
        if (attempt < retries) {
          console.log(`📊 [GET RESULTS] Invalid JSON, waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue;
        }
        throw lastError;
      }

      // Check if API returned an error (but valid JSON)
      if (!response.ok || data.error) {
        const errorMessage = data.error || data.message || `Status ${response.status}`;
        console.log('📊 [GET RESULTS] API error:', errorMessage);
        
        // Check if it's a "not ready" type error - retry
        if (errorMessage.toLowerCase().includes('not ready') || 
            errorMessage.toLowerCase().includes('not found') ||
            errorMessage.toLowerCase().includes('processing')) {
          lastError = new Error(errorMessage);
          if (attempt < retries) {
            console.log(`📊 [GET RESULTS] Results not ready, waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            continue;
          }
          // On final attempt, don't throw - return a special "pending" result
          console.log('📊 [GET RESULTS] Results still being prepared after all retries');
          return {
            examId: '',
            studentId: '',
            examTitle: '',
            mcqScore: 0,
            mcqTotalMarks: 0,
            mcqResults: [],
            subjectiveScore: 0,
            subjectiveTotalMarks: 0,
            subjectiveResults: [],
            grandScore: -1, // Special marker for "still pending"
            grandTotalMarks: 0,
            percentage: 0,
            grade: 'Pending',
            passed: false,
            evaluatedAt: '',
            _isPending: true
          } as EvaluationResult & { _isPending?: boolean };
        }
        throw new Error(errorMessage);
      }

      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('📊 [EVALUATION RESULTS] Successfully Fetched!');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('📦 Full API Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('═══════════════════════════════════════════════════════════');
      console.log('🔑 Data Keys:', Object.keys(data).join(', '));
      console.log('📊 Grand Score:', data.grandScore || data.GrandScore || data.totalScore || data.TotalScore || 'N/A');
      console.log('📊 Total Marks:', data.grandTotalMarks || data.GrandTotalMarks || data.maxScore || data.MaxScore || 'N/A');
      console.log('📊 Percentage:', data.percentage || data.Percentage || 'N/A');
      console.log('📊 Grade:', data.grade || data.Grade || 'N/A');
      console.log('📊 Passed:', data.passed || data.Passed || 'N/A');
      console.log('═══════════════════════════════════════════════════════════\n');
      
      // Check if data has nested evaluationResult field (new API format)
      if (data.evaluationResult) {
        console.log('📊 [GET RESULTS] Detected nested evaluationResult format - extracting...');
        
        // Handle double-nested evaluationResult (old format: evaluationResult.evaluationResult)
        let evalResult = data.evaluationResult;
        if (evalResult.evaluationResult && (evalResult.evaluationResult.mcqResults || evalResult.evaluationResult.subjectiveResults || evalResult.evaluationResult.questionEvaluations)) {
          console.log('📊 [GET RESULTS] Found double-nested evaluationResult - extracting inner result');
          evalResult = evalResult.evaluationResult;
        }
        
        // Merge summary data with evaluationResult
        const mergedData = {
          ...evalResult,
          // Use summary if available for correct totals
          grandScore: data.summary?.totalScore ?? evalResult.grandScore ?? evalResult.totalScore,
          grandTotalMarks: data.summary?.maxPossibleScore ?? evalResult.grandTotalMarks ?? evalResult.maxScore,
          percentage: data.summary?.percentage ?? evalResult.percentage,
          grade: data.summary?.grade ?? evalResult.grade,
        };
        console.log('📊 [GET RESULTS] Merged data keys:', Object.keys(mergedData).join(', '));
        console.log('📊 [GET RESULTS] mcqResults count:', (mergedData.mcqResults || []).length);
        console.log('📊 [GET RESULTS] subjectiveResults count:', (mergedData.subjectiveResults || []).length);
        
        const normalizedResult = normalizeEvaluationResult(mergedData);
        console.log('📊 [GET RESULTS] Normalized - grand Score:', normalizedResult.grandScore, 'percentage:', normalizedResult.percentage);
        return normalizedResult;
      }
      
      // Normalize the response to handle PascalCase vs camelCase differences
      const normalizedResult = normalizeEvaluationResult(data);
      console.log('📊 [GET RESULTS] Normalized - grandScore:', normalizedResult.grandScore, 'percentage:', normalizedResult.percentage);
      return normalizedResult;
    } catch (error: any) {
      // Only log as warning for "not ready" errors, not as ERROR
      const isNotReadyError = error?.message?.toLowerCase().includes('not ready') ||
                              error?.message?.toLowerCase().includes('not found') ||
                              error?.message?.toLowerCase().includes('processing');
      if (isNotReadyError) {
        console.log(`📊 [GET RESULTS] Attempt ${attempt}: Still preparing results...`);
      } else {
        console.log(`📊 [GET RESULTS] Attempt ${attempt} error:`, error?.message || error);
      }
      lastError = error;
      if (attempt < retries) {
        const retryDelay = Math.min(initialDelayMs * Math.pow(1.5, attempt - 1), 30000);
        console.log(`📊 [GET RESULTS] Waiting ${retryDelay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // Return pending result instead of throwing for "not ready" errors
  if (lastError?.message?.toLowerCase().includes('not ready') ||
      lastError?.message?.toLowerCase().includes('not found') ||
      lastError?.message?.toLowerCase().includes('processing')) {
    console.log('📊 [GET RESULTS] Results still being prepared, returning pending state');
    return {
      examId: '',
      studentId: '',
      examTitle: '',
      mcqScore: 0,
      mcqTotalMarks: 0,
      mcqResults: [],
      subjectiveScore: 0,
      subjectiveTotalMarks: 0,
      subjectiveResults: [],
      grandScore: -1,
      grandTotalMarks: 0,
      percentage: 0,
      grade: 'Pending',
      passed: false,
      evaluatedAt: '',
      _isPending: true
    } as EvaluationResult & { _isPending?: boolean };
  }
  
  throw lastError || new Error('Failed to fetch results after retries');
}

/**
 * Poll submission status until evaluation is complete
 * @param submissionId - The submission ID to poll
 * @param onStatusUpdate - Callback for status updates
 * @param maxAttempts - Maximum polling attempts (default: 60)
 * @param intervalMs - Polling interval in milliseconds (default: 3000)
 * @returns Promise<SubmissionStatus> - Final status
 */
export async function pollEvaluationStatus(
  submissionId: string,
  onStatusUpdate?: (status: SubmissionStatus) => void,
  maxAttempts: number = 60,
  intervalMs: number = 3000
): Promise<SubmissionStatus> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await checkSubmissionStatus(submissionId);

      if (onStatusUpdate) {
        onStatusUpdate(status);
      }

      if (status.isComplete || status.status === 'Failed') {
        return status;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    } catch (error) {
      console.error('Polling error:', error);
      
      // If we've tried multiple times and still failing, throw
      if (attempts > 3) {
        throw error;
      }
      
      // Otherwise, wait and retry
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
  }

  throw new Error('Evaluation timeout: Maximum polling attempts reached');
}

/**
 * Get status message for display
 */
export function getStatusMessage(status: string): string {
  switch (status) {
    case 'PendingEvaluation':
      return '⏳ Your answer sheet is being processed...';
    case 'OcrProcessing':
      return '📄 Extracting text from your answer sheet...';
    case 'Evaluating':
      return '🤖 AI is evaluating your answers...';
    case 'Completed':
      return '✅ Evaluation completed! Your results are ready.';
    case 'Failed':
      return '❌ Evaluation failed. Please contact support.';
    default:
      return 'Processing...';
  }
}

/**
 * Get grade color for display
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return '#4caf50'; // Green
    case 'B+':
    case 'B':
      return '#2196f3'; // Blue
    case 'C':
      return '#ff9800'; // Orange
    case 'D':
      return '#ff5722'; // Deep Orange
    case 'F':
      return '#f44336'; // Red
    default:
      return '#757575'; // Grey
  }
}

/**
 * Validate file before upload
 */
export function validateFile(file: { uri: string; type?: string; size?: number; name?: string }): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

  // Check file size
  if (file.size && file.size > maxSize) {
    return {
      valid: false,
      error: `File ${file.name || 'selected'} exceeds maximum size of 10MB`,
    };
  }

  // Check file type
  if (file.type && !allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Invalid file type. Allowed: JPG, JPEG, PNG, PDF, WEBP',
    };
  }

  return { valid: true };
}

/**
 * Validate multiple files before upload
 */
export function validateFiles(files: any[]): {
  valid: boolean;
  error?: string;
} {
  const maxFiles = 20;

  if (files.length === 0) {
    return {
      valid: false,
      error: 'Please select at least one answer sheet image',
    };
  }

  if (files.length > maxFiles) {
    return {
      valid: false,
      error: `Maximum ${maxFiles} files allowed`,
    };
  }

  // Validate each file
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      return validation;
    }
  }

  return { valid: true };
}
