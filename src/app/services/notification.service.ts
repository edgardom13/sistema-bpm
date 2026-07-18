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
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  created_at: string;
  dia?: string; // ✅ Nueva propiedad
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private alertsSubject = new BehaviorSubject<Alert[]>([]);
  public alerts$ = this.alertsSubject.asObservable();
  public unreadCount$ = new BehaviorSubject<number>(0);
  private realtimeChannel?: RealtimeChannel;

  private formatToRoute: { [key: string]: string } = {
    'SGI-FLD-02': 'limpiezaydesinfeccion',
    'SGI-FVL-06': 'verificacion',
    'SGI-FT-01': 'hornos',
    'SGI-FPH-03': 'higienicas',
    'SGI-FIR-04': 'residuos',
    'SGI-FPC-05': 'plagas',
    'SGI-FCFA-07': 'ph-cloro',
    'SGI-TZP-08': 'devolucion',
    'SGI-FMP-09': 'materia-prima',
    'SGI-FTHR-11': 'temp-hr'
  };

  constructor(private supabaseService: SupabaseService) {}

  async checkMissingDailyForms(plantId: string, today: string) {
    try {
      console.log('📋 Iniciando verificación de formularios faltantes para el día:', today);
      
      for (const [formatCode, formatName] of Object.entries(this.formatToRoute)) {
        // 1. Verificar si ya existe el registro HOY
        const { data: checklists, error: checkError } = await this.supabaseService
          .from('checklists')
          .select('id')
          .eq('plant_id', plantId)
          .eq('format_type', formatCode)
          .eq('data->>dia', today)
          .limit(1);

        if (checkError) {
          console.error('❌ Error verificando checklists:', checkError);
          continue;
        }

        // 2. Si YA existe el formulario HOY, RESOLVER cualquier alerta pendiente de "falta_diligenciar"
        if (checklists && checklists.length > 0) {
          const { data: alertsToUpdate } = await this.supabaseService
            .from('alerts')
            .select('id')
            .eq('plant_id', plantId)
            .eq('format_type', formatCode)
            .eq('parameter', 'falta_diligenciar')
            .eq('acknowledged', false);

          if (alertsToUpdate && alertsToUpdate.length > 0) {
            for (const alert of alertsToUpdate) {
              await this.supabaseService
                .from('alerts')
                .update({ 
                  acknowledged: true,
                  acknowledged_by: null,
                  acknowledged_at: new Date().toISOString()
                })
                .eq('id', alert.id);
            }
          }
        } 
        // 3. Si NO existe el formulario HOY, verificar si YA creamos la alerta PARA HOY
        else {
          const { data: existingAlert, error: alertCheckError } = await this.supabaseService
            .from('alerts')
            .select('id')
            .eq('plant_id', plantId)
            .eq('format_type', formatCode)
            .eq('parameter', 'falta_diligenciar')
            .eq('dia', today) // ✅ FILTRAMOS EXPLÍCITAMENTE POR EL DÍA DE HOY
            .eq('acknowledged', false)
            .limit(1);

          // Si no hay alerta para HOY, la creamos
          if (!alertCheckError && (!existingAlert || existingAlert.length === 0)) {
            await this.supabaseService
              .from('alerts')
              .insert({
                plant_id: plantId,
                format_type: formatCode,
                parameter: 'falta_diligenciar',
                dia: today, // ✅ GUARDAMOS EL DÍA AL QUE PERTENECE
                severity: 'warning',
                message: `El formulario de ${formatName} no ha sido diligenciado hoy (${today}).`,
                acknowledged: false,
                created_at: new Date().toISOString()
              });
          }
        }
      }
      console.log('✅ Verificación de formularios faltantes completada');
    } catch (error) {
      console.error('❌ Error en checkMissingDailyForms:', error);
    }
  }

  async getAlerts(limit: number = 20) {
    try {
      const { data, error } = await this.supabaseService
        .from('alerts')
        .select('*')
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

      const current = this.alertsSubject.getValue();
      const updated = current.filter(a => a['id'] !== alertId); 
      
      this.alertsSubject.next(updated);
      this.updateUnreadCount(updated);

    } catch (error) {
      console.error('Error reconociendo alerta:', error);
    }
  }

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

      this.alertsSubject.next([]);
      this.updateUnreadCount([]);

    } catch (error) {
      console.error('Error reconociendo todas las alertas:', error);
    }
  }

  subscribeToAlerts() {
    if (this.realtimeChannel) {
      this.supabaseService.getSupabase().removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.supabaseService
      .getSupabase()
      .channel('alerts-channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, (payload) => {
        const current = this.alertsSubject.getValue();
        const newAlert = payload.new as Alert;
        if (!newAlert.acknowledged) {
          this.alertsSubject.next([newAlert, ...current]);
          this.updateUnreadCount([newAlert, ...current]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alerts' }, (payload) => {
        const current = this.alertsSubject.getValue();
        const updated = current.filter(a => a['id'] !== payload.new['id']); 
        this.alertsSubject.next(updated);
        this.updateUnreadCount(updated);
      })
      .subscribe();

    return this.realtimeChannel;
  }

  unsubscribeFromAlerts() {
    if (this.realtimeChannel) {
      this.supabaseService.getSupabase().removeChannel(this.realtimeChannel);
      this.realtimeChannel = undefined;
    }
  }

  private updateUnreadCount(alerts: Alert[]) {
    this.unreadCount$.next(alerts.filter(a => !a.acknowledged).length);
  }

  getAlertIcon(severity: string): string {
    const icons: { [key: string]: string } = { 
      'info': 'ℹ️',
      'warning': '⚠️',
      'critical': '🚨'
    };
    return icons[severity] || '🔔';
  }

  getAlertColor(severity: string): string {
    const colors: { [key: string]: string } = {
      'info': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'warning': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'critical': 'bg-rose-500/10 text-rose-500 border-rose-500/20'
    };
    return colors[severity] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }

  getSeverityLabel(severity: string): string {
    const labels: { [key: string]: string } = { 
      'info': 'Informativa',
      'warning': 'Advertencia',
      'critical': 'Crítica'
    };
    return labels[severity] || severity;
  }

  getFormatRoute(formatType: string): string | null {
    return this.formatToRoute[formatType] || null;
  }

  async forceReloadAlerts(limit: number = 20) {
    return await this.getAlerts(limit);
  }
}