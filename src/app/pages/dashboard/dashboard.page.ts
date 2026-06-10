import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { SupabaseService } from '../../services/supabase.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {
  @ViewChild('tendenciaChart') tendenciaChartRef!: ElementRef;
  @ViewChild('distribucionChart') distribucionChartRef!: ElementRef;
  @ViewChild('cumplimientoChart') cumplimientoChartRef!: ElementRef;
  @ViewChild('hornosChart') hornosChartRef!: ElementRef;

  userName = 'Usuario';
  loading = true;
  fechaHoy = '';

  // KPIs principales
  kpis = {
    registrosHoy: 0,
    cumplimientoVerificacion: 0,
    cumplimientoHigienicas: 0,
    hornosMonitoreados: 0,
    alertasActivas: 0,
    empleadosEvaluados: 0
  };

  // Estadísticas por formulario
  statsPorFormulario = {
    limpieza: 0,
    verificacion: 0,
    hornos: 0,
    higienicas: 0
  };

  // Alertas
  alertas: any[] = [];

  // Últimos registros
  registrosRecientes: any[] = [];

  // Cumplimiento por área (verificación)
  cumplimientoPorArea: { area: string; porcentaje: number; total: number; cumple: number }[] = [];

  // Empleados evaluados
  empleadosEvaluados: { nombre: string; porcentaje: number; fecha: string }[] = [];

  // Charts
  charts: Chart[] = [];

  constructor(private supabaseService: SupabaseService) {}

  async ngOnInit() {
    this.fechaHoy = this.formatDate(new Date());
    await this.cargarDashboard();
  }

  async cargarDashboard() {
    try {
      this.loading = true;

      // Obtener usuario
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.userName = user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Usuario';
      }

      // Cargar todos los datos en paralelo
      await Promise.all([
        this.cargarKPIs(),
        this.cargarAlertas(),
        this.cargarRegistrosRecientes(),
        this.cargarCumplimientoPorArea(),
        this.cargarEmpleadosEvaluados()
      ]);

      // Renderizar gráficos después de cargar datos
      setTimeout(() => this.renderizarGraficos(), 100);

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ============================================
  // CARGAR KPIs PRINCIPALES
  // ============================================
  async cargarKPIs() {
    try {
      const hoy = this.fechaHoy;

      // 1. Total registros de hoy (los 4 formularios)
      const { count: totalHoy } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .in('format_type', ['SGI-FLD-02', 'SGI-FVL-06', 'SGI-FT-01', 'SGI-FPH-03'])
        .eq('data->>dia', hoy);

      this.kpis.registrosHoy = totalHoy || 0;

      // 2. Contar por formulario
      const [limpieza, verificacion, hornos, higienicas] = await Promise.all([
        this.contarFormulario('SGI-FLD-02', hoy),
        this.contarFormulario('SGI-FVL-06', hoy),
        this.contarFormulario('SGI-FT-01', hoy),
        this.contarFormulario('SGI-FPH-03', hoy)
      ]);

      this.statsPorFormulario = { limpieza, verificacion, hornos, higienicas };

      // 3. % Cumplimiento Verificación (Si vs Total)
      this.kpis.cumplimientoVerificacion = await this.calcularCumplimientoVerificacion(hoy);

      // 4. % Cumplimiento Higiénicas (promedio de los 18 ítems)
      this.kpis.cumplimientoHigienicas = await this.calcularCumplimientoHigienicas(hoy);

      // 5. Hornos monitoreados hoy
      this.kpis.hornosMonitoreados = hornos;

      // 6. Empleados evaluados hoy
      const { data: empleados } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FPH-03')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', hoy);

      const nombresUnicos = new Set(
        (empleados || []).map(e => e.data?.nombre_evaluado).filter(Boolean)
      );
      this.kpis.empleadosEvaluados = nombresUnicos.size;

    } catch (error) {
      console.error('Error cargando KPIs:', error);
    }
  }

  async contarFormulario(formatType: string, dia: string): Promise<number> {
    const { count } = await this.supabaseService
      .from('checklists')
      .select('*', { count: 'exact', head: true })
      .eq('format_type', formatType)
      .eq('plant_id', '00000000-0000-0000-0000-000000000001')
      .eq('data->>dia', dia);
    return count || 0;
  }

  async calcularCumplimientoVerificacion(dia: string): Promise<number> {
    try {
      const { data } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FVL-06')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', dia);

      if (!data || data.length === 0) return 0;

      const total = data.length;
      const cumpleSi = data.filter(r => r.data?.cumple === 'Si').length;
      return Math.round((cumpleSi / total) * 100);
    } catch {
      return 0;
    }
  }

  async calcularCumplimientoHigienicas(dia: string): Promise<number> {
    try {
      const { data } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FPH-03')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', dia);

      if (!data || data.length === 0) return 0;

      let totalItems = 0;
      let itemsCumple = 0;

      data.forEach(reg => {
        if (reg.data?.items && Array.isArray(reg.data.items)) {
          reg.data.items.forEach((item: any) => {
            if (item.cumple) {
              totalItems++;
              if (item.cumple === 'Si') itemsCumple++;
            }
          });
        }
      });

      if (totalItems === 0) return 0;
      return Math.round((itemsCumple / totalItems) * 100);
    } catch {
      return 0;
    }
  }

  // ============================================
  // CARGAR ALERTAS
  // ============================================
  async cargarAlertas() {
    try {
      this.alertas = [];
      const hoy = this.fechaHoy;

      // Alerta 1: Verificaciones con "No cumple"
      const { data: verifNoCumple } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FVL-06')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', hoy)
        .eq('data->>cumple', 'No');

      if (verifNoCumple && verifNoCumple.length > 0) {
        verifNoCumple.forEach(reg => {
          this.alertas.push({
            tipo: 'danger',
            icono: '🚨',
            titulo: 'Verificación NO CUMPLE',
            descripcion: `Área: ${reg.data?.aspecto_evaluar || 'Sin especificar'}`,
            subtitulo: `Responsable: ${reg.data?.responsable || 'N/A'}`,
            formato: 'Verificación',
            fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
          });
        });
      }

      // Alerta 2: Empleados con bajo cumplimiento en higiénicas
      const { data: higienicas } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FPH-03')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', hoy);

      if (higienicas) {
        higienicas.forEach(reg => {
          if (reg.data?.items && Array.isArray(reg.data.items)) {
            const total = reg.data.items.filter((i: any) => i.cumple).length;
            const cumple = reg.data.items.filter((i: any) => i.cumple === 'Si').length;
            const porcentaje = total > 0 ? Math.round((cumple / total) * 100) : 0;

            if (porcentaje < 80) {
              this.alertas.push({
                tipo: 'warning',
                icono: '⚠️',
                titulo: 'Cumplimiento bajo en Higiénicas',
                descripcion: `${reg.data?.nombre_evaluado || 'Empleado'}: ${porcentaje}%`,
                subtitulo: `Cargo: ${reg.data?.cargo || 'N/A'}`,
                formato: 'Higiénicas',
                fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              });
            }
          }
        });
      }

      // Alerta 3: Si no hay registros de limpieza hoy
      if (this.statsPorFormulario.limpieza === 0) {
        this.alertas.push({
          tipo: 'info',
          icono: '🧹',
          titulo: 'Limpieza pendiente',
          descripcion: 'No hay registros de limpieza para hoy',
          subtitulo: 'Se requiere atención',
          formato: 'Limpieza',
          fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        });
      }

      // Actualizar KPI de alertas
      this.kpis.alertasActivas = this.alertas.filter(a => a.tipo === 'danger' || a.tipo === 'warning').length;

    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  }

  // ============================================
  // CARGAR REGISTROS RECIENTES
  // ============================================
  async cargarRegistrosRecientes() {
    try {
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .in('format_type', ['SGI-FLD-02', 'SGI-FVL-06', 'SGI-FT-01', 'SGI-FPH-03'])
        .order('created_at', { ascending: false })
        .limit(8);

      if (error) throw error;

      this.registrosRecientes = (data || []).map(reg => ({
        id: reg.id,
        formato: this.getFormatName(reg.format_type),
        formatoIcono: this.getFormatIcon(reg.format_type),
        formatoColor: this.getFormatColor(reg.format_type),
        resumen: this.getResumen(reg.format_type, reg.data),
        fecha: new Date(reg.created_at).toLocaleDateString('es-ES', {
          day: '2-digit', month: 'short'
        }),
        hora: new Date(reg.created_at).toLocaleTimeString('es-ES', {
          hour: '2-digit', minute: '2-digit'
        })
      }));

    } catch (error) {
      console.error('Error cargando registros recientes:', error);
    }
  }

  getFormatName(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': 'Limpieza y Desinfección',
      'SGI-FVL-06': 'Verificación de Limpieza',
      'SGI-FT-01': 'Temperatura de Hornos',
      'SGI-FPH-03': 'Prácticas Higiénicas'
    };
    return map[formatType] || formatType;
  }

  getFormatIcon(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': '🧹',
      'SGI-FVL-06': '🔍',
      'SGI-FT-01': '🔥',
      'SGI-FPH-03': '✨'
    };
    return map[formatType] || '📋';
  }

  getFormatColor(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': 'blue',
      'SGI-FVL-06': 'emerald',
      'SGI-FT-01': 'orange',
      'SGI-FPH-03': 'purple'
    };
    return map[formatType] || 'gray';
  }

  getResumen(formatType: string, data: any): string {
    if (!data) return 'Sin datos';
    
    switch (formatType) {
      case 'SGI-FLD-02':
        return `${data.aspecto_evaluar || '-'} • ${data.responsable || '-'}`;
      case 'SGI-FVL-06':
        const cumpleBadge = data.cumple === 'Si' ? '✅' : data.cumple === 'No' ? '❌' : '';
        return `${data.aspecto_evaluar || '-'} ${cumpleBadge}`;
      case 'SGI-FT-01':
        return `${data.jornada || '-'} • H1: ${data.horno_1 || '-'}°C • H2: ${data.horno_2 || '-'}°C`;
      case 'SGI-FPH-03':
        return `${data.nombre_evaluado || '-'} • ${data.cargo || '-'}`;
      default:
        return '-';
    }
  }

  // ============================================
  // CUMPLIMIENTO POR ÁREA (Verificación)
  // ============================================
  async cargarCumplimientoPorArea() {
    try {
      const { data } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FVL-06')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001');

      if (!data || data.length === 0) {
        this.cumplimientoPorArea = [];
        return;
      }

      // Agrupar por área
      const areasMap: { [key: string]: { total: number; cumple: number } } = {};

      data.forEach(reg => {
        const area = reg.data?.aspecto_evaluar || 'Sin especificar';
        if (!areasMap[area]) {
          areasMap[area] = { total: 0, cumple: 0 };
        }
        areasMap[area].total++;
        if (reg.data?.cumple === 'Si') areasMap[area].cumple++;
      });

      this.cumplimientoPorArea = Object.keys(areasMap)
        .map(area => ({
          area: area.length > 25 ? area.substring(0, 25) + '...' : area,
          areaCompleta: area,
          total: areasMap[area].total,
          cumple: areasMap[area].cumple,
          porcentaje: Math.round((areasMap[area].cumple / areasMap[area].total) * 100)
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje)
        .slice(0, 6);

    } catch (error) {
      console.error('Error cargando cumplimiento por área:', error);
    }
  }

  // ============================================
  // EMPLEADOS EVALUADOS
  // ============================================
  async cargarEmpleadosEvaluados() {
    try {
      const { data } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FPH-03')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001');

      if (!data || data.length === 0) {
        this.empleadosEvaluados = [];
        return;
      }

      // Agrupar por empleado
      const empleadosMap: { [key: string]: { total: number; cumple: number; fecha: string } } = {};

      data.forEach(reg => {
        const nombre = reg.data?.nombre_evaluado || 'Sin nombre';
        if (!empleadosMap[nombre]) {
          empleadosMap[nombre] = { total: 0, cumple: 0, fecha: reg.data?.dia || '' };
        }
        
        if (reg.data?.items && Array.isArray(reg.data.items)) {
          reg.data.items.forEach((item: any) => {
            if (item.cumple) {
              empleadosMap[nombre].total++;
              if (item.cumple === 'Si') empleadosMap[nombre].cumple++;
            }
          });
        }
      });

      this.empleadosEvaluados = Object.keys(empleadosMap)
        .map(nombre => ({
          nombre,
          porcentaje: empleadosMap[nombre].total > 0 
            ? Math.round((empleadosMap[nombre].cumple / empleadosMap[nombre].total) * 100)
            : 0,
          fecha: empleadosMap[nombre].fecha
        }))
        .sort((a, b) => b.porcentaje - a.porcentaje);

    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
  }

  // ============================================
  // RENDERIZAR GRÁFICOS
  // ============================================
  async renderizarGraficos() {
    try {
      // Destruir gráficos anteriores
      this.charts.forEach(c => c.destroy());
      this.charts = [];

      await Promise.all([
        this.renderizarTendencia(),
        this.renderizarDistribucion(),
        this.renderizarCumplimiento(),
        this.renderizarHornos()
      ]);
    } catch (error) {
      console.error('Error renderizando gráficos:', error);
    }
  }

  async renderizarTendencia() {
    if (!this.tendenciaChartRef?.nativeElement) return;

    const labels: string[] = [];
    const limpiezaData: number[] = [];
    const verificacionData: number[] = [];
    const hornosData: number[] = [];
    const higienicasData: number[] = [];

    // Últimos 7 días
    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = this.formatDate(fecha);
      const label = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' });
      labels.push(label);

      // Contar registros de cada formulario para ese día
      const [limp, verif, horn, hig] = await Promise.all([
        this.contarFormulario('SGI-FLD-02', fechaStr),
        this.contarFormulario('SGI-FVL-06', fechaStr),
        this.contarFormulario('SGI-FT-01', fechaStr),
        this.contarFormulario('SGI-FPH-03', fechaStr)
      ]);

      limpiezaData.push(limp);
      verificacionData.push(verif);
      hornosData.push(horn);
      higienicasData.push(hig);
    }

    const ctx = this.tendenciaChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Limpieza',
            data: limpiezaData,
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Verificación',
            data: verificacionData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Hornos',
            data: hornosData,
            borderColor: '#F97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.4,
            fill: true
          },
          {
            label: 'Higiénicas',
            data: higienicasData,
            borderColor: '#A855F7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.4,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#6B7280', font: { size: 11 } }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#6B7280', stepSize: 1 },
            grid: { color: 'rgba(107, 114, 128, 0.1)' }
          },
          x: {
            ticks: { color: '#6B7280' },
            grid: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  async renderizarDistribucion() {
    if (!this.distribucionChartRef?.nativeElement) return;

    const ctx = this.distribucionChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Limpieza', 'Verificación', 'Hornos', 'Higiénicas'],
        datasets: [{
          data: [
            this.statsPorFormulario.limpieza,
            this.statsPorFormulario.verificacion,
            this.statsPorFormulario.hornos,
            this.statsPorFormulario.higienicas
          ],
          backgroundColor: ['#3B82F6', '#10B981', '#F97316', '#A855F7'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#6B7280', font: { size: 11 }, padding: 15 }
          }
        },
        cutout: '65%'
      }
    });
    this.charts.push(chart);
  }

  async renderizarCumplimiento() {
    if (!this.cumplimientoChartRef?.nativeElement) return;

    const ctx = this.cumplimientoChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.cumplimientoPorArea.map(a => a.area),
        datasets: [{
          label: '% Cumplimiento',
          data: this.cumplimientoPorArea.map(a => a.porcentaje),
          backgroundColor: this.cumplimientoPorArea.map(a => 
            a.porcentaje >= 80 ? '#10B981' : a.porcentaje >= 60 ? '#F59E0B' : '#EF4444'
          ),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: { color: '#6B7280', callback: (v) => v + '%' },
            grid: { color: 'rgba(107, 114, 128, 0.1)' }
          },
          y: {
            ticks: { color: '#6B7280', font: { size: 10 } },
            grid: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  async renderizarHornos() {
    if (!this.hornosChartRef?.nativeElement) return;

    // Obtener registros de hornos de hoy
    const { data } = await this.supabaseService
      .from('checklists')
      .select('data')
      .eq('format_type', 'SGI-FT-01')
      .eq('plant_id', '00000000-0000-0000-0000-000000000001')
      .eq('data->>dia', this.fechaHoy)
      .order('created_at', { ascending: true });

    const labels = (data || []).map((r: any) => r.data?.jornada || '-');
    const horno1 = (data || []).map((r: any) => parseFloat(r.data?.horno_1) || 0);
    const horno2 = (data || []).map((r: any) => parseFloat(r.data?.horno_2) || 0);

    const ctx = this.hornosChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Horno 1 (°C)',
            data: horno1.length > 0 ? horno1 : [0],
            borderColor: '#F97316',
            backgroundColor: 'rgba(249, 115, 22, 0.1)',
            tension: 0.3,
            fill: true
          },
          {
            label: 'Horno 2 (°C)',
            data: horno2.length > 0 ? horno2 : [0],
            borderColor: '#EF4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#6B7280', font: { size: 11 } }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: { color: '#6B7280', callback: (v) => v + '°C' },
            grid: { color: 'rgba(107, 114, 128, 0.1)' }
          },
          x: {
            ticks: { color: '#6B7280' },
            grid: { display: false }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  async refreshData() {
    await this.cargarDashboard();
  }

  getAlertColor(tipo: string): string {
    switch (tipo) {
      case 'danger': return 'border-rose-500 bg-rose-50 dark:bg-rose-500/10';
      case 'warning': return 'border-amber-500 bg-amber-50 dark:bg-amber-500/10';
      case 'info': return 'border-blue-500 bg-blue-50 dark:bg-blue-500/10';
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-500/10';
    }
  }
}