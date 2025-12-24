/**
 * Sample script to set up distinct themes for tenants
 * Run with: npx tsx scripts/setup-tenant-theme.ts
 */

import mongoose from 'mongoose';
import Tenant from '../lib/models/Tenant';
import * as dotenv from 'dotenv';

dotenv.config();

// Sample theme presets that can be used for different tenants
const THEME_PRESETS = {
  // Ocean Adventure Theme - Perfect for water sports, speedboats, diving
  'ocean-adventure': {
    themeId: 'ocean-adventure',
    themeName: 'Ocean Adventure',
    colors: {
      primary: '#00D4FF',
      primaryHover: '#00B8E6',
      primaryLight: '#E0F7FF',
      secondary: '#0A1628',
      secondaryHover: '#1E3A5F',
      accent: '#FF6B35',
      accentHover: '#E55A2B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#0EA5E9',
      background: '#FFFFFF',
      backgroundAlt: '#F0F9FF',
      surface: '#FFFFFF',
      surfaceHover: '#F0F9FF',
      text: '#0A1628',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E0F7FF',
      borderHover: '#00D4FF',
      divider: '#E0F7FF',
      rating: '#FFD700',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #00D4FF 0%, #0891B2 100%)',
      secondary: 'linear-gradient(135deg, #0A1628 0%, #1E3A5F 100%)',
      hero: 'linear-gradient(180deg, rgba(10,22,40,0.9) 0%, rgba(10,22,40,0.4) 50%, rgba(0,212,255,0.2) 100%)',
      card: 'linear-gradient(180deg, #FFFFFF 0%, #F0F9FF 100%)',
      button: 'linear-gradient(135deg, #00D4FF 0%, #0891B2 100%)',
      overlay: 'linear-gradient(180deg, rgba(10,22,40,0.8) 0%, rgba(10,22,40,0.4) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 212, 255, 0.05)',
      md: '0 4px 6px -1px rgba(0, 212, 255, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 212, 255, 0.15)',
      xl: '0 20px 25px -5px rgba(0, 212, 255, 0.2)',
      primary: '0 4px 14px 0 rgba(0, 212, 255, 0.35)',
      card: '0 4px 20px rgba(10, 22, 40, 0.1)',
      button: '0 4px 14px 0 rgba(0, 212, 255, 0.3)',
      dropdown: '0 10px 40px rgba(10, 22, 40, 0.15)',
    },
    typography: {
      fontFamily: 'Inter',
      fontFamilyHeading: 'Inter',
      fontFamilyMono: 'SFMono-Regular, Menlo, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0',
      headingLetterSpacing: '-0.02em',
    },
    layout: {
      borderRadius: '12px',
      borderRadiusSm: '8px',
      borderRadiusLg: '16px',
      borderRadiusXl: '24px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1400px',
      headerHeight: '80px',
      footerStyle: 'expanded' as const,
    },
    components: {
      header: {
        background: 'rgba(10, 22, 40, 0.95)',
        backgroundScrolled: 'rgba(10, 22, 40, 0.98)',
        textColor: '#FFFFFF',
        style: 'solid' as const,
        position: 'fixed' as const,
        blur: true,
      },
      footer: {
        background: '#0A1628',
        textColor: '#E0F7FF',
        style: 'dark' as const,
      },
      buttons: {
        style: 'pill' as const,
        primaryBg: '#00D4FF',
        primaryText: '#0A1628',
        primaryHoverBg: '#00B8E6',
        secondaryBg: '#0A1628',
        secondaryText: '#00D4FF',
        outlineBorderColor: '#00D4FF',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-8px)',
        imageBorderRadius: '12px',
      },
      badges: {
        background: '#00D4FF',
        textColor: '#0A1628',
        style: 'pill' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E0F7FF',
        focusBorderColor: '#00D4FF',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '250ms',
      durationFast: '150ms',
      durationSlow: '350ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.03',
    },
    darkMode: {
      enabled: true,
    },
  },

  // Desert Gold Theme - Perfect for Egypt, pyramids, desert tours
  'desert-gold': {
    themeId: 'desert-gold',
    themeName: 'Desert Gold',
    colors: {
      primary: '#E63946',
      primaryHover: '#D32F3F',
      primaryLight: '#FEE2E2',
      secondary: '#1D3557',
      secondaryHover: '#457B9D',
      accent: '#F4A261',
      accentHover: '#E76F51',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#DC2626',
      info: '#3B82F6',
      background: '#FFFBF5',
      backgroundAlt: '#FFF7ED',
      surface: '#FFFFFF',
      surfaceHover: '#FFF7ED',
      text: '#1F2937',
      textMuted: '#6B7280',
      textInverse: '#FFFFFF',
      border: '#E5E7EB',
      borderHover: '#E63946',
      divider: '#E5E7EB',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #E63946 0%, #D32F3F 100%)',
      secondary: 'linear-gradient(135deg, #1D3557 0%, #457B9D 100%)',
      hero: 'linear-gradient(180deg, rgba(29,53,87,0.8) 0%, rgba(0,0,0,0.4) 100%)',
      card: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 100%)',
      button: 'linear-gradient(135deg, #E63946 0%, #D32F3F 100%)',
      overlay: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      primary: '0 4px 14px 0 rgba(230, 57, 70, 0.3)',
      card: '0 4px 20px rgba(0, 0, 0, 0.08)',
      button: '0 4px 14px 0 rgba(230, 57, 70, 0.25)',
      dropdown: '0 10px 40px rgba(0, 0, 0, 0.12)',
    },
    typography: {
      fontFamily: 'Inter',
      fontFamilyHeading: 'Playfair Display',
      fontFamilyMono: 'SFMono-Regular, Menlo, monospace',
      baseFontSize: '16px',
      lineHeight: '1.6',
      headingLineHeight: '1.25',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '0',
      headingLetterSpacing: '-0.01em',
    },
    layout: {
      borderRadius: '8px',
      borderRadiusSm: '4px',
      borderRadiusLg: '12px',
      borderRadiusXl: '16px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1280px',
      headerHeight: '72px',
      footerStyle: 'standard' as const,
    },
    components: {
      header: {
        background: 'rgba(255, 255, 255, 0.95)',
        backgroundScrolled: 'rgba(255, 255, 255, 0.98)',
        textColor: '#1D3557',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: true,
      },
      footer: {
        background: '#1D3557',
        textColor: '#F8FAFC',
        style: 'dark' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#E63946',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#D32F3F',
        secondaryBg: '#1D3557',
        secondaryText: '#FFFFFF',
        outlineBorderColor: '#E5E7EB',
      },
      cards: {
        style: 'elevated' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-4px)',
        imageBorderRadius: '8px',
      },
      badges: {
        background: '#E63946',
        textColor: '#FFFFFF',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E5E7EB',
        focusBorderColor: '#E63946',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '200ms',
      durationFast: '150ms',
      durationSlow: '300ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.02',
    },
    darkMode: {
      enabled: false,
    },
  },

  // Modern Minimal Theme - Clean, professional, tech-forward
  'modern-minimal': {
    themeId: 'modern-minimal',
    themeName: 'Modern Minimal',
    colors: {
      primary: '#0F172A',
      primaryHover: '#1E293B',
      primaryLight: '#F1F5F9',
      secondary: '#6366F1',
      secondaryHover: '#4F46E5',
      accent: '#8B5CF6',
      accentHover: '#7C3AED',
      success: '#22C55E',
      warning: '#EAB308',
      error: '#EF4444',
      info: '#06B6D4',
      background: '#FFFFFF',
      backgroundAlt: '#F8FAFC',
      surface: '#FFFFFF',
      surfaceHover: '#F1F5F9',
      text: '#0F172A',
      textMuted: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      borderHover: '#CBD5E1',
      divider: '#E2E8F0',
      rating: '#FBBF24',
    },
    gradients: {
      primary: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      secondary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
      hero: 'linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.5) 100%)',
      card: 'none',
      button: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      overlay: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 100%)',
    },
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.08)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      primary: '0 4px 14px 0 rgba(15, 23, 42, 0.15)',
      card: '0 1px 3px rgba(0, 0, 0, 0.05)',
      button: '0 4px 14px 0 rgba(15, 23, 42, 0.1)',
      dropdown: '0 10px 40px rgba(0, 0, 0, 0.08)',
    },
    typography: {
      fontFamily: 'Inter',
      fontFamilyHeading: 'Inter',
      fontFamilyMono: 'JetBrains Mono, monospace',
      baseFontSize: '15px',
      lineHeight: '1.7',
      headingLineHeight: '1.2',
      fontWeightNormal: 400,
      fontWeightMedium: 500,
      fontWeightSemibold: 600,
      fontWeightBold: 700,
      letterSpacing: '-0.01em',
      headingLetterSpacing: '-0.03em',
    },
    layout: {
      borderRadius: '6px',
      borderRadiusSm: '4px',
      borderRadiusLg: '8px',
      borderRadiusXl: '12px',
      borderRadiusFull: '9999px',
      containerMaxWidth: '1200px',
      headerHeight: '64px',
      footerStyle: 'minimal' as const,
    },
    components: {
      header: {
        background: '#FFFFFF',
        backgroundScrolled: '#FFFFFF',
        textColor: '#0F172A',
        style: 'solid' as const,
        position: 'sticky' as const,
        blur: false,
      },
      footer: {
        background: '#F8FAFC',
        textColor: '#64748B',
        style: 'light' as const,
      },
      buttons: {
        style: 'rounded' as const,
        primaryBg: '#0F172A',
        primaryText: '#FFFFFF',
        primaryHoverBg: '#1E293B',
        secondaryBg: '#F1F5F9',
        secondaryText: '#0F172A',
        outlineBorderColor: '#E2E8F0',
      },
      cards: {
        style: 'bordered' as const,
        background: '#FFFFFF',
        hoverTransform: 'translateY(-2px)',
        imageBorderRadius: '6px',
      },
      badges: {
        background: '#F1F5F9',
        textColor: '#0F172A',
        style: 'rounded' as const,
      },
      inputs: {
        background: '#FFFFFF',
        borderColor: '#E2E8F0',
        focusBorderColor: '#0F172A',
        style: 'outlined' as const,
      },
    },
    animations: {
      enabled: true,
      duration: '150ms',
      durationFast: '100ms',
      durationSlow: '250ms',
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      hoverScale: '1.01',
    },
    darkMode: {
      enabled: true,
    },
  },
};

