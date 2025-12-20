import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getExamResults, ExamResult, SubjectiveResult, McqQuestionResult as McqResultType, StepAnalysisItem } from '../services/pucExamApi';

interface ResultsScreenProps {
  // Can receive either examResult directly OR examId/studentId to fetch
  examResult?: ExamResult | null;
  examId?: string;
  studentId?: string;
  examTitle?: string;
  onBack: () => void;
}

export default function ResultsScreen({ 
  examResult: initialResult,
  examId, 
  studentId,
  examTitle,
  onBack
}: ResultsScreenProps) {
  const [results, setResults] = useState<ExamResult | null>(initialResult || null);
  const [loading, setLoading] = useState(!initialResult);
  const [error, setError] = useState<string | null>(null);
  const [showMcqDetails, setShowMcqDetails] = useState(false);
  const [showSubjectiveDetails, setShowSubjectiveDetails] = useState(true);

  useEffect(() => {
    // If we already have results, don't fetch
    if (initialResult) {
      console.log('📊 [ResultsScreen] Using provided examResult');
      setResults(initialResult);
      setLoading(false);
      return;
    }
    
    // Only fetch if we have examId and studentId
    if (examId && studentId) {
      loadResults();
    } else {
      setLoading(false);
      setError('No exam results available');
    }
  }, [initialResult, examId, studentId]);

  const loadResults = async () => {
    if (!examId || !studentId) {
      setError('Missing exam or student ID');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      console.log('📊 [ResultsScreen] Fetching results for exam:', examId);
      
      const data = await getExamResults(examId, studentId);
      setResults(data);
    } catch (err: any) {
      const errorMsg = err.userMessage || err.message || 'Failed to load results';
      setError(errorMsg);
      console.error('❌ [ResultsScreen] Error loading results:', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!results) return;
    
    try {
      const shareText = `📊 My Exam Results\n\n` +
        `📚 ${results.examTitle || examTitle || 'Exam'}\n` +
        `🎯 Score: ${results.grandScore}/${results.grandTotalMarks}\n` +
        `📈 Percentage: ${results.percentage?.toFixed(1) || 0}%\n` +
        `🏆 Grade: ${results.grade}\n` +
        `${results.passed ? '✅ Passed!' : '❌ Need more practice'}\n\n` +
        `📝 MCQ: ${results.mcqScore}/${results.mcqTotalMarks}\n` +
        `✍️ Subjective: ${results.subjectiveScore}/${results.subjectiveTotalMarks}`;
      
      await Share.share({
        message: shareText,
        title: 'My Exam Results',
      });
    } catch (error) {
      console.error('Error sharing results:', error);
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
        <Ionicons name="alert-circle" size={64} color="#ef4444" />
        <Text style={styles.errorText}>{error || 'No results found'}</Text>
        {examId && studentId && (
          <TouchableOpacity style={styles.retryButton} onPress={loadResults}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.retryButton, { backgroundColor: '#64748b', marginTop: 12 }]} onPress={onBack}>
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+': return '#15803d';
      case 'A': return '#22c55e';
      case 'B+': return '#3b82f6';
      case 'B': return '#60a5fa';
      case 'C+': return '#f97316';
      case 'C': return '#fb923c';
      case 'D': return '#ea580c';
      default: return '#ef4444';
    }
  };

  const getGradeEmoji = (grade: string) => {
    switch (grade) {
      case 'A+': return '🏆';
      case 'A': return '🌟';
      case 'B+': return '👍';
      case 'B': return '✨';
      case 'C+': return '📚';
      case 'C': return '💪';
      case 'D': return '🎯';
      default: return '📖';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header with Back and Share */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#4F46E5" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Exam Results</Text>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Overall Score Card */}
        <LinearGradient 
          colors={results.passed ? ['#22c55e', '#16a34a'] : ['#f97316', '#ea580c']} 
          style={styles.scoreCard}
        >
          <Text style={styles.examTitleText}>
            {examTitle || results.examTitle || 'Exam Results'}
          </Text>
          
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>{results.grandScore || 0}</Text>
            <Text style={styles.scoreMax}>/ {results.grandTotalMarks || 0}</Text>
          </View>
          
          <View style={styles.gradeRow}>
            <Text style={styles.gradeEmoji}>{getGradeEmoji(results.grade || 'F')}</Text>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{results.grade || 'N/A'}</Text>
            </View>
            <Text style={styles.percentageText}>{(results.percentage || 0).toFixed(1)}%</Text>
          </View>
          
          <View style={[styles.passedBadge, { backgroundColor: results.passed ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]}>
            <Ionicons name={results.passed ? "checkmark-circle" : "close-circle"} size={20} color="#fff" />
            <Text style={styles.passedText}>
              {results.passed ? 'Congratulations! You Passed!' : 'Keep Practicing!'}
            </Text>
          </View>
          
          {results.evaluatedAt && (
            <Text style={styles.evaluatedAtText}>
              Evaluated: {new Date(results.evaluatedAt).toLocaleString()}
            </Text>
          )}
        </LinearGradient>

        {/* Score Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>📊 Score Breakdown</Text>
          
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Ionicons name="checkbox" size={24} color="#4F46E5" />
              <Text style={styles.breakdownLabel}>MCQ</Text>
              <Text style={styles.breakdownScore}>{results.mcqScore || 0}/{results.mcqTotalMarks || 0}</Text>
            </View>
            
            <View style={styles.breakdownDivider} />
            
            <View style={styles.breakdownItem}>
              <Ionicons name="create" size={24} color="#7C3AED" />
              <Text style={styles.breakdownLabel}>Subjective</Text>
              <Text style={styles.breakdownScore}>{results.subjectiveScore || 0}/{results.subjectiveTotalMarks || 0}</Text>
            </View>
          </View>
        </View>

        {/* MCQ Section */}
        {results.mcqResults && results.mcqResults.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowMcqDetails(!showMcqDetails)}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="checkbox-outline" size={24} color="#4F46E5" />
                <Text style={styles.sectionTitle}>MCQ Results</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>
                    {results.mcqResults.filter(r => r.isCorrect).length}/{results.mcqResults.length}
                  </Text>
                </View>
              </View>
              <Ionicons name={showMcqDetails ? "chevron-up" : "chevron-down"} size={24} color="#64748b" />
            </TouchableOpacity>
            
            {showMcqDetails && (
              <View style={styles.questionsContainer}>
                {results.mcqResults.map((mcqResult, index) => (
                  <McqQuestionResult key={mcqResult.questionId || index} result={mcqResult} index={index} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Subjective Section */}
        {results.subjectiveResults && results.subjectiveResults.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setShowSubjectiveDetails(!showSubjectiveDetails)}
            >
              <View style={styles.sectionTitleRow}>
                <Ionicons name="document-text-outline" size={24} color="#7C3AED" />
                <Text style={styles.sectionTitle}>Subjective Evaluation</Text>
                <View style={[styles.countBadge, { backgroundColor: '#7C3AED' }]}>
                  <Text style={styles.countText}>{results.subjectiveResults.length} Q</Text>
                </View>
              </View>
              <Ionicons name={showSubjectiveDetails ? "chevron-up" : "chevron-down"} size={24} color="#64748b" />
            </TouchableOpacity>
            
            {showSubjectiveDetails && (
              <View style={styles.questionsContainer}>
                {results.subjectiveResults.map((result, index) => (
                  <SubjectiveQuestionResultCard key={result.questionId || index} result={result} index={index} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Performance Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📈 Performance Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Questions</Text>
            <Text style={styles.summaryValue}>
              {(results.mcqResults?.length || 0) + (results.subjectiveResults?.length || 0)}
            </Text>
          </View>
          
          {results.mcqResults && results.mcqResults.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>MCQ Accuracy</Text>
              <Text style={[styles.summaryValue, { color: '#4F46E5' }]}>
                {((results.mcqResults.filter(r => r.isCorrect).length / results.mcqResults.length) * 100).toFixed(0)}%
              </Text>
            </View>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>MCQ Score:</Text>
            <Text style={styles.summaryValue}>
              {results.mcqScore || 0} / {results.mcqTotalMarks || 0}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subjective Score:</Text>
            <Text style={styles.summaryValue}>
              {results.subjectiveScore || 0} / {results.subjectiveTotalMarks || 0}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.summaryRowTotal]}>
            <Text style={styles.summaryLabelBold}>Final Grade:</Text>
            <Text style={[styles.summaryValueBold, { color: getGradeColor(results.grade || 'F') }]}>
              {results.grade || 'N/A'} ({(results.percentage || 0).toFixed(1)}%)
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.buttonGradient}>
            <Ionicons name="home" size={24} color="#fff" />
            <Text style={styles.backButtonText}>Back to Home</Text>
          </LinearGradient>
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
  result: McqResultType;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.mcqCard, result.isCorrect ? styles.mcqCardCorrect : styles.mcqCardWrong]}>
      <TouchableOpacity
        style={styles.mcqHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.mcqHeaderLeft}>
          <View style={[styles.mcqStatus, result.isCorrect ? styles.mcqCorrect : styles.mcqWrong]}>
            <Ionicons name={result.isCorrect ? "checkmark" : "close"} size={16} color="#fff" />
          </View>
          <Text style={styles.mcqQuestionNumber}>Q{result.questionNumber || index + 1}</Text>
          <Text style={[styles.mcqMarks, { color: result.isCorrect ? '#22c55e' : '#ef4444' }]}>
            {result.marksAwarded} mark{result.marksAwarded > 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.mcqDetails}>
          {/* Question Text */}
          {result.questionText && (
            <View style={styles.mcqDetailSection}>
              <Text style={styles.mcqDetailLabel}>Question:</Text>
              <Text style={styles.mcqQuestionText}>{result.questionText}</Text>
            </View>
          )}

          {/* Answer Summary */}
          <View style={styles.answerRow}>
            <View style={[styles.answerBlock, result.isCorrect ? styles.answerCorrect : styles.answerWrong]}>
              <Text style={styles.answerLabel}>Your Answer</Text>
              <Text style={[
                styles.answerText, 
                !result.selectedOption && styles.notAnsweredText
              ]}>
                {result.selectedOption || 'Not answered'}
              </Text>
            </View>
            {!result.isCorrect && (
              <View style={[styles.answerBlock, styles.answerCorrect]}>
                <Text style={styles.answerLabel}>Correct Answer</Text>
                <Text style={styles.answerText}>{result.correctAnswer}</Text>
              </View>
            )}
          </View>
          
          {/* Correct Answer Banner */}
          {result.isCorrect && (
            <View style={styles.mcqCorrectBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text style={styles.mcqCorrectBannerText}>Your answer is correct!</Text>
            </View>
          )}
          
          {/* Wrong Answer Feedback */}
          {!result.isCorrect && (
            <View style={styles.mcqWrongFeedback}>
              <Ionicons name="information-circle" size={18} color="#991b1b" />
              <View style={styles.mcqWrongFeedbackContent}>
                <Text style={styles.mcqWrongFeedbackTitle}>
                  {!result.selectedOption ? 'Question Not Attempted' : 'Incorrect Answer'}
                </Text>
                <Text style={styles.mcqWrongFeedbackText}>
                  {!result.selectedOption 
                    ? `You did not answer this question. The correct answer is: ${result.correctAnswer}`
                    : `You selected "${result.selectedOption}" but the correct answer is "${result.correctAnswer}". Review this topic to improve your understanding.`
                  }
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Component for individual subjective question result
function SubjectiveQuestionResultCard({
  result,
  index,
}: {
  result: SubjectiveResult;
  index: number;
}) {
  const [expanded, setExpanded] = useState(true);

  // Use earnedMarks from new API format
  const earnedMarks = result.earnedMarks ?? (result as any).score ?? 0;
  const maxMarks = result.maxMarks || 1;
  const scorePercentage = (earnedMarks / maxMarks) * 100;
  const scoreColor = scorePercentage >= 80 ? '#22c55e' : scorePercentage >= 50 ? '#f97316' : '#ef4444';
  const isFullMarks = scorePercentage >= 100;

  return (
    <View style={styles.questionCard}>
      <TouchableOpacity
        style={styles.questionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.questionHeaderLeft}>
          <View style={[styles.questionBadge, { backgroundColor: scoreColor }]}>
            <Text style={styles.questionBadgeText}>Q{result.questionNumber || index + 1}</Text>
          </View>
          <View style={styles.questionScore}>
            <Text style={[styles.scoreEarned, { color: scoreColor }]}>
              {earnedMarks}
            </Text>
            <Text style={styles.scoreTotal}> / {maxMarks}</Text>
          </View>
        </View>
        <View style={styles.questionHeaderRight}>
          {isFullMarks && <Text style={styles.fullMarksEmoji}>🎉</Text>}
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={24} color="#64748b" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.questionDetails}>
          {/* Status Banner */}
          {isFullMarks ? (
            <View style={[styles.statusBanner, styles.statusBannerSuccess]}>
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text style={styles.statusBannerTextSuccess}>Perfect! Full marks awarded</Text>
            </View>
          ) : scorePercentage < 50 && (
            <View style={[styles.statusBanner, styles.statusBannerWarning]}>
              <Ionicons name="alert-circle" size={18} color="#92400e" />
              <Text style={styles.statusBannerTextWarning}>Review the model answer below</Text>
            </View>
          )}

          {/* Question Text */}
          {result.questionText && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>📌 Question:</Text>
              <Text style={styles.detailText}>{result.questionText}</Text>
            </View>
          )}

          {/* Student's Answer - Use studentAnswerEcho from new API */}
          <View style={styles.detailSection}>
            <Text style={styles.detailLabel}>✏️ Your Answer:</Text>
            <View style={styles.studentAnswerBox}>
              <Text style={styles.studentAnswerText}>
                {result.studentAnswerEcho || (result as any).studentAnswer || '[No answer detected]'}
              </Text>
            </View>
          </View>

          {/* Step Analysis - Show only steps up to maxMarks */}
          {result.stepAnalysis && result.stepAnalysis.length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>📊 Step-by-Step Marking ({maxMarks} marks):</Text>
              <View style={styles.stepsContainer}>
                {result.stepAnalysis
                  .slice(0, maxMarks) // Only show steps equal to maxMarks
                  .map((step, stepIndex) => (
                    <StepAnalysisCard key={stepIndex} step={step} stepIndex={stepIndex} />
                  ))}
              </View>
            </View>
          )}

          {/* AI Feedback - Use overallFeedback from new API */}
          {/* Note: Model Answer is already included in overallFeedback when student doesn't get full marks */}
          {(result.overallFeedback || (result as any).feedback) && (
            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>🤖 AI Evaluation:</Text>
              <View style={styles.feedbackBox}>
                <Text style={styles.feedbackText}>
                  {result.overallFeedback || (result as any).feedback}
                </Text>
              </View>
            </View>
          )}

          {/* Improvement Suggestions */}
          {(result as any).improvementSuggestions && (
            <View style={[styles.detailSection, styles.improvementSection]}>
              <Text style={styles.improvementLabel}>💡 Suggestions for Improvement:</Text>
              <Text style={styles.improvementText}>{(result as any).improvementSuggestions}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// Step Analysis Card Component
function StepAnalysisCard({ step, stepIndex }: { step: StepAnalysisItem; stepIndex: number }) {
  const isCorrect = step.isCorrect && step.marksAwarded > 0;
  
  return (
    <View style={[styles.stepCard, isCorrect ? styles.stepCardCorrect : styles.stepCardWrong]}>
      <View style={styles.stepHeader}>
        <View style={styles.stepLeft}>
          <Ionicons 
            name={isCorrect ? "checkmark-circle" : "close-circle"} 
            size={18} 
            color={isCorrect ? '#22c55e' : '#ef4444'} 
          />
          <Text style={styles.stepDescription}>
            Step {step.step}: {step.description}
          </Text>
        </View>
        <Text style={[styles.stepMarks, { color: isCorrect ? '#22c55e' : '#ef4444' }]}>
          {step.marksAwarded}/{step.maxMarksForStep}
        </Text>
      </View>
      {step.feedback && step.feedback !== step.description && (
        <Text style={styles.stepFeedback}>{step.feedback}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f1f5f9',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
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
    marginTop: 16,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },

  // Score Card
  scoreCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  examTitleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
    textAlign: 'center',
  },
  scoreCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#fff',
  },
  scoreMax: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: -4,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  gradeBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  gradeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  passedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  passedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  evaluatedAtText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },

  // Breakdown Card
  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  breakdownScore: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  breakdownDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#e2e8f0',
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  countText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  questionsContainer: {
    padding: 12,
  },

  // Question Card
  questionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  questionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  questionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  questionBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
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
  fullMarksEmoji: {
    fontSize: 24,
    marginRight: 8,
  },

  // Question Details
  questionDetails: {
    padding: 16,
    paddingTop: 12,
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
  
  // Status Banner
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusBannerSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusBannerWarning: {
    backgroundColor: '#fef3c7',
  },
  statusBannerTextSuccess: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBannerTextWarning: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Answer Boxes
  studentAnswerBox: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  studentAnswerText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  feedbackBox: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  feedbackText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  modelAnswerBox: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  expectedAnswerText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
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

  // Step Analysis
  stepsContainer: {
    gap: 8,
  },
  stepCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  stepCardCorrect: {
    backgroundColor: '#f0fdf4',
  },
  stepCardWrong: {
    backgroundColor: '#fef2f2',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  stepLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  stepDescription: {
    fontSize: 13,
    color: '#334155',
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  stepMarks: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },
  stepFeedback: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    marginLeft: 26,
    fontStyle: 'italic',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  summaryRowTotal: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    borderBottomWidth: 0,
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
  },

  // Back Button
  backButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // MCQ Styles
  mcqCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  mcqCardCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
  },
  mcqCardWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  mcqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
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
  mcqQuestionNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  mcqMarks: {
    fontSize: 14,
    fontWeight: '600',
  },
  mcqDetails: {
    padding: 14,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  mcqDetailSection: {
    marginBottom: 14,
  },
  mcqDetailLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mcqQuestionText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  mcqCorrectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  mcqCorrectBannerText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  answerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  answerBlock: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  answerCorrect: {
    backgroundColor: '#dcfce7',
  },
  answerWrong: {
    backgroundColor: '#fee2e2',
  },
  answerLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  answerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  notAnsweredText: {
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  mcqWrongFeedback: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
  },
  mcqWrongFeedbackContent: {
    flex: 1,
    marginLeft: 10,
  },
  mcqWrongFeedbackTitle: {
    color: '#991b1b',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  mcqWrongFeedbackText: {
    color: '#7f1d1d',
    fontSize: 13,
    lineHeight: 18,
  },
});
