import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { BehaviorSubject } from 'rxjs';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Alert {
  id: string;
  plant_id: string;
  checklist_id: string | null;
  format_type: string;
  parameter: string;
  value: number | null;
  min_value: number | null;
  max_value: number | null;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();
  public unreadCount$ = new BehaviorSubject<number>(0);
  private realtimeChannel?: RealtimeChannel;

  constructor(private supabaseService: SupabaseService) {}

  // Obtener alertas no reconocidas
  async getAlerts(limit: number = 20) {
    try {
      const { data, error } = await this.supabaseService
        .from('alerts')
        .select(`
          *,
          plants:plant_id (name),
          checklists:checklist_id (id, format_type, establishment)
        `)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      this.alertsSubject.next(data || []);
      this.updateUnreadCount(data || []);
      
      return data || [];
    } catch (error) {
      console.error('Error obteniendo alertas:', error);
      return [];
    }
  }

  // Reconocer alerta (equivalente a marcar como leída)
  async acknowledgeAlert(alertId: string, userId: string) {
    try {
      const { error } = await this.supabaseService
        .from('alerts')
        .update({ 
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      // Actualizar lista local
      const current = this.alertsSubject.getValue();
      const updated = current.map(a => 
        a.id === alertId 
          ? { 
              ...a, 
              acknowledged: true,
              acknowledged_by: userId,
              acknowledged_at: new Date().toISOString()
            } 
          : a
      );
      this.alertsSubject.next(updated);
      this.updateUnreadCount(updated);

    } catch (error) {
      console.error('Error reconociendo alerta:', error);
    }
  }

  // Reconocer todas las alertas
  async acknowledgeAllAlerts(userId: string) {
    try {
      const { error } = await this.supabaseService
        .from('alerts')
        .update({ 
          acknowledged: true,
          acknowledged_by: userId,
          acknowledged_at: new Date().toISOString()
        })
        .eq('acknowledged', false);

      if (error) throw error;

      const current = this.alertsSubject.getValue();
      const updated = current.map(a => ({ 
        ...a, 
        acknowledged: true,
        acknowledged_by: userId,
        acknowledged_at: new Date().toISOString()
      }));
      this.alertsSubject.next(updated);
      this.updateUnreadCount(updated);

    } catch (error) {
      console.error('Error reconociendo todas las alertas:', error);
    }
  }

  // Suscribirse a alertas en tiempo real
  subscribeToAlerts() {
    // Limpiar suscripción anterior si existe
    if (this.realtimeChannel) {
      this.supabaseService.getSupabase().removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.supabaseService
      .getSupabase()
      .channel('alerts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: 'acknowledged=eq.false'
        },
        (payload) => {
          console.log(' Nueva alerta en tiempo real:', payload);
          const current = this.alertsSubject.getValue();
          const newAlert = payload.new as Alert;
          this.alertsSubject.next([newAlert, ...current]);
          this.updateUnreadCount([newAlert, ...current]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts'
        },
        (payload) => {
          console.log(' Alerta actualizada:', payload);
          const current = this.alertsSubject.getValue();
          const updated = current.map(a => 
            a['id'] === payload.new['id'] ? payload.new as Alert : a
          );
          this.alertsSubject.next(updated);
          this.updateUnreadCount(updated);
        }
      )
      .subscribe();

    return this.realtimeChannel;
  }

  // Limpiar suscripción
  unsubscribeFromAlerts() {
    if (this.realtimeChannel) {
      this.supabaseService.getSupabase().removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  private updateUnreadCount(alerts: Alert[]) {
    const count = alerts.filter(a => !a.acknowledged).length;
    this.unreadCount$.next(count);
  }

  // Obtener icono según severidad
  getAlertIcon(severity: string): string {
    const icons: { [key: string]: string } = {
      'low': 'ℹ️',
      'medium': '⚠️',
      'high': '🔴',
      'critical': '🚨'
    };
    return icons[severity] || '🔔';
  }

  // Obtener color según severidad
  getAlertColor(severity: string): string {
    const colors: { [key: string]: string } = {
      'low': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'medium': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'high': 'bg-orange-500/10 text-orange-500 border-orange-500/20',
      'critical': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
    return colors[severity] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }

  // Obtener label de severidad
  getSeverityLabel(severity: string): string {
    const labels: { [key: string]: string } = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta',
      'critical': 'Crítica'
    };
    return labels[severity] || severity;
  }

  // Formatear valor con rango
  formatValueRange(alert: Alert): string {
    if (alert.value === null) return 'N/A';
    
    let text = `${alert.value}`;
    if (alert.min_value !== null || alert.max_value !== null) {
      const min = alert.min_value ?? '∞';
      const max = alert.max_value ?? '∞';
      text += ` (rango: ${min} - ${max})`;
    }
    return text;
  }
}