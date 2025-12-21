import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { NavigationContext } from '../navigation/NavigationContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  EvaluationHistoryItem,
  getEvaluationHistory,
  deleteEvaluationFromHistory,
  clearEvaluationHistory,
} from '../services/evaluationHistoryService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: '#2563EB',
  primaryLight: '#3B82F6',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  border: '#E2E8F0',
  gradeA: '#22C55E',
  gradeB: '#84CC16',
  gradeC: '#F59E0B',
  gradeD: '#F97316',
  gradeF: '#EF4444',
};

interface Props {
  onBack: () => void;
}

export default function EvaluationHistoryScreen({ onBack }: Props) {
  const { navigate, setResultsScreenData } = useContext(NavigationContext);
  const { theme } = useTheme();
  const [history, setHistory] = useState<EvaluationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await getEvaluationHistory();
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const handleViewResult = (item: EvaluationHistoryItem) => {
    setResultsScreenData({
      examResult: item.fullResult,
      examId: item.examId,
      studentId: item.studentId,
      examTitle: item.examTitle,
    });
    navigate('results');
  };

  const handleDeleteItem = (item: EvaluationHistoryItem) => {
    Alert.alert(
      'Delete Evaluation',
      `Are you sure you want to delete "${item.examTitle}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteEvaluationFromHistory(item.id);
            loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (history.length === 0) return;
    
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all evaluation history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearEvaluationHistory();
            setHistory([]);
          },
        },
      ]
    );
  };

  const handleExportPDF = async (item: EvaluationHistoryItem) => {
    try {
      setExportingPDF(item.id);
      const fullResult = item.fullResult;

      // Generate HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                padding: 30px;
                background-color: #ffffff;
                color: #1E293B;
                line-height: 1.6;
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 3px solid #2563EB;
              }
              .header h1 {
                color: #2563EB;
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              .header p {
                color: #64748B;
                margin: 5px 0;
                font-size: 14px;
              }
              .summary-box {
                background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%);
                color: white;
                padding: 25px;
                border-radius: 12px;
                margin: 20px 0;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }
              .summary-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-top: 15px;
              }
              .summary-item {
                text-align: center;
              }
              .summary-value {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .summary-label {
                font-size: 14px;
                opacity: 0.9;
              }
              .section {
                margin: 30px 0;
                padding: 20px;
                background: #F8FAFC;
                border-radius: 12px;
                border-left: 4px solid #2563EB;
              }
              .section-title {
                font-size: 20px;
                font-weight: bold;
                color: #2563EB;
                margin-bottom: 15px;
                display: flex;
                align-items: center;
              }
              .question-card {
                background: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 8px;
                border: 1px solid #E2E8F0;
              }
              .question-header {
                font-weight: bold;
                color: #1E293B;
                margin-bottom: 8px;
              }
              .question-text {
                color: #475569;
                margin: 8px 0;
                line-height: 1.5;
              }
              .score-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-weight: bold;
                font-size: 14px;
              }
              .score-correct {
                background: #DCFCE7;
                color: #16A34A;
              }
              .score-partial {
                background: #FEF3C7;
                color: #CA8A04;
              }
              .score-incorrect {
                background: #FEE2E2;
                color: #DC2626;
              }
              .footer {
                text-align: center;
                margin-top: 40px;
                padding-top: 20px;
                border-top: 2px solid #E2E8F0;
                color: #64748B;
                font-size: 12px;
              }
              .grade-display {
                font-size: 48px;
                font-weight: bold;
                text-align: center;
                margin: 10px 0;
              }
              .status-badge {
                display: inline-block;
                padding: 8px 20px;
                border-radius: 25px;
                font-weight: bold;
                font-size: 16px;
                margin: 10px 0;
              }
              .status-passed {
                background: #DCFCE7;
                color: #16A34A;
              }
              .status-failed {
                background: #FEE2E2;
                color: #DC2626;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>📊 Examination Evaluation Report</h1>
              <p><strong>${item.examTitle}</strong></p>
              <p>Subject: ${item.subject}</p>
              <p>Date: ${formatDate(item.evaluatedAt)}</p>
            </div>

            <div class="summary-box">
              <div class="grade-display">${item.grade}</div>
              <div class="summary-grid">
                <div class="summary-item">
                  <div class="summary-value">${item.grandScore}/${item.grandTotalMarks}</div>
                  <div class="summary-label">Total Score</div>
                </div>
                <div class="summary-item">
                  <div class="summary-value">${item.percentage?.toFixed(1)}%</div>
                  <div class="summary-label">Percentage</div>
                </div>
              </div>
              <div style="text-align: center; margin-top: 15px;">
                <span class="status-badge ${item.passed ? 'status-passed' : 'status-failed'}">
                  ${item.passed ? '✅ PASSED' : '❌ FAILED'}
                </span>
              </div>
            </div>

            ${fullResult?.mcqResults && fullResult.mcqResults.length > 0 ? `
              <div class="section">
                <div class="section-title">📋 Multiple Choice Questions</div>
                <p><strong>Score:</strong> ${fullResult.mcqScore || fullResult.mcqResults.filter((m: any) => m.isCorrect).length}/${fullResult.mcqTotalMarks || fullResult.mcqResults.length}</p>
                ${fullResult.mcqResults.map((q: any, idx: number) => `
                  <div class="question-card">
                    <div class="question-header">Question ${idx + 1}</div>
                    <div class="question-text">${q.question || 'N/A'}</div>
                    <p><strong>Your Answer:</strong> ${q.selectedAnswer || 'Not answered'}</p>
                    <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
                    <span class="score-badge ${q.isCorrect ? 'score-correct' : 'score-incorrect'}">
                      ${q.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            ${fullResult?.subjectiveResults && fullResult.subjectiveResults.length > 0 ? `
              <div class="section">
                <div class="section-title">✍️ Subjective Questions</div>
                <p><strong>Score:</strong> ${fullResult.subjectiveScore}/${fullResult.subjectiveTotalMarks}</p>
                ${fullResult.subjectiveResults.map((q: any, idx: number) => {
                  const qNum = q.questionNumber || idx + 1;
                  const earned = q.earnedMarks ?? q.score ?? 0;
                  const max = q.maxMarks || 1;
                  const percentage = (earned / max) * 100;
                  const badgeClass = percentage >= 70 ? 'score-correct' : percentage >= 40 ? 'score-partial' : 'score-incorrect';
                  
                  return `
                    <div class="question-card">
                      <div class="question-header">Question ${qNum}</div>
                      <div class="question-text">${q.questionText || 'N/A'}</div>
                      ${q.studentAnswer ? `<p><strong>Your Answer:</strong> ${q.studentAnswer.substring(0, 200)}${q.studentAnswer.length > 200 ? '...' : ''}</p>` : ''}
                      ${q.feedback ? `<p><strong>Feedback:</strong> ${q.feedback}</p>` : ''}
                      <span class="score-badge ${badgeClass}">
                        ${earned}/${max} marks (${percentage.toFixed(0)}%)
                      </span>
                    </div>
                  `;
                }).join('')}
              </div>
            ` : ''}

            <div class="footer">
              <p><strong>Smart Study AI - Evaluation System</strong></p>
              <p>Generated on ${new Date().toLocaleString('en-IN')}</p>
              <p>This is a computer-generated report. No signature is required.</p>
            </div>
          </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Share or save PDF
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `${item.examTitle} - Report`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'PDF Generated',
          `PDF saved at: ${uri}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      Alert.alert('Export Failed', 'Failed to generate PDF report. Please try again.');
    } finally {
      setExportingPDF(null);
    }
  };

  const handleShareEvaluation = async (item: EvaluationHistoryItem) => {
    try {
      const fullResult = item.fullResult;
      
      let shareText = `📊 *${item.examTitle} - Evaluation Report*\n\n`;
      shareText += `📚 Subject: ${item.subject}\n`;
      shareText += `📅 Date: ${formatDate(item.evaluatedAt)}\n\n`;
      shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      shareText += `🎯 *OVERALL SCORE*\n`;
      shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      shareText += `📝 Total Score: ${item.grandScore}/${item.grandTotalMarks}\n`;
      shareText += `📈 Percentage: ${item.percentage?.toFixed(1)}%\n`;
      shareText += `🏆 Grade: ${item.grade}\n`;
      shareText += `${item.passed ? '✅ Status: PASSED' : '❌ Status: FAILED'}\n\n`;

      // MCQ Results
      if (fullResult?.mcqResults && fullResult.mcqResults.length > 0) {
        const mcqCorrect = fullResult.mcqResults.filter((m: any) => m.isCorrect).length;
        shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        shareText += `📋 *MCQ SECTION*\n`;
        shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        shareText += `Score: ${fullResult.mcqScore || mcqCorrect}/${fullResult.mcqTotalMarks || fullResult.mcqResults.length}\n\n`;
      }

      // Subjective Results
      if (fullResult?.subjectiveResults && fullResult.subjectiveResults.length > 0) {
        shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        shareText += `✍️ *SUBJECTIVE SECTION*\n`;
        shareText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        shareText += `Score: ${fullResult.subjectiveScore}/${fullResult.subjectiveTotalMarks}\n\n`;
        
        fullResult.subjectiveResults.forEach((q: any, idx: number) => {
          const qNum = q.questionNumber || idx + 1;
          const earned = q.earnedMarks ?? q.score ?? 0;
          const max = q.maxMarks || 1;
          shareText += `📌 Q${qNum}: ${earned}/${max} marks\n`;
          if (q.questionText) {
            shareText += `   ${q.questionText.substring(0, 50)}${q.questionText.length > 50 ? '...' : ''}\n`;
          }
        });
      }

      shareText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      shareText += `📱 Evaluated by Smart Study AI`;

      await Share.share({
        message: shareText,
        title: `${item.examTitle} - Evaluation Report`,
      });
    } catch (error) {
      console.error('Error sharing evaluation:', error);
    }
  };

  const getGradeColor = (grade: string): string => {
    switch (grade?.toUpperCase()) {
      case 'A+':
      case 'A':
        return COLORS.gradeA;
      case 'B+':
      case 'B':
        return COLORS.gradeB;
      case 'C+':
      case 'C':
        return COLORS.gradeC;
      case 'D':
        return COLORS.gradeD;
      default:
        return COLORS.gradeF;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHistoryItem = (item: EvaluationHistoryItem, index: number) => {
    const gradeColor = getGradeColor(item.grade);
    
    return (
      <TouchableOpacity
        key={item.id}
        style={styles.historyCard}
        onPress={() => handleViewResult(item)}
        onLongPress={() => handleDeleteItem(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={[styles.gradeCircle, { backgroundColor: gradeColor }]}>
              <Text style={styles.gradeText}>{item.grade}</Text>
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.examTitle} numberOfLines={1}>
                {item.examTitle}
              </Text>
              <Text style={styles.examSubject}>{item.subject}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.grandScore}/{item.grandTotalMarks}</Text>
            <Text style={styles.statLabel}>Score</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: gradeColor }]}>
              {item.percentage?.toFixed(1)}%
            </Text>
            <Text style={styles.statLabel}>Percentage</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons 
              name={item.passed ? "checkmark-circle" : "close-circle"} 
              size={20} 
              color={item.passed ? COLORS.success : COLORS.error} 
            />
            <Text style={styles.statLabel}>{item.passed ? 'Passed' : 'Failed'}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.dateContainer}>
            <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.dateText}>{formatDate(item.evaluatedAt)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={(e) => {
              e.stopPropagation();
              handleShareEvaluation(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={[COLORS.primary, COLORS.primaryLight]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Evaluation History</Text>
            <Text style={styles.headerSubtitle}>
              {history.length} {history.length === 1 ? 'result' : 'results'} saved
            </Text>
          </View>
          {history.length > 0 && (
            <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
              <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No Evaluations Yet</Text>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              Your exam evaluation results will appear here after you complete exams.
            </Text>
            <TouchableOpacity 
              style={styles.startExamButton}
              onPress={() => {
                onBack();
              }}
            >
              <Text style={styles.startExamButtonText}>Take an Exam</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.sectionHint, { color: theme.colors.textSecondary }]}>
              💡 Tap to view details • Long press to delete
            </Text>
            {history.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.historyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                onPress={() => handleViewResult(item)}
                onLongPress={() => handleDeleteItem(item)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <View style={[styles.gradeCircle, { backgroundColor: getGradeColor(item.grade) }]}>
                      <Text style={styles.gradeText}>{item.grade}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={[styles.examTitle, { color: theme.colors.text }]} numberOfLines={1}>
                        {item.examTitle}
                      </Text>
                      <Text style={[styles.examSubject, { color: theme.colors.textSecondary }]}>{item.subject}</Text>
                    </View>
                  </View>
                  <View style={styles.cardRight}>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
                  </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: theme.colors.divider }]} />

                <View style={styles.cardStats}>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: theme.colors.text }]}>{item.grandScore}/{item.grandTotalMarks}</Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Score</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.divider }]} />
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: getGradeColor(item.grade) }]}>
                      {item.percentage?.toFixed(1)}%
                    </Text>
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Percentage</Text>
                  </View>
                  <View style={[styles.statDivider, { backgroundColor: theme.colors.divider }]} />
                  <View style={styles.statItem}>
                    <Ionicons 
                      name={item.passed ? "checkmark-circle" : "close-circle"} 
                      size={20} 
                      color={item.passed ? COLORS.success : COLORS.error} 
                    />
                    <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>{item.passed ? 'Passed' : 'Failed'}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.dateContainer}>
                    <Ionicons name="time-outline" size={14} color={theme.colors.textTertiary} />
                    <Text style={[styles.dateText, { color: theme.colors.textTertiary }]}>{formatDate(item.evaluatedAt)}</Text>
                  </View>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.pdfButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleExportPDF(item);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={exportingPDF === item.id}
                    >
                      {exportingPDF === item.id ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                      ) : (
                        <>
                          <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                          <Text style={styles.pdfButtonText}>PDF</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.shareButton}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShareEvaluation(item);
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="share-social-outline" size={18} color={COLORS.primary} />
                      <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  clearButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
  },
  sectionHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gradeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  examSubject: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  cardRight: {
    paddingLeft: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  cardStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 6,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    minWidth: 65,
    justifyContent: 'center',
  },
  pdfButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  shareButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  startExamButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startExamButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerSpacer: {
    height: 40,
  },
});
