import React, { useState, useEffect, useContext } from "react";
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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContext } from "../navigation/NavigationContext";
import {
  getQuestionPapers,
  QuestionPaperGroup,
  QuestionPaperFile,
  SUBJECTS_BY_CLASS,
} from "../services/questionPaperApi";

// Available grades
const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

// Subject icons mapping
const SUBJECT_ICONS: Record<string, string> = {
  Mathematics: "calculator-outline",
  Physics: "planet-outline",
  Chemistry: "flask-outline",
  Biology: "leaf-outline",
  English: "book-outline",
  "Computer Science": "desktop-outline",
  Electronics: "hardware-chip-outline",
  Accountancy: "cash-outline",
  "Business Studies": "briefcase-outline",
  Economics: "trending-up-outline",
  Statistics: "bar-chart-outline",
  History: "time-outline",
  "Political Science": "people-outline",
  Kannada: "language-outline",
  Hindi: "language-outline",
  Science: "flask-outline",
  "Social Science": "globe-outline",
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
  Statistics: "#F59E0B",
  History: "#6366F1",
  "Political Science": "#84CC16",
  Kannada: "#F97316",
  Hindi: "#EF4444",
  Science: "#10B981",
  "Social Science": "#3B82F6",
  default: "#6B7280",
};

export default function DownloadModelPapersScreen() {
  const { goBack } = useContext(NavigationContext);
  
  // Filter state
  const [selectedGrade, setSelectedGrade] = useState<string>("12");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  
  // Data state
  const [questionPapers, setQuestionPapers] = useState<QuestionPaperGroup[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<QuestionPaperGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected paper files
  const [selectedPaperGroup, setSelectedPaperGroup] = useState<QuestionPaperGroup | null>(null);

  useEffect(() => {
    loadQuestionPapers();
  }, []);

  useEffect(() => {
    filterPapers();
  }, [selectedGrade, selectedSubject, questionPapers]);

  const loadQuestionPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getQuestionPapers();
      if (response.status === "success" && response.questionPapers) {
        setQuestionPapers(response.questionPapers);
      } else {
        setError("No model papers available");
      }
    } catch (err: any) {
      console.error("Failed to load question papers:", err);
      setError(err.message || "Failed to load model papers");
    } finally {
      setLoading(false);
    }
  };

  const filterPapers = () => {
    let filtered = [...questionPapers];
    
    if (selectedGrade) {
      filtered = filtered.filter(paper => paper.grade === selectedGrade);
    }
    
    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject === selectedSubject);
    }
    
    setFilteredPapers(filtered);
  };

  const handleDownload = async (paper: QuestionPaperFile) => {
    try {
      const blobUrl = paper.blobUrl;
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
  const getSubjectsForGrade = () => SUBJECTS_BY_CLASS[selectedGrade] || SUBJECTS_BY_CLASS['default'];

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Dropdown picker modal
  const renderPickerModal = (
    visible: boolean,
    onClose: () => void,
    title: string,
    options: string[],
    selectedValue: string | null,
    onSelect: (value: string) => void
  ) => (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll}>
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.modalOption,
                  selectedValue === option && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  onSelect(option);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedValue === option && styles.modalOptionTextSelected,
                  ]}
                >
                  {title === "Select Grade" ? `Class ${option}` : option}
                </Text>
                {selectedValue === option && (
                  <Ionicons name="checkmark" size={20} color="#7C3AED" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderSubjectCard = ({ item }: { item: QuestionPaperGroup }) => {
    const icon = getIcon(item.subject);
    const color = getColor(item.subject);

    return (
      <TouchableOpacity
        style={styles.subjectCard}
        onPress={() => setSelectedPaperGroup(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon as any} size={28} color={color} />
        </View>
        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>{item.subject}</Text>
          <Text style={styles.subjectMeta}>
            Class {item.grade} • {item.paperCount} paper{item.paperCount !== 1 ? "s" : ""}
          </Text>
          <Text style={styles.latestUpload}>
            Latest: {formatDate(item.latestUpload)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>
    );
  };

  const renderPaperItem = ({ item }: { item: QuestionPaperFile }) => (
    <TouchableOpacity
      style={styles.fileCard}
      onPress={() => handleDownload(item)}
      activeOpacity={0.7}
    >
      <View style={styles.fileIconContainer}>
        <Ionicons name="document-text" size={24} color="#7C3AED" />
      </View>
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={2}>
          {item.fileName}
        </Text>
        <View style={styles.fileMeta}>
          {item.academicYear && (
            <Text style={styles.fileMetaText}>{item.academicYear}</Text>
          )}
          {item.paperType && (
            <View style={styles.paperTypeBadge}>
              <Text style={styles.paperTypeText}>{item.paperType}</Text>
            </View>
          )}
        </View>
        <Text style={styles.fileDate}>
          {formatFileSize(item.fileSize)} • {formatDate(item.uploadedAt)}
        </Text>
      </View>
      <View style={[styles.downloadButton, { backgroundColor: "#7C3AED" }]}>
        <Ionicons name="download" size={20} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
        <LinearGradient colors={["#7C3AED", "#A855F7"]} style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="document-text-outline" size={32} color="#fff" />
            <Text style={styles.headerTitle}>Download Model Papers</Text>
            <Text style={styles.headerSubtitle}>Karnataka State Board</Text>
          </View>
        </LinearGradient>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={styles.loadingText}>Loading model papers...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Paper files view (when a subject is selected)
  if (selectedPaperGroup) {
    const color = getColor(selectedPaperGroup.subject);
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="light-content" backgroundColor={color} />
        <LinearGradient 
          colors={[color, color + "CC"]} 
          style={styles.header}
        >
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setSelectedPaperGroup(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name={getIcon(selectedPaperGroup.subject) as any} size={32} color="#fff" />
            <Text style={styles.headerTitle}>{selectedPaperGroup.subject}</Text>
            <Text style={styles.headerSubtitle}>
              Class {selectedPaperGroup.grade} Model Papers
            </Text>
          </View>
        </LinearGradient>

        {selectedPaperGroup.papers.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="document-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No papers available</Text>
          </View>
        ) : (
          <FlatList
            data={selectedPaperGroup.papers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderPaperItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </SafeAreaView>
    );
  }

  // Main view with filters
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />

      {/* Header */}
      <LinearGradient
        colors={["#7C3AED", "#A855F7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Ionicons name="document-text-outline" size={32} color="#fff" />
          <Text style={styles.headerTitle}>Download Model Papers</Text>
          <Text style={styles.headerSubtitle}>Karnataka State Board</Text>
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Filter by:</Text>
        <View style={styles.filtersRow}>
          {/* Grade Dropdown */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowGradePicker(true)}
          >
            <Ionicons name="school-outline" size={18} color="#7C3AED" />
            <Text style={styles.dropdownText}>Class {selectedGrade}</Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>

          {/* Subject Dropdown */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowSubjectPicker(true)}
          >
            <Ionicons name="book-outline" size={18} color="#7C3AED" />
            <Text style={styles.dropdownText} numberOfLines={1}>
              {selectedSubject || "All Subjects"}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#6B7280" />
          </TouchableOpacity>
        </View>
        
        {selectedSubject && (
          <TouchableOpacity
            style={styles.clearFilterButton}
            onPress={() => setSelectedSubject(null)}
          >
            <Text style={styles.clearFilterText}>Clear subject filter</Text>
            <Ionicons name="close-circle" size={16} color="#7C3AED" />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadQuestionPapers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredPapers.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="folder-open-outline" size={48} color="#9CA3AF" />
          <Text style={styles.emptyText}>
            No model papers found for Class {selectedGrade}
            {selectedSubject ? ` - ${selectedSubject}` : ""}
          </Text>
          <Text style={styles.emptySubtext}>
            Try changing the filters or check back later
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Available Papers</Text>
            <Text style={styles.sectionSubtitle}>
              {filteredPapers.length} subject{filteredPapers.length !== 1 ? "s" : ""} with papers
            </Text>
          </View>
          <FlatList
            data={filteredPapers}
            keyExtractor={(item, index) => `${item.subject}-${item.grade}-${index}`}
            renderItem={renderSubjectCard}
            contentContainerStyle={styles.listContainer}
          />
        </>
      )}

      {/* Grade Picker Modal */}
      {renderPickerModal(
        showGradePicker,
        () => setShowGradePicker(false),
        "Select Grade",
        GRADES,
        selectedGrade,
        (grade) => {
          setSelectedGrade(grade);
          setSelectedSubject(null); // Reset subject when grade changes
        }
      )}

      {/* Subject Picker Modal */}
      {renderPickerModal(
        showSubjectPicker,
        () => setShowSubjectPicker(false),
        "Select Subject",
        getSubjectsForGrade(),
        selectedSubject,
        setSelectedSubject
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
  filtersContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  filtersRow: {
    flexDirection: "row",
    gap: 12,
  },
  dropdown: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 8,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1E293B",
  },
  clearFilterButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 4,
  },
  clearFilterText: {
    fontSize: 13,
    color: "#7C3AED",
    fontWeight: "500",
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
    color: "#6B7280",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "500",
  },
  emptySubtext: {
    marginTop: 4,
    color: "#9CA3AF",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: "#7C3AED",
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
  latestUpload: {
    fontSize: 12,
    color: "#9CA3AF",
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
    backgroundColor: "#F3E8FF",
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
  fileMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 8,
  },
  fileMetaText: {
    fontSize: 12,
    color: "#64748B",
  },
  paperTypeBadge: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paperTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  modalScroll: {
    padding: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginVertical: 2,
  },
  modalOptionSelected: {
    backgroundColor: "#F3E8FF",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#1E293B",
  },
  modalOptionTextSelected: {
    fontWeight: "600",
    color: "#7C3AED",
  },
});
