import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface AppConfig {
  // Apariencia
  theme: 'light' | 'dark' | 'auto';
  primaryColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  density: 'compact' | 'normal' | 'spacious';
  sidebarCollapsed: boolean;
  
  // Notificaciones
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationSound: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  
  // Sistema
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  autoLogoutMinutes: number;
  
  // BPM
  defaultEstablishment: string;
  requireSignature: boolean;
  allowPhotos: boolean;
  
  // Accesibilidad
  highContrast: boolean;
  reduceAnimations: boolean;
  iconSize: 'small' | 'medium' | 'large';
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<AppConfig>(this.getDefaultConfig());
  public config$ = this.configSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
  // Cargar configuración guardada inmediatamente
  const saved = localStorage.getItem('appConfig');
  if (saved) {
    try {
      const config = JSON.parse(saved);
      this.configSubject.next(config);
      this.applyConfig(config);
    } catch (e) {
      console.error('Error cargando config guardada:', e);
    }
  }
  
  // Luego cargar desde Supabase
  this.loadConfig();
}

  getDefaultConfig(): AppConfig {
    return {
      theme: 'light',
      primaryColor: '#3C50E0',
      fontFamily: 'Inter',
      fontSize: 'medium',
      density: 'normal',
      sidebarCollapsed: false,
      
      notificationsEnabled: true,
      emailNotifications: true,
      pushNotifications: true,
      notificationSound: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      
      language: 'es',
      timezone: 'America/Mexico_City',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      autoLogoutMinutes: 30,
      
      defaultEstablishment: 'Pan del Sur — Planta Principal',
      requireSignature: false,
      allowPhotos: true,
      
      highContrast: false,
      reduceAnimations: false,
      iconSize: 'medium'
    };
  }

  async loadConfig() {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const { data, error } = await this.supabaseService
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (error || !data) {
        // Crear preferencias por defecto
        await this.saveConfig(this.getDefaultConfig());
        return;
      }

      const config = { ...this.getDefaultConfig(), ...data.preferences };
      this.configSubject.next(config);
      this.applyConfig(config);
    } catch (error) {
      console.error('Error cargando configuración:', error);
    }
  }

  async saveConfig(config: AppConfig) {
    try {
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return;

      const { error } = await this.supabaseService
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          preferences: config,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      this.configSubject.next(config);
      this.applyConfig(config);
    } catch (error) {
      console.error('Error guardando configuración:', error);
    }
  }

  async updateConfig(partial: Partial<AppConfig>) {
    const current = this.configSubject.value;
    const updated = { ...current, ...partial };
    await this.saveConfig(updated);
  }

  private applyConfig(config: AppConfig) {
  const root = document.documentElement;
  
  // Aplicar tema
  if (config.theme === 'dark' || 
      (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Aplicar color primario con conversión a RGB para transparencias
  root.style.setProperty('--color-primary', config.primaryColor);
  
  // Calcular color hover (oscurecer 10%)
  const hoverColor = this.adjustColor(config.primaryColor, -20);
  root.style.setProperty('--color-primary-hover', hoverColor);
  
  // Color light con transparencia
  root.style.setProperty('--color-primary-light', config.primaryColor + '1A');

  // Aplicar fuente
  root.style.setProperty('--font-family-base', config.fontFamily);
  document.body.style.fontFamily = config.fontFamily;

  // Aplicar tamaño de fuente
  const fontSizes = { small: '13px', medium: '14px', large: '16px' };
  root.style.setProperty('--font-size-base', fontSizes[config.fontSize]);
  document.body.style.fontSize = fontSizes[config.fontSize];

  // Aplicar tamaño de iconos
  const iconSizes = { small: '16px', medium: '20px', large: '24px' };
  root.style.setProperty('--icon-size', iconSizes[config.iconSize]);

  // Aplicar alto contraste
  if (config.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Aplicar reducir animaciones
  if (config.reduceAnimations) {
    root.classList.add('reduce-animations');
  } else {
    root.classList.remove('reduce-animations');
  }

  // Guardar en localStorage para persistencia inmediata
  localStorage.setItem('appConfig', JSON.stringify(config));
}

// Método auxiliar para ajustar colores
private adjustColor(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

  getConfig(): AppConfig {
    return this.configSubject.value;
  }
}