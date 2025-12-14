import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContext } from "../navigation/NavigationContext";

export default function ModelPaperScreen() {
  const { navigate, goBack, canGoBack } = useContext(NavigationContext);

  const handleBackNavigation = () => {
    if (canGoBack) {
      goBack();
    } else {
      navigate("home");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#1E3A8A", "#3B82F6", "#60A5FA"]} style={styles.gradient}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBackNavigation}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={styles.heroIconContainer}>
              <Ionicons name="document-text" size={80} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Model Question Papers</Text>
            <Text style={styles.heroSubtitle}>
              Download previous year and model question papers for your exam preparation
            </Text>
          </View>

          {/* Features Grid */}
          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Ionicons name="download" size={28} color="#3B82F6" />
              <Text style={styles.featureTitle}>Easy Download</Text>
              <Text style={styles.featureDesc}>Download PDFs directly</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="school" size={28} color="#10B981" />
              <Text style={styles.featureTitle}>All Subjects</Text>
              <Text style={styles.featureDesc}>Class 6 to Class 12</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="calendar" size={28} color="#F59E0B" />
              <Text style={styles.featureTitle}>Previous Years</Text>
              <Text style={styles.featureDesc}>Past exam papers</Text>
            </View>
            <View style={styles.featureCard}>
              <Ionicons name="checkmark-done" size={28} color="#8B5CF6" />
              <Text style={styles.featureTitle}>Board Pattern</Text>
              <Text style={styles.featureDesc}>Official format</Text>
            </View>
          </View>

          {/* Download Model Papers Button */}
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => navigate("download-papers")}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#10B981", "#059669"]}
              style={styles.downloadButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="download" size={28} color="#fff" />
              <Text style={styles.downloadButtonText}>Download Model Papers</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.noteText}>
            📝 Select your class and subject to download papers
          </Text>

          {/* Quick Links */}
          <View style={styles.quickLinksSection}>
            <Text style={styles.quickLinksTitle}>Quick Access</Text>
            
            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigate("syllabus")}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: "#EFF6FF" }]}>
                <Ionicons name="book" size={24} color="#3B82F6" />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>View Syllabus</Text>
                <Text style={styles.quickLinkDesc}>Check curriculum & chapters</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigate("puc-exam")}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: "#F0FDF4" }]}>
                <Ionicons name="create" size={24} color="#10B981" />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>Take PUC Exam</Text>
                <Text style={styles.quickLinkDesc}>Practice with AI evaluation</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickLinkCard}
              onPress={() => navigate("chat")}
            >
              <View style={[styles.quickLinkIcon, { backgroundColor: "#FEF3C7" }]}>
                <Ionicons name="chatbubbles" size={24} color="#F59E0B" />
              </View>
              <View style={styles.quickLinkContent}>
                <Text style={styles.quickLinkTitle}>Ask Doubts</Text>
                <Text style={styles.quickLinkDesc}>Get help from AI tutor</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  
  // Back Button
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  // Scroll Content
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  
  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  heroIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  
  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  featureCard: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1E293B",
    marginTop: 8,
    textAlign: "center",
  },
  featureDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  
  // Download Button
  downloadButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  downloadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 32,
    gap: 12,
  },
  downloadButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },
  noteText: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    marginBottom: 30,
  },

  // Quick Links
  quickLinksSection: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 16,
  },
  quickLinkCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  quickLinkIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E293B",
  },
  quickLinkDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
});
