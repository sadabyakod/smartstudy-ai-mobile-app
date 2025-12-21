import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContext } from "../navigation/NavigationContext";
import { useTheme } from "../contexts/ThemeContext";
import { 
  getTextbooks, 
  SubjectTextbook,
  TextbookFile,
  SyllabusFile 
} from "../services/syllabusApi";
import { API_BASE_URL } from "../config/api";

// Subject icons mapping
const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "calculator-outline",
  Physics: "planet-outline",
  Chemistry: "flask-outline",
  Biology: "leaf-outline",
  English: "book-outline",
  "Computer Science": "desktop-outline",
  Electronics: "hardware-chip-outline",
  default: "document-outline",
};

const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "#2563EB",
  Physics: "#7C3AED",
  Chemistry: "#059669",
  Biology: "#16A34A",
  English: "#EA580C",
  "Computer Science": "#0891B2",
  Electronics: "#DC2626",
  Accountancy: "#8B5CF6",
  "Business Studies": "#EC4899",
  Economics: "#14B8A6",
  Kannada: "#F59E0B",
  default: "#6B7280",
};

export default function SyllabusScreen() {
  const { goBack } = React.useContext(NavigationContext);
  const { theme } = useTheme();
  const [subjects, setSubjects] = useState<SubjectTextbook[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [files, setFiles] = useState<TextbookFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grade = "12";

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTextbooks();
      if (data.success && data.subjects) {
        setSubjects(data.subjects);
      } else {
        setError("No textbooks available");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load textbooks");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectPress = (subject: string) => {
    setSelectedSubject(subject);
    const subjectData = subjects.find(s => s.subject === subject);
    if (subjectData) {
      setFiles(subjectData.files);
    } else {
      setFiles([]);
    }
  };

  const handleDownload = async (file: TextbookFile) => {
    try {
      // Construct the blob URL
      const blobUrl = `https://stsmartstudydev.blob.core.windows.net/textbooks/${grade}/${selectedSubject}/${file.fileName}`;
      const supported = await Linking.canOpenURL(blobUrl);
      if (supported) {
        await Linking.openURL(blobUrl);
      } else {
        Alert.alert("Error", "Cannot open this file. Please try again later.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to open file. Please check your internet connection.");
    }
  };

  const getIcon = (subject: string) => SUBJECT_ICONS[subject] || SUBJECT_ICONS.default;
  const getColor = (subject: string) => SUBJECT_COLORS[subject] || SUBJECT_COLORS.default;

  const renderSubjectItem = ({ item }: { item: SubjectTextbook }) => {
    const icon = getIcon(item.subject);
    const color = getColor(item.subject);

    return (
      <TouchableOpacity
        style={[styles.subjectCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        onPress={() => handleSubjectPress(item.subject)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <View style={styles.subjectInfo}>
          <Text style={[styles.subjectName, { color: theme.colors.text }]}>{item.subject}</Text>
          <Text style={[styles.subjectMeta, { color: theme.colors.textSecondary }]}>
            {item.fileCount} file{item.fileCount !== 1 ? "s" : ""} available
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textTertiary} />
      </TouchableOpacity>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderFileItem = ({ item }: { item: TextbookFile }) => (
    <TouchableOpacity
      style={[styles.fileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={() => handleDownload(item)}
      activeOpacity={0.7}
    >
      <View style={styles.fileIconContainer}>
        <Ionicons name="document-text" size={24} color="#3B82F6" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, { color: theme.colors.text }]} numberOfLines={2}>
          {item.fileName.replace(/^[a-f0-9-]+_/, '')}
        </Text>
        <Text style={[styles.fileDate, { color: theme.colors.textSecondary }]}>
          Size: {formatFileSize(item.size)}
        </Text>
      </View>
      <View style={[styles.downloadButton, { backgroundColor: selectedSubject ? getColor(selectedSubject) : '#3B82F6' }]}>
        <Ionicons name="download" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#EA580C" />
        <LinearGradient colors={["#EA580C", "#F97316"]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="download-outline" size={32} color="#fff" />
            <Text style={styles.headerTitle}>Download Syllabus</Text>
            <Text style={styles.headerSubtitle}>Karnataka {grade} 2024-25</Text>
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading subjects...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Files view (when subject is selected)
  if (selectedSubject) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={getColor(selectedSubject)} />
        <LinearGradient 
          colors={[getColor(selectedSubject), getColor(selectedSubject) + "CC"]} 
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => {
              setSelectedSubject(null);
              setFiles([]);
            }}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name={getIcon(selectedSubject) as any} size={32} color="#fff" />
            <Text style={styles.headerTitle}>{selectedSubject}</Text>
            <Text style={styles.headerSubtitle}>{grade} Syllabus Files</Text>
          </View>
        </LinearGradient>

        {loadingFiles ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={getColor(selectedSubject)} />
            <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading files...</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={() => handleSubjectPress(selectedSubject)}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : files.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-outline" size={48} color="#9CA3AF" />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No files available for {selectedSubject}</Text>
          </View>
        ) : (
          <FlatList
            data={files}
            keyExtractor={(item) => item.fileName}
            renderItem={renderFileItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </SafeAreaView>
    );
  }

  // Subjects list view
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#EA580C" />

      {/* Header */}
      <LinearGradient
        colors={["#EA580C", "#F97316"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="download-outline" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Download Syllabus</Text>
          <Text style={styles.headerSubtitle}>Karnataka {grade} 2024-25</Text>
        </View>
      </LinearGradient>

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: theme.colors.text }]}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadSubjects}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : subjects.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No subjects available</Text>
        </View>
      ) : (
        <>
          <View style={[styles.sectionHeader, { backgroundColor: theme.colors.background }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Select Subject</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Tap to view available syllabus files</Text>
          </View>
          <FlatList
            data={subjects}
            keyExtractor={(item) => item.subject}
            renderItem={renderSubjectItem}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    color: "#EF4444",
    fontSize: 14,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 12,
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#EA580C",
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  sectionHeader: {
    padding: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F172A",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#64748B",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  subjectInfo: {
    flex: 1,
    marginLeft: 14,
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F172A",
  },
  subjectMeta: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  fileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },
  fileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  fileDate: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  downloadButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});
