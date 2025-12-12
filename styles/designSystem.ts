/**
 * Study Assistant App - Design System
 * 
 * A comprehensive design system with consistent spacing, typography, 
 * colors, and component styles following Google Material Design
 * and modern educational app patterns.
 */

// ============================================
// SPACING SCALE (8px base)
// ============================================
export const SPACING = {
  xs: 4,    // Micro spacing
  sm: 8,    // Small spacing
  md: 12,   // Medium spacing
  lg: 16,   // Default component padding
  xl: 20,   // Section spacing
  xxl: 24,  // Card padding, major sections
  xxxl: 32, // Screen edges, large gaps
  huge: 48, // Hero sections
} as const;

// ============================================
// TYPOGRAPHY SCALE
// ============================================
export const TYPOGRAPHY = {
  // Display - Hero titles
  displayLarge: {
    fontSize: 32,
    fontWeight: '800' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  displaySmall: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  
  // Headlines - Section titles
  headlineLarge: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  headlineMedium: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 26,
  },
  headlineSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  
  // Titles - Card titles, list items
  titleLarge: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  titleMedium: {
    fontSize: 15,
    fontWeight: '600' as const,
    lineHeight: 21,
  },
  titleSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  
  // Body - Regular text
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 19,
  },
  
  // Labels - Buttons, chips, badges
  labelLarge: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  labelMedium: {
    fontSize: 12,
    fontWeight: '600' as const,
    lineHeight: 16,
    letterSpacing: 0.3,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
    letterSpacing: 0.4,
  },
  
  // Caption - Secondary info
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  captionSmall: {
    fontSize: 10,
    fontWeight: '400' as const,
    lineHeight: 14,
  },
} as const;

// ============================================
// COLOR PALETTE
// ============================================
export const COLORS = {
  // Primary - Educational Blue
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Main primary
    600: '#2563EB',  // Primary pressed
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },
  
  // Secondary - Teal (Education)
  secondary: {
    50: '#F0FDFA',
    100: '#CCFBF1',
    200: '#99F6E4',
    300: '#5EEAD4',
    400: '#2DD4BF',
    500: '#14B8A6',
    600: '#0D9488',
    700: '#0F766E',
  },
  
  // Success - Green
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    500: '#22C55E',
    600: '#16A34A',
    700: '#15803D',
  },
  
  // Warning - Amber
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  // Error - Red
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Neutral - Slate
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  // Semantic colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    tertiary: '#F1F5F9',
    gradient: ['#E0EAFC', '#CFDEF3'],
  },
  
  // Subject-specific colors
  subjects: {
    mathematics: '#3B82F6',
    science: '#10B981',
    english: '#F59E0B',
    history: '#8B5CF6',
    geography: '#EC4899',
    computer: '#06B6D4',
  },
} as const;

// ============================================
// BORDER RADIUS
// ============================================
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

// ============================================
// SHADOWS
// ============================================
export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ============================================
// ICON SIZES
// ============================================
export const ICON_SIZES = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 26,
  xl: 32,
  xxl: 40,
  huge: 48,
} as const;

// ============================================
// COMPONENT HEIGHTS
// ============================================
export const COMPONENT_HEIGHTS = {
  buttonSmall: 36,
  buttonMedium: 44,
  buttonLarge: 52,
  inputSmall: 40,
  inputMedium: 48,
  inputLarge: 56,
  headerCompact: 56,
  headerNormal: 64,
  headerLarge: 72,
  cardSmall: 80,
  cardMedium: 120,
  cardLarge: 160,
} as const;

export default {
  SPACING,
  TYPOGRAPHY,
  COLORS,
  RADIUS,
  SHADOWS,
  ICON_SIZES,
  COMPONENT_HEIGHTS,
};
