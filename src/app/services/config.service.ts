import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ThemeConfig {
  // Colores principales
  primaryColor: string;
  primaryHover: string;
  primaryLight: string;
  
  // Colores del sidebar
  sidebarBg: string;
  sidebarText: string;
  sidebarHover: string;
  sidebarActive: string;
  
  // Colores del header
  headerBg: string;
  headerText: string;
  
  // Tipografía
  fontSizeBase: number;
  fontSizeSmall: number;
  fontSizeLarge: number;
  fontFamily: string;
  
  // Iconos
  iconSize: number;
  
  // Bordes
  borderRadius: number;
  
  // Modo oscuro
  darkMode: boolean;
  
  // Preset activo
  preset: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private readonly STORAGE_KEY = 'theme_config';
  
  // Presets de colores predefinidos
  private presets: { [key: string]: Partial<ThemeConfig> } = {
    'azul-corporativo': {
      primaryColor: '#3C50E0',
      primaryHover: '#2D42D0',
      primaryLight: 'rgba(60, 80, 224, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#F9FAFB',
      sidebarActive: 'rgba(60, 80, 224, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'verde-esmeralda': {
      primaryColor: '#10B981',
      primaryHover: '#059669',
      primaryLight: 'rgba(16, 185, 129, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#F0FDF4',
      sidebarActive: 'rgba(16, 185, 129, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'naranja-panaderia': {
      primaryColor: '#F97316',
      primaryHover: '#EA580C',
      primaryLight: 'rgba(249, 115, 22, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#FFF7ED',
      sidebarActive: 'rgba(249, 115, 22, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'morado-elegante': {
      primaryColor: '#8B5CF6',
      primaryHover: '#7C3AED',
      primaryLight: 'rgba(139, 92, 246, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#FAF5FF',
      sidebarActive: 'rgba(139, 92, 246, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'rojo-intenso': {
      primaryColor: '#EF4444',
      primaryHover: '#DC2626',
      primaryLight: 'rgba(239, 68, 68, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#FEF2F2',
      sidebarActive: 'rgba(239, 68, 68, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'cyan-moderno': {
      primaryColor: '#06B6D4',
      primaryHover: '#0891B2',
      primaryLight: 'rgba(6, 182, 212, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#ECFEFF',
      sidebarActive: 'rgba(6, 182, 212, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'rosa-suave': {
      primaryColor: '#EC4899',
      primaryHover: '#DB2777',
      primaryLight: 'rgba(236, 72, 153, 0.1)',
      sidebarBg: '#FFFFFF',
      sidebarText: '#374151',
      sidebarHover: '#FDF2F8',
      sidebarActive: 'rgba(236, 72, 153, 0.1)',
      headerBg: '#FFFFFF',
      headerText: '#1F2937'
    },
    'oscuro-profesional': {
      primaryColor: '#3C50E0',
      primaryHover: '#2D42D0',
      primaryLight: 'rgba(60, 80, 224, 0.2)',
      sidebarBg: '#1C2434',
      sidebarText: '#CBD5E1',
      sidebarHover: '#171F2C',
      sidebarActive: 'rgba(60, 80, 224, 0.2)',
      headerBg: '#1C2434',
      headerText: '#FFFFFF',
      darkMode: true
    },
    'slate-oscuro': {
      primaryColor: '#6366F1',
      primaryHover: '#4F46E5',
      primaryLight: 'rgba(99, 102, 241, 0.2)',
      sidebarBg: '#0F172A',
      sidebarText: '#E2E8F0',
      sidebarHover: '#1E293B',
      sidebarActive: 'rgba(99, 102, 241, 0.2)',
      headerBg: '#0F172A',
      headerText: '#F1F5F9',
      darkMode: true
    },
    'marron-calido': {
      primaryColor: '#D97706',
      primaryHover: '#B45309',
      primaryLight: 'rgba(217, 119, 6, 0.1)',
      sidebarBg: '#FFFBEB',
      sidebarText: '#78350F',
      sidebarHover: '#FEF3C7',
      sidebarActive: 'rgba(217, 119, 6, 0.15)',
      headerBg: '#FFFBEB',
      headerText: '#78350F'
    }
  };

  private defaultConfig: ThemeConfig = {
    primaryColor: '#3C50E0',
    primaryHover: '#2D42D0',
    primaryLight: 'rgba(60, 80, 224, 0.1)',
    sidebarBg: '#FFFFFF',
    sidebarText: '#374151',
    sidebarHover: '#F9FAFB',
    sidebarActive: 'rgba(60, 80, 224, 0.1)',
    headerBg: '#FFFFFF',
    headerText: '#1F2937',
    fontSizeBase: 14,
    fontSizeSmall: 12,
    fontSizeLarge: 16,
    fontFamily: 'Inter',
    iconSize: 20,
    borderRadius: 8,
    darkMode: false,
    preset: 'azul-corporativo'
  };

  public config$ = new BehaviorSubject<ThemeConfig>(this.defaultConfig);

  constructor() {
    this.loadConfig();
  }

  getConfig(): ThemeConfig {
    return this.config$.value;
  }

  getPresets(): { [key: string]: Partial<ThemeConfig> } {
    return this.presets;
  }

  applyPreset(presetName: string) {
    const preset = this.presets[presetName];
    if (preset) {
      const currentConfig = this.getConfig();
      const newConfig = { ...currentConfig, ...preset, preset: presetName };
      this.updateConfig(newConfig);
    }
  }

  updateConfig(newConfig: Partial<ThemeConfig>) {
    const currentConfig = this.getConfig();
    const updatedConfig = { ...currentConfig, ...newConfig };
    
    // Generar colores derivados automáticamente
    if (newConfig.primaryColor) {
      updatedConfig.primaryHover = this.adjustColor(newConfig.primaryColor, -20);
      updatedConfig.primaryLight = this.hexToRgba(newConfig.primaryColor, 0.1);
      updatedConfig.sidebarActive = this.hexToRgba(newConfig.primaryColor, 0.1);
    }
    
    this.config$.next(updatedConfig);
    this.saveConfig(updatedConfig);
    this.applyToDOM(updatedConfig);
  }

  private loadConfig() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const config = { ...this.defaultConfig, ...JSON.parse(saved) };
        this.config$.next(config);
        this.applyToDOM(config);
      } else {
        this.applyToDOM(this.defaultConfig);
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  private saveConfig(config: ThemeConfig) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  }

  private applyToDOM(config: ThemeConfig) {
    const root = document.documentElement;
    
    // Colores principales
    root.style.setProperty('--color-primary', config.primaryColor);
    root.style.setProperty('--color-primary-hover', config.primaryHover);
    root.style.setProperty('--color-primary-light', config.primaryLight);
    
    // Sidebar
    root.style.setProperty('--sidebar-bg', config.sidebarBg);
    root.style.setProperty('--sidebar-text', config.sidebarText);
    root.style.setProperty('--sidebar-hover', config.sidebarHover);
    root.style.setProperty('--sidebar-active', config.sidebarActive);
    
    // Header
    root.style.setProperty('--header-bg', config.headerBg);
    root.style.setProperty('--header-text', config.headerText);
    
    // Tipografía
    root.style.setProperty('--font-size-base', `${config.fontSizeBase}px`);
    root.style.setProperty('--font-size-small', `${config.fontSizeSmall}px`);
    root.style.setProperty('--font-size-large', `${config.fontSizeLarge}px`);
    root.style.setProperty('--font-family-base', this.getFontFamilyValue(config.fontFamily));
    
    // Iconos
    root.style.setProperty('--icon-size', `${config.iconSize}px`);
    
    // Bordes
    root.style.setProperty('--border-radius', `${config.borderRadius}px`);
    
    // Modo oscuro
    if (config.darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('darkMode', config.darkMode ? 'true' : 'false');
  }

  private getFontFamilyValue(fontFamily: string): string {
    const fonts: { [key: string]: string } = {
      'Inter': "'Inter', ui-sans-serif, system-ui, sans-serif",
      'Roboto': "'Roboto', ui-sans-serif, system-ui, sans-serif",
      'Poppins': "'Poppins', ui-sans-serif, system-ui, sans-serif",
      'Open Sans': "'Open Sans', ui-sans-serif, system-ui, sans-serif",
      'Montserrat': "'Montserrat', ui-sans-serif, system-ui, sans-serif",
      'Lato': "'Lato', ui-sans-serif, system-ui, sans-serif"
    };
    return fonts[fontFamily] || fonts['Inter'];
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) + amount;
    let g = ((num >> 8) & 0x00FF) + amount;
    let b = (num & 0x0000FF) + amount;
    
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  resetToDefault() {
    this.updateConfig(this.defaultConfig);
  }
}