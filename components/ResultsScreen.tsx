import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getExamResults, ExamResult, SubjectiveResult, McqQuestionResult } from '../services/pucExamApi';

interface ResultsScreenProps {
  examId: string;
  studentId: string;
  onBack: () => void;
}

export default function ResultsScreen({ examId, studentId, onBack }: ResultsScreenProps) {
  const [results, setResults] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getExamResults(examId, studentId);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load results');
      Alert.alert('Error', err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading your results...</Text>
      </View>
    );
  }

  if (error || !results) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'No results found'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadResults}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A':
        return '#22c55e';
      case 'B+':
      case 'B':
        return '#3b82f6';
      case 'C':
        return '#f97316';
      case 'D':
        return '#ea580c';
      default:
        return '#ef4444';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Overall Score Card */}
        <LinearGradient colors={['#6366f1', '#8b5cf6']} style={styles.scoreCard}>
          <Text style={styles.scoreTitle}>Your Score</Text>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreValue}>
              {results.mcqScore + results.subjectiveScore}
            </Text>
            <Text style={styles.scoreMax}>
              / {results.mcqTotalMarks + results.subjectiveTotalMarks}
            </Text>
          </View>
          <View style={styles.gradeContainer}>
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(results.grade) }]}>
              <Text style={styles.gradeText}>{results.grade}</Text>
            </View>
            <Text style={styles.percentageText}>{results.percentage.toFixed(1)}%</Text>
          </View>
          <Text style={styles.passedText}>
            {results.passed ? '✓ Passed' : '✗ Not Passed'}
          </Text>
        </LinearGradient>

        {/* MCQ Section */}
        {results.mcqTotalMarks > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MCQ Performance</Text>
            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Score</Text>
                <Text style={styles.scoreNumber}>
                  {results.mcqScore} / {results.mcqTotalMarks}
                </Text>
              </View>
            </View>
            
            {/* Individual MCQ Results */}
            {results.mcqResults && results.mcqResults.length > 0 && (
              <View style={styles.mcqQuestionsContainer}>
                {results.mcqResults.map((mcqResult, index) => (
                  <McqQuestionResult key={index} result={mcqResult} index={index} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Subjective Section - Detailed Feedback */}
        {results.subjectiveResults && results.subjectiveResults.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subjective Answers - AI Evaluation</Text>
            <View style={styles.scoreBreakdown}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Total Score</Text>
                <Text style={styles.scoreNumber}>
                  {results.subjectiveScore} / {results.subjectiveTotalMarks}
                </Text>
              </View>
            </View>

            {/* Individual Question Results */}
            {results.subjectiveResults.map((result, index) => (
              <SubjectiveQuestionResult key={index} result={result} index={index} />
            ))}
          </View>
        )}

        {/* Overall Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Performance Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>MCQ Score:</Text>
            <Text style={styles.summaryValue}>
              {results.mcqScore} / {results.mcqTotalMarks}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subjective Score:</Text>
            <Text style={styles.summaryValue}>
              {results.subjectiveScore} / {results.subjectiveTotalMarks}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelBold}>Grand Total:</Text>
            <Text style={styles.summaryValueBold}>
              {results.grandScore} / {results.grandTotalMarks}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Component for individual MCQ question result
function McqQuestionResult({
  result,
  index,
}: {
  result: McqQuestionResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.mcqCard, result.isCorrect && styles.mcqCardCorrect]}>
      <TouchableOpacity
        style={styles.mcqHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.mcqHeaderLeft}>
          <View style={[styles.mcqStatus, result.isCorrect ? styles.mcqCorrect : styles.mcqWrong]}>
            <Text style={styles.mcqStatusText}>{result.isCorrect ? '✓' : '✗'}</Text>
          </View>
          <Text style={styles.mcqQuestionNumber}>Q{result.questionNumber}</Text>
          <Text style={styles.mcqMarks}>{result.marks} mark{result.marks > 1 ? 's' : ''}</Text>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mcqDetails}>
          {/* Question Text */}
          <View style={styles.mcqDetailSection}>
            <Text style={styles.mcqDetailLabel}>Question:</Text>
            <Text style={styles.mcqQuestionText}>{result.questionText}</Text>
          </View>

          {/* Options */}
          <View style={styles.mcqDetailSection}>
            <Text style={styles.mcqDetailLabel}>Options:</Text>
            {result.options.map((option, idx) => {
              const isCorrect = option === result.correctAnswer;
              const isStudentAnswer = option === result.studentAnswer;
              
              return (
                <View key={idx} style={[
                  styles.mcqOption,
                  isCorrect && styles.mcqOptionCorrect,
                  isStudentAnswer && !isCorrect && styles.mcqOptionWrong
                ]}>
                  <Text style={[
                    styles.mcqOptionText,
                    isCorrect && styles.mcqOptionTextCorrect,
                    isStudentAnswer && !isCorrect && styles.mcqOptionTextWrong
                  ]}>
                    {String.fromCharCode(65 + idx)}. {option}
                    {isCorrect && ' ✓'}
                    {isStudentAnswer && !isCorrect && ' (Your answer)'}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Correct Answer */}
          <View style={styles.mcqDetailSection}>
            <Text style={styles.mcqCorrectAnswerLabel}>
              Correct Answer: <Text style={styles.mcqCorrectAnswerText}>{result.correctAnswer}</Text>
            </Text>
            {result.studentAnswer && !result.isCorrect && (
              <Text style={styles.mcqYourAnswerLabel}>
                Your Answer: <Text style={styles.mcqYourAnswerText}>{result.studentAnswer}</Text>
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// Component for individual subjective question result
function SubjectiveQuestionResult({
  result,
  index,
}: {
  result: SubjectiveResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const scorePercentage = (result.score / result.maxMarks) * 100;
  const scoreColor = scorePercentage >= 80 ? '#22c55e' : scorePercentage >= 60 ? '#f97316' : '#ef4444';

  return (
    <View style={styles.questionCard}>
      <TouchableOpacity
        style={styles.questionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.questionHeaderLeft}>
          <Text style={styles.questionNumber}>Q{result.questionNumber}</Text>
          <View style={styles.questionScore}>
            <Text style={[styles.scoreEarned, { color: scoreColor }]}>
              {result.score}
            </Text>
            <Text style={styles.scoreTotal}> / {result.maxMarks}</Text>
          </View>
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.questionDetails}>
          {/* Question Text */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Question:</Text>
            <Text style={styles.detailText}>{result.questionText}</Text>
          </View>

          {/* AI Feedback */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>AI Feedback:</Text>
            <Text style={styles.feedbackText}>{result.feedback}</Text>
          </View>

          {/* Expected Answer */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>Expected Answer:</Text>
            <Text style={styles.expectedAnswerText}>{result.expectedAnswer}</Text>
          </View>

          {/* Student's Answer */}
          {result.studentAnswer && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Your Answer:</Text>
              <Text style={styles.studentAnswerText}>{result.studentAnswer}</Text>
            </View>
          )}

          {/* Improvement Suggestions */}
          {result.improvementSuggestions && (
            <View style={[styles.detailSection, styles.improvementSection]}>
              <Text style={styles.improvementLabel}>💡 Suggestions for Improvement:</Text>
              <Text style={styles.improvementText}>{result.improvementSuggestions}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Score Card
  scoreCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreMax: {
    fontSize: 24,
    color: '#fff',
    opacity: 0.8,
    marginLeft: 8,
  },
  gradeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  gradeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  percentageText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  passedText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    opacity: 0.9,
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  scoreBreakdown: {
    marginBottom: 16,
  },
  scoreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  scoreNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },

  // Question Card
  questionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginRight: 12,
  },
  questionScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreEarned: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreTotal: {
    fontSize: 14,
    color: '#64748b',
  },
  expandIcon: {
    fontSize: 12,
    color: '#64748b',
  },

  // Question Details
  questionDetails: {
    padding: 16,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  feedbackText: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
    fontWeight: '500',
  },
  expectedAnswerText: {
    fontSize: 14,
    color: '#22c55e',
    lineHeight: 20,
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
  },
  studentAnswerText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  improvementSection: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  improvementLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 8,
  },
  improvementText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryRowTotal: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    marginTop: 8,
    paddingTop: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryValueBold: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },

  // Back Button
  backButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // MCQ Styles
  mcqQuestionsContainer: {
    marginTop: 12,
  },
  mcqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  mcqCardCorrect: {
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  mcqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  mcqHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mcqStatus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcqCorrect: {
    backgroundColor: '#22c55e',
  },
  mcqWrong: {
    backgroundColor: '#ef4444',
  },
  mcqStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mcqQuestionNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  mcqMarks: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  mcqDetails: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  mcqDetailSection: {
    marginBottom: 16,
  },
  mcqDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  mcqQuestionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
    fontWeight: '500',
  },
  mcqOption: {
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mcqOptionCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    borderWidth: 2,
  },
  mcqOptionWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  mcqOptionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  mcqOptionTextCorrect: {
    color: '#15803d',
    fontWeight: '600',
  },
  mcqOptionTextWrong: {
    color: '#dc2626',
    fontWeight: '600',
  },
  mcqCorrectAnswerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  mcqCorrectAnswerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22c55e',
  },
  mcqYourAnswerLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  mcqYourAnswerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
});
