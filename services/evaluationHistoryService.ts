import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamResult } from './pucExamApi';

const EVALUATION_HISTORY_KEY = '@smartstudy_evaluation_history';
const MAX_HISTORY_ITEMS = 50;

export interface EvaluationHistoryItem {
  id: string;
  examId: string;
  studentId: string;
  subject: string;
  examTitle: string;
  evaluatedAt: string;
  grandScore: number;
  grandTotalMarks: number;
  percentage: number;
  grade: string;
  passed: boolean;
  mcqScore: number;
  mcqTotalMarks: number;
  subjectiveScore: number;
  subjectiveTotalMarks: number;
  fullResult: ExamResult;
}

/**
 * Save an evaluation result to history
 */
export async function saveEvaluationToHistory(
  examId: string,
  studentId: string,
  subject: string,
  examTitle: string,
  result: ExamResult
): Promise<void> {
  try {
    const history = await getEvaluationHistory();
    
    // Create history item
    const historyItem: EvaluationHistoryItem = {
      id: `${examId}_${Date.now()}`,
      examId,
      studentId,
      subject,
      examTitle: examTitle || `${subject} Exam`,
      evaluatedAt: new Date().toISOString(),
      grandScore: result.grandScore || 0,
      grandTotalMarks: result.grandTotalMarks || 0,
      percentage: result.percentage || 0,
      grade: result.grade || 'N/A',
      passed: result.passed || false,
      mcqScore: result.mcqScore || 0,
      mcqTotalMarks: result.mcqTotalMarks || 0,
      subjectiveScore: result.subjectiveScore || 0,
      subjectiveTotalMarks: result.subjectiveTotalMarks || 0,
      fullResult: result,
    };

    // Check if this exam already exists (by examId)
    const existingIndex = history.findIndex(h => h.examId === examId);
    if (existingIndex !== -1) {
      // Update existing entry
      history[existingIndex] = historyItem;
    } else {
      // Add new entry at the beginning
      history.unshift(historyItem);
    }

    // Limit history size
    const trimmedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(trimmedHistory));
    console.log('✅ [EvaluationHistory] Saved evaluation to history:', historyItem.id);
  } catch (error) {
    console.error('❌ [EvaluationHistory] Failed to save:', error);
  }
}

/**
 * Get all evaluation history
 */
export async function getEvaluationHistory(): Promise<EvaluationHistoryItem[]> {
  try {
    const historyJson = await AsyncStorage.getItem(EVALUATION_HISTORY_KEY);
    if (historyJson) {
      const history = JSON.parse(historyJson) as EvaluationHistoryItem[];
      return history;
    }
    return [];
  } catch (error) {
    console.error('❌ [EvaluationHistory] Failed to get history:', error);
    return [];
  }
}

/**
 * Get a specific evaluation by ID
 */
export async function getEvaluationById(id: string): Promise<EvaluationHistoryItem | null> {
  try {
    const history = await getEvaluationHistory();
    return history.find(h => h.id === id) || null;
  } catch (error) {
    console.error('❌ [EvaluationHistory] Failed to get by ID:', error);
    return null;
  }
}

/**
 * Delete an evaluation from history
 */
export async function deleteEvaluationFromHistory(id: string): Promise<void> {
  try {
    const history = await getEvaluationHistory();
    const filteredHistory = history.filter(h => h.id !== id);
    await AsyncStorage.setItem(EVALUATION_HISTORY_KEY, JSON.stringify(filteredHistory));
    console.log('✅ [EvaluationHistory] Deleted evaluation:', id);
  } catch (error) {
    console.error('❌ [EvaluationHistory] Failed to delete:', error);
  }
}

/**
 * Clear all evaluation history
 */
export async function clearEvaluationHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EVALUATION_HISTORY_KEY);
    console.log('✅ [EvaluationHistory] Cleared all history');
  } catch (error) {
    console.error('❌ [EvaluationHistory] Failed to clear:', error);
  }
}

/**
 * Get history count
 */
export async function getHistoryCount(): Promise<number> {
  try {
    const history = await getEvaluationHistory();
    return history.length;
  } catch (error) {
    return 0;
  }
}
