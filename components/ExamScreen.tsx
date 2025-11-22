import React, { useContext, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createExamTemplate,
  ExamHistoryEntry,
  ExamQuestion,
  ExamSummaryResponse,
  ExamTemplateRequest,
  ExamTemplateResponse,
  startExam,
  StartExamResponse,
  submitExamAnswer,
  SubmitAnswerResponse,
  getExamSummary,
  getExamHistory,
  SubmitAnswerRequest,
} from "../services/examApi";
import { TabContext } from "../contexts/TabContext";

interface LoadingState {
  template?: boolean;
  start?: boolean;
  answer?: boolean;
  summary?: boolean;
  history?: boolean;
}

const defaultTemplatePayload: ExamTemplateRequest = {
  name: "",
  subject: "",
  chapter: "",
  totalQuestions: 10,
  durationMinutes: 30,
  adaptiveEnabled: true,
};

export default function ExamScreen() {
  const tabContext = useContext(TabContext);
  const [templatePayload, setTemplatePayload] = useState(defaultTemplatePayload);
  const [createdTemplate, setCreatedTemplate] =
    useState<ExamTemplateResponse | null>(null);
  const [activeAttempt, setActiveAttempt] =
    useState<StartExamResponse | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<ExamQuestion | null>(null);
  const [answerState, setAnswerState] = useState({
    selectedOptionId: "",
    freeTextAnswer: "",
    timeTakenSeconds: "30",
  });
  const [lastAnswerResponse, setLastAnswerResponse] =
    useState<SubmitAnswerResponse | null>(null);
  const [summary, setSummary] = useState<ExamSummaryResponse | null>(null);
  const [historyStudentId, setHistoryStudentId] = useState("");
  const [history, setHistory] = useState<ExamHistoryEntry[]>([]);
  const [loading, setLoading] = useState<LoadingState>({});

  const disableAnswerSubmit = useMemo(() => {
    if (!currentQuestion || !activeAttempt) {
      return true;
    }
    if (currentQuestion.type === "MultipleChoice") {
      return !answerState.selectedOptionId;
    }
    return false;
  }, [activeAttempt, currentQuestion, answerState.selectedOptionId]);

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const handleError = (error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Something went wrong";
    Alert.alert("Request failed", message);
  };

  const handleTemplateChange = (
    field: keyof ExamTemplateRequest,
    value: string
  ) => {
    if (field === "totalQuestions" || field === "durationMinutes") {
      setTemplatePayload((prev) => ({
        ...prev,
        [field]: toNumber(value),
      }));
    } else if (field === "adaptiveEnabled") {
      setTemplatePayload((prev) => ({
        ...prev,
        adaptiveEnabled: value === "true",
      }));
    } else {
      setTemplatePayload((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const handleCreateTemplate = async () => {
    setLoading((state) => ({ ...state, template: true }));
    try {
      const payload = {
        ...templatePayload,
        totalQuestions: Math.max(1, templatePayload.totalQuestions),
        durationMinutes: Math.max(1, templatePayload.durationMinutes),
      };
      const result = await createExamTemplate(payload);
      setCreatedTemplate(result);
      setActiveAttempt(null);
      setCurrentQuestion(null);
      setSummary(null);
      Alert.alert("Template created", `Template ID: ${result.id}`);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((state) => ({ ...state, template: false }));
    }
  };

  const [startForm, setStartForm] = useState({
    studentId: "",
    examTemplateId: "",
  });

  const handleStartExam = async () => {
    if (!startForm.studentId || !startForm.examTemplateId) {
      Alert.alert("Missing data", "Student ID and template ID are required");
      return;
    }
    setLoading((state) => ({ ...state, start: true }));
    try {
      const payload = {
        studentId: startForm.studentId.trim(),
        examTemplateId: toNumber(startForm.examTemplateId),
      };
      const result = await startExam(payload);
      setActiveAttempt(result);
      setCurrentQuestion(result.firstQuestion);
      setLastAnswerResponse(null);
      setSummary(null);
      setAnswerState({ selectedOptionId: "", freeTextAnswer: "", timeTakenSeconds: "30" });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((state) => ({ ...state, start: false }));
    }
  };

  const handleSelectOption = (optionId: number) => {
    setAnswerState((prev) => ({
      ...prev,
      selectedOptionId: String(optionId),
    }));
  };

  const handleSubmitAnswer = async () => {
    if (!activeAttempt || !currentQuestion) {
      return;
    }
    const request: SubmitAnswerRequest = {
      questionId: currentQuestion.id,
      selectedOptionId: currentQuestion.type === "MultipleChoice"
        ? toNumber(answerState.selectedOptionId)
        : null,
      freeTextAnswer:
        currentQuestion.type === "MultipleChoice"
          ? null
          : answerState.freeTextAnswer.trim() || null,
      timeTakenSeconds: Math.max(0, toNumber(answerState.timeTakenSeconds)),
    };

    setLoading((state) => ({ ...state, answer: true }));
    try {
      const response = await submitExamAnswer(activeAttempt.attemptId, request);
      setLastAnswerResponse(response);
      setCurrentQuestion(response.nextQuestion);
      if (!response.nextQuestion) {
        setSummary(null);
      }
      setAnswerState({
        selectedOptionId: "",
        freeTextAnswer: "",
        timeTakenSeconds: "30",
      });
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((state) => ({ ...state, answer: false }));
    }
  };

  const handleFetchSummary = async () => {
    if (!activeAttempt) {
      Alert.alert("No attempt", "Start an exam attempt first");
      return;
    }
    setLoading((state) => ({ ...state, summary: true }));
    try {
      const data = await getExamSummary(activeAttempt.attemptId);
      setSummary(data);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((state) => ({ ...state, summary: false }));
    }
  };

  const handleFetchHistory = async () => {
    if (!historyStudentId.trim()) {
      Alert.alert("Missing student", "Enter a student ID");
      return;
    }
    setLoading((state) => ({ ...state, history: true }));
    try {
      const result = await getExamHistory(historyStudentId.trim());
      setHistory(result);
    } catch (error) {
      handleError(error);
    } finally {
      setLoading((state) => ({ ...state, history: false }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {tabContext && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => tabContext.setActiveTab("chat")}
            activeOpacity={0.85}
          >
            <Text style={styles.backButtonText}>← Back to Chat Assistant</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.title}>My Exam Playground</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Create Exam Template</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={templatePayload.name}
              onChangeText={(value) => handleTemplateChange("name", value)}
              placeholder="E.g. Algebra Basics"
            />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={templatePayload.subject}
              onChangeText={(value) => handleTemplateChange("subject", value)}
              placeholder="Mathematics"
            />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Chapter</Text>
            <TextInput
              style={styles.input}
              value={templatePayload.chapter}
              onChangeText={(value) => handleTemplateChange("chapter", value)}
              placeholder="Linear Equations"
            />
          </View>
          <View style={styles.inlineRow}>
            <View style={styles.inlineItem}>
              <Text style={styles.label}>Total Questions</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(templatePayload.totalQuestions)}
                onChangeText={(value) => handleTemplateChange("totalQuestions", value)}
              />
            </View>
            <View style={styles.inlineItem}>
              <Text style={styles.label}>Duration (min)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={String(templatePayload.durationMinutes)}
                onChangeText={(value) => handleTemplateChange("durationMinutes", value)}
              />
            </View>
          </View>
          <View style={styles.inlineRow}>
            <View style={styles.inlineItem}>
              <Text style={styles.label}>Adaptive Mode</Text>
              <TextInput
                style={styles.input}
                value={templatePayload.adaptiveEnabled ? "true" : "false"}
                onChangeText={(value) => handleTemplateChange("adaptiveEnabled", value)}
                placeholder="true | false"
              />
            </View>
            <View style={styles.inlineItem}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleCreateTemplate}
                disabled={loading.template}
              >
                {loading.template ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          {createdTemplate && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Created template #{createdTemplate.id} • {createdTemplate.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Start Exam Attempt</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Student ID</Text>
            <TextInput
              style={styles.input}
              value={startForm.studentId}
              onChangeText={(value) => setStartForm((prev) => ({ ...prev, studentId: value }))}
              placeholder="student-001"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.fieldRow}>
            <Text style={styles.label}>Template ID</Text>
            <TextInput
              style={styles.input}
              value={startForm.examTemplateId}
              onChangeText={(value) => setStartForm((prev) => ({ ...prev, examTemplateId: value }))}
              placeholder="Enter template id"
              keyboardType="number-pad"
            />
          </View>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleStartExam}
            disabled={loading.start}
          >
            {loading.start ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Start Exam</Text>
            )}
          </TouchableOpacity>
          {activeAttempt && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Attempt #{activeAttempt.attemptId} ready for {activeAttempt.template.name}
              </Text>
            </View>
          )}
        </View>

        {currentQuestion && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Current Question</Text>
            <Text style={styles.questionTitle}>{currentQuestion.text}</Text>
            <Text style={styles.questionMeta}>
              {currentQuestion.subject} • {currentQuestion.chapter} • {currentQuestion.topic}
            </Text>
            <Text style={styles.questionMeta}>Difficulty: {currentQuestion.difficulty}</Text>
            <Text style={styles.questionMeta}>Type: {currentQuestion.type}</Text>

            {currentQuestion.type === "MultipleChoice" ? (
              <View style={styles.optionsList}>
                {currentQuestion.options.map((option) => {
                  const isSelected = answerState.selectedOptionId === String(option.optionId);
                  return (
                    <TouchableOpacity
                      key={option.optionId}
                      style={[styles.optionButton, isSelected && styles.optionSelected]}
                      onPress={() => handleSelectOption(option.optionId)}
                    >
                      <Text style={styles.optionText}>{option.optionText}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Your Answer</Text>
                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  multiline
                  value={answerState.freeTextAnswer}
                  onChangeText={(value) =>
                    setAnswerState((prev) => ({ ...prev, freeTextAnswer: value }))
                  }
                  placeholder="Type your response"
                />
              </View>
            )}

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Time Taken (seconds)</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={answerState.timeTakenSeconds}
                onChangeText={(value) =>
                  setAnswerState((prev) => ({ ...prev, timeTakenSeconds: value }))
                }
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, disableAnswerSubmit && styles.buttonDisabled]}
              onPress={handleSubmitAnswer}
              disabled={loading.answer || disableAnswerSubmit}
            >
              {loading.answer ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Submit Answer</Text>
              )}
            </TouchableOpacity>

            {lastAnswerResponse && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  {lastAnswerResponse.isCorrect === null
                    ? "Answer recorded"
                    : lastAnswerResponse.isCorrect
                    ? "Correct answer"
                    : "Incorrect answer"}
                </Text>
                <Text style={styles.infoMeta}>
                  Answered: {lastAnswerResponse.currentStats.answeredCount} • Correct: {lastAnswerResponse.currentStats.correctCount} • Wrong: {lastAnswerResponse.currentStats.wrongCount}
                </Text>
                <Text style={styles.infoMeta}>
                  Accuracy: {lastAnswerResponse.currentStats.currentAccuracy.toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary & History</Text>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleFetchSummary}
            disabled={loading.summary}
          >
            {loading.summary ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.secondaryButtonText}>Get Attempt Summary</Text>
            )}
          </TouchableOpacity>

          {summary && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Attempt #{summary.attemptId} • {summary.status}
              </Text>
              <Text style={styles.infoMeta}>
                Score: {summary.scorePercent.toFixed(1)}% ({summary.correctCount}/{summary.totalQuestions})
              </Text>
              <Text style={styles.infoMeta}>
                Started: {summary.startedAt}
              </Text>
              <Text style={styles.infoMeta}>
                Completed: {summary.completedAt}
              </Text>
            </View>
          )}

          <View style={styles.fieldRow}>
            <Text style={styles.label}>History Student ID</Text>
            <TextInput
              style={styles.input}
              value={historyStudentId}
              onChangeText={setHistoryStudentId}
              placeholder="student-001"
              autoCapitalize="none"
            />
          </View>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handleFetchHistory}
            disabled={loading.history}
          >
            {loading.history ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.secondaryButtonText}>Load History</Text>
            )}
          </TouchableOpacity>

          {history.length > 0 && (
            <View style={styles.listContainer}>
              {history.map((item) => (
                <View key={item.attemptId} style={styles.historyRow}>
                  <Text style={styles.historyTitle}>
                    #{item.attemptId} • {item.examName} ({item.scorePercent.toFixed(1)}%)
                  </Text>
                  <Text style={styles.historyMeta}>
                    {item.subject} • {item.chapter} • {item.status}
                  </Text>
                  <Text style={styles.historyMeta}>
                    {item.startedAt} → {item.completedAt}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  container: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginBottom: 4,
  },
  backButton: {
    alignSelf: "flex-start",
    backgroundColor: "#2563eb",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
  },
  fieldRow: {
    gap: 6,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-end",
  },
  inlineItem: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
  },
  multilineInput: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
  },
  secondaryButtonText: {
    color: "#0f172a",
    fontWeight: "700",
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 4,
  },
  infoText: {
    color: "#1d4ed8",
    fontWeight: "600",
  },
  infoMeta: {
    color: "#1e293b",
    fontSize: 13,
  },
  questionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0f172a",
  },
  questionMeta: {
    fontSize: 13,
    color: "#334155",
  },
  optionsList: {
    gap: 8,
  },
  optionButton: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  optionSelected: {
    borderColor: "#2563eb",
    backgroundColor: "#dbeafe",
  },
  optionText: {
    color: "#0f172a",
    fontSize: 15,
  },
  listContainer: {
    gap: 10,
  },
  historyRow: {
    borderWidth: 1,
    borderColor: "#cbd5f5",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  historyTitle: {
    fontWeight: "700",
    color: "#0f172a",
  },
  historyMeta: {
    fontSize: 13,
    color: "#334155",
  },
});
