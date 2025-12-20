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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NavigationContext } from '../navigation/NavigationContext';
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
  const [history, setHistory] = useState<EvaluationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
          <Ionicons name="time-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.dateText}>{formatDate(item.evaluatedAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.loadingText}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="document-text-outline" size={64} color={COLORS.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Evaluations Yet</Text>
            <Text style={styles.emptyText}>
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
            <Text style={styles.sectionHint}>
              💡 Tap to view details • Long press to delete
            </Text>
            {history.map((item, index) => renderHistoryItem(item, index))}
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
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginLeft: 6,
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