async function setupTenantTheme(tenantId: string, themePreset: keyof typeof THEME_PRESETS) {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');

    const theme = THEME_PRESETS[themePreset];
    
    const result = await Tenant.findOneAndUpdate(
      { tenantId },
      { $set: { theme } },
      { new: true }
    );

    if (result) {
      console.log(`✅ Successfully applied "${themePreset}" theme to tenant "${tenantId}"`);
      console.log(`   Theme ID: ${theme.themeId}`);
      console.log(`   Theme Name: ${theme.themeName}`);
      console.log(`   Primary Color: ${theme.colors.primary}`);
    } else {
      console.log(`❌ Tenant "${tenantId}" not found`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Example usage:
// Apply ocean theme to speedboat tenant
if (process.argv[2] && process.argv[3]) {
  const tenantId = process.argv[2];
  const themePreset = process.argv[3] as keyof typeof THEME_PRESETS;
  
  if (THEME_PRESETS[themePreset]) {
    setupTenantTheme(tenantId, themePreset);
  } else {
    console.log('Available theme presets:', Object.keys(THEME_PRESETS).join(', '));
  }
} else {
  console.log('Usage: npx tsx scripts/setup-tenant-theme.ts <tenantId> <themePreset>');
  console.log('Available presets:', Object.keys(THEME_PRESETS).join(', '));
  console.log('\nExample: npx tsx scripts/setup-tenant-theme.ts hurghada-speedboat ocean-adventure');
}

export { THEME_PRESETS };



