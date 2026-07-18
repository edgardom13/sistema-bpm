import { Component, OnInit } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
})
export class HomePage implements OnInit {
  currentDate: string = '';
  today: string = '';
  loading = true;
  
  stats = {
    registrosHoy: 0,
    alertas: 0,
    empleados: 0
  };
  
  ultimosRegistros: any[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.today = new Date().toISOString().split('T')[0];
    const date = new Date();
    this.currentDate = date.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    await this.cargarDatosHome();
  }

  async cargarDatosHome() {
    this.loading = true;
    try {
      // Cargamos todo en paralelo para mayor velocidad
      await Promise.all([
        this.cargarStats(),
        this.cargarUltimosRegistros()
      ]);
    } catch (error) {
      console.error('Error cargando datos del home:', error);
    } finally {
      this.loading = false;
    }
  }

  async cargarStats() {
    try {
      const plantId = '00000000-0000-0000-0000-000000000001';

      // ✅ CORRECCIÓN: Usamos 'data->>dia' que es como se guarda realmente en la BD
      const { count: registrosCount } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', plantId)
        .eq('data->>dia', this.today);

      this.stats.registrosHoy = registrosCount || 0;

      // Alertas activas no reconocidas
      const { count: alertasCount } = await this.supabaseService
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', plantId)
        .eq('acknowledged', false);

      this.stats.alertas = alertasCount || 0;

      // Total de empleados registrados
      const { count: empleadosCount } = await this.supabaseService
        .from('empleados')
        .select('*', { count: 'exact', head: true });

      this.stats.empleados = empleadosCount || 0;

    } catch (error) {
      console.error('Error cargando stats:', error);
    }
  }

  async cargarUltimosRegistros() {
    try {
      const plantId = '00000000-0000-0000-0000-000000000001';
      
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .eq('plant_id', plantId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      this.ultimosRegistros = (data || []).map(reg => {
        const dataReg = reg.data || {};
        const formato = this.getFormatoName(reg.format_type);
        
        // Generar un resumen breve y útil según el tipo de formulario
        let resumen = 'Registro guardado';
        if (reg.format_type === 'SGI-FPH-03') {
          resumen = dataReg.nombre_evaluado || 'Evaluación de personal';
        } else if (reg.format_type === 'SGI-FT-01') {
          resumen = `H1: ${dataReg.horno_1 || '-'}°C | H2: ${dataReg.horno_2 || '-'}°C`;
        } else if (reg.format_type === 'SGI-FCFA-07') {
          resumen = `pH: ${dataReg.ph || '-'} | Cloro: ${dataReg.cloro || '-'}`;
        } else if (dataReg.area_inspeccionada) {
          resumen = `Área: ${dataReg.area_inspeccionada}`;
        } else if (dataReg.nombre_producto) {
          resumen = `Producto: ${dataReg.nombre_producto}`;
        } else if (dataReg.aspecto_evaluar) {
          resumen = dataReg.aspecto_evaluar;
        }

        return {
          formato: formato,
          resumen: resumen,
          fecha: reg.created_at,
          estado: reg.status === 'pending' ? 'Pendiente' : (reg.status === 'approved' ? 'Aprobado' : 'Completado')
        };
      });
    } catch (error) {
      console.error('Error cargando últimos registros:', error);
    }
  }

  getFormatoName(formatType: string): string {
    const formatos: { [key: string]: string } = {
      'SGI-FLD-02': 'Limpieza y Desinfección',
      'SGI-FVL-06': 'Verificación de Limpieza',
      'SGI-FT-01': 'Temperatura de Hornos',
      'SGI-FPH-03': 'Prácticas Higiénicas',
      'SGI-FIR-04': 'Inspección de Residuos',
      'SGI-FPC-05': 'Control de Plagas',
      'SGI-FCFA-07': 'Seguimiento pH y Cloro',
      'SGI-TZP-08': 'Devolución de Producto',
      'SGI-FMP-09': 'Control de Materia Prima',
      'SGI-FTHR-11': 'Registro Temp y HR'
    };
    return formatos[formatType] || 'Formato Desconocido';
  }
}