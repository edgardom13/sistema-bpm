import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  userName = 'Usuario';
  stats = {
    totalRegistros: 0,
    pendientes: 0,
    completados: 0,
    rechazados: 0,
    cumplimiento: 0
  };
  registrosRecientes: any[] = [];
  loading = true;

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    await this.cargarDatosDashboard();
  }

  async cargarDatosDashboard() {
    try {
      this.loading = true;

      // Obtener usuario actual
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.userName = user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Usuario';
      }

      // Cargar estadísticas
      await this.cargarEstadisticas();
      
      // Cargar registros recientes
      await this.cargarRegistrosRecientes();

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  async cargarEstadisticas() {
    try {
      // Total de registros
      const { count: totalRegistros } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true });

      // Registros pendientes (status = 'pending')
      const { count: pendientes } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // Registros completados/aprobados (status = 'approved' o 'completed')
      const { count: completados } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .in('status', ['approved', 'completed']);

      // Registros rechazados
      const { count: rechazados } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'rejected');

      // Calcular tasa de cumplimiento
      const total = totalRegistros || 1;
      const cumplimiento = completados ? Math.round((completados / total) * 100) : 0;

      this.stats = {
        totalRegistros: totalRegistros || 0,
        pendientes: pendientes || 0,
        completados: completados || 0,
        rechazados: rechazados || 0,
        cumplimiento: cumplimiento
      };

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  async cargarRegistrosRecientes() {
    try {
      // ✅ Consulta simplificada sin join (más robusta)
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Obtener usuarios para mapear created_by a nombre
      const userIds = [...new Set((data || []).map(r => r.created_by).filter(Boolean))];
      let usuariosMap: { [key: string]: string } = {};

      if (userIds.length > 0) {
        try {
          const { data: usuarios } = await this.supabaseService
            .getSupabase()
            .from('profiles')
            .select('id, name, email')
            .in('id', userIds);
          
          if (usuarios) {
            usuarios.forEach(u => {
              usuariosMap[u.id] = u.name || u.email?.split('@')[0] || 'Sin asignar';
            });
          }
        } catch (err) {
          console.warn('No se pudo cargar tabla profiles:', err);
          // Si no existe la tabla, usar el UUID
          userIds.forEach(id => {
            usuariosMap[id] = id.substring(0, 8) + '...';
          });
        }
      }

      // Mapear datos para el dashboard
      this.registrosRecientes = (data || []).map(registro => ({
        id: registro.id,
        fecha: new Date(registro.created_at).toLocaleDateString('es-ES', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }),
        formato: this.getFormatName(registro.format_type),
        establecimiento: registro.establishment || 'Sin especificar',
        estado: this.getStatusName(registro.status),
        estadoClass: registro.status,
        // ✅ Usar el mapa de usuarios
        responsable: usuariosMap[registro.created_by] || 'Sin asignar',
        fechaAprobacion: registro.approved_at
      }));

    } catch (error) {
      console.error('Error cargando registros recientes:', error);
      this.registrosRecientes = [];
    }
  }

  getFormatName(formatType: string): string {
    const formats: { [key: string]: string } = {
      'limpieza': 'Limpieza y Desinfección',
      'verificacion': 'Verificación de Limpieza',
      'hornos': 'Temperatura de Hornos',
      'higienicas': 'Prácticas Higiénicas',
      'residuos': 'Inspección de Residuos',
      'plagas': 'Control de Plagas',
      'ph_cloro': 'Seguimiento pH y Cloro',
      'devolucion': 'Devolución de Producto',
      'materia_prima': 'Control de MP',
      'temp_hr': 'Registro Temp y HR CC'
    };
    return formats[formatType] || formatType;
  }

  getStatusName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'Pendiente',
      'approved': 'Aprobado',
      'completed': 'Completado',
      'rejected': 'Rechazado',
      'in_progress': 'En Progreso'
    };
    return statusMap[status] || status;
  }

  // Método para refrescar datos
  async refreshData() {
    await this.cargarDatosDashboard();
  }
  onExportComplete(result: any) {
  console.log('Exportación completada:', result);
  // Aquí puedes recargar datos o hacer algo adicional
}
}