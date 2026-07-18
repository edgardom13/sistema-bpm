import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit, OnDestroy {
  @ViewChild('tendenciaChart') tendenciaChartRef!: ElementRef;
  @ViewChild('distribucionChart') distribucionChartRef!: ElementRef;
  @ViewChild('cumplimientoFormatoChart') cumplimientoFormatoChartRef!: ElementRef;
  @ViewChild('hornosChart') hornosChartRef!: ElementRef;
  @ViewChild('causasDevolucionChart') causasDevolucionChartRef!: ElementRef;

  userName = 'Usuario';
  loading = true;
  fechaHoy = '';

  kpis = {
    registrosHoy: 0,
    cumplimientoGeneral: 0,
    alertasActivas: 0,
    empleadosEvaluados: 0,
    devolucionesHoy: 0,
    mpAprobadasPorcentaje: 0
  };

  statsPorFormulario = {
    limpieza: 0, verificacion: 0, hornos: 0, higienicas: 0, residuos: 0,
    plagas: 0, phCloro: 0, devolucion: 0, materiaPrima: 0, tempHr: 0
  };

  alertas: any[] = [];
  registrosRecientes: any[] = [];
  cumplimientoPorFormato: { formato: string; porcentaje: number }[] = [];
  causasDevolucion: { causa: string; cantidad: number }[] = [];
  charts: Chart[] = [];

  private formatToRoute: { [key: string]: string } = {
    'SGI-FLD-02': 'limpiezaydesinfeccion', 'SGI-FVL-06': 'verificacion', 'SGI-FT-01': 'hornos',
    'SGI-FPH-03': 'higienicas', 'SGI-FIR-04': 'residuos', 'SGI-FPC-05': 'plagas',
    'SGI-FCFA-07': 'ph-cloro', 'SGI-TZP-08': 'devolucion', 'SGI-FMP-09': 'materia-prima', 'SGI-FTHR-11': 'temp-hr'
  };

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit() {
    this.fechaHoy = this.formatDate(new Date());
    await this.cargarDashboard();
  }

  ngOnDestroy() {
    this.charts.forEach(chart => chart.destroy());
  }

  async cargarDashboard() {
    try {
      this.loading = true;
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        this.userName = user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Usuario';
      }

      await Promise.all([
        this.cargarKPIs(),
        this.cargarAlertas(),
        this.cargarRegistrosRecientes(),
        this.cargarCumplimientoPorFormato(),
        this.cargarCausasDevolucion()
      ]);

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

  async cargarKPIs() {
    try {
      const hoy = this.fechaHoy;
      const formatCodes = Object.keys(this.formatToRoute);

      // 1. Total registros de hoy
      const { count: totalHoy } = await this.supabaseService
        .from('checklists')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .in('format_type', formatCodes)
        .eq('data->>dia', hoy);

      this.kpis.registrosHoy = totalHoy || 0;

      // 2. Contar por formulario
      const counts = await Promise.all(formatCodes.map(code => this.contarFormulario(code, hoy)));
      const statsKeys = Object.keys(this.statsPorFormulario) as (keyof typeof this.statsPorFormulario)[];
      statsKeys.forEach((key, index) => {
        this.statsPorFormulario[key] = counts[index];
      });
      this.kpis.devolucionesHoy = this.statsPorFormulario.devolucion;

      // 3. Calcular cumplimiento de los 10 formatos (devuelve 0 si no hay datos)
      const [
        cumpleLimpieza, cumpleVerif, cumpleHornos, cumpleHig, cumpleRes, 
        cumplePlag, cumplePHCloro, cumpleDevolucion, cumpleMP, cumpleTempHR
      ] = await Promise.all([
        this.calcularCumplimientoLimpieza(hoy),
        this.calcularCumplimientoVerificacion(hoy),
        this.calcularCumplimientoHornos(hoy),
        this.calcularCumplimientoHigienicas(hoy),
        this.calcularCumplimientoResiduos(hoy),
        this.calcularCumplimientoPlagas(hoy),
        this.calcularCumplimientoPHCloro(hoy),
        this.calcularCumplimientoDevolucion(hoy),
        this.calcularCumplimientoMateriaPrima(hoy),
        this.calcularCumplimientoTempHR(hoy)
      ]);

      // ✅ PROMEDIO SOBRE LOS 10 FORMULARIOS TOTALES
      const todosCumplimientos = [
        cumpleLimpieza, cumpleVerif, cumpleHornos, cumpleHig, cumpleRes, 
        cumplePlag, cumplePHCloro, cumpleDevolucion, cumpleMP, cumpleTempHR
      ];

      this.kpis.cumplimientoGeneral = Math.round(
        todosCumplimientos.reduce((a, b) => a + b, 0) / 10
      );

      // 4. Empleados evaluados hoy
      const { data: empleados } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FPH-03')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', hoy);

      this.kpis.empleadosEvaluados = new Set((empleados || []).map((e: any) => e.data?.nombre_evaluado).filter(Boolean)).size;

      // 5. MP Aprobadas Porcentaje
      const { data: mpData } = await this.supabaseService
        .from('checklists')
        .select('data')
        .eq('format_type', 'SGI-FMP-09')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', hoy);

      if (mpData && mpData.length > 0) {
        let totalItems = 0, aprobados = 0;
        mpData.forEach((reg: any) => {
          if (reg.data?.items_mp && Array.isArray(reg.data.items_mp)) {
            reg.data.items_mp.forEach((item: any) => {
              if (item.aprobado) { 
                totalItems++; 
                if (item.aprobado === 'Si') aprobados++; 
              }
            });
          }
        });
        this.kpis.mpAprobadasPorcentaje = totalItems > 0 ? Math.round((aprobados / totalItems) * 100) : 0;
      } else {
        this.kpis.mpAprobadasPorcentaje = 0;
      }

    } catch (error) {
      console.error('Error cargando KPIs:', error);
    }
  }

  // ==========================================
  // FUNCIONES AUXILIARES DE CUMPLIMIENTO (Devuelven 0 si no hay datos)
  // ==========================================

  async calcularCumplimientoLimpieza(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FLD-02').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    return (data && data.length > 0) ? 100 : 0;
  }

  async calcularCumplimientoVerificacion(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FVL-06').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    const cumpleSi = data.filter((r: any) => r.data?.cumple === 'Si').length;
    return Math.round((cumpleSi / data.length) * 100);
  }

  async calcularCumplimientoHornos(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FT-01').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    const jornadas = new Set(data.map((r: any) => r.data?.jornada));
    if (jornadas.has('AM') && jornadas.has('PM')) return 100;
    return 50; // Si solo tiene una jornada
  }

  async calcularCumplimientoHigienicas(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FPH-03').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let totalItems = 0, itemsCumple = 0;
    data.forEach((reg: any) => {
      if (reg.data?.items && Array.isArray(reg.data.items)) {
        reg.data.items.forEach((item: any) => { 
          if (item.cumple) { 
            totalItems++; 
            if (item.cumple === 'Si') itemsCumple++; 
          } 
        });
      }
    });
    return totalItems === 0 ? 0 : Math.round((itemsCumple / totalItems) * 100);
  }

  async calcularCumplimientoResiduos(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FIR-04').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let totalItems = 0, itemsCumple = 0;
    data.forEach((reg: any) => {
      if (reg.data?.items_solidos) reg.data.items_solidos.forEach((item: any) => { if (item.verificacion) { totalItems++; if (item.verificacion === 'Si') itemsCumple++; } });
      if (reg.data?.items_liquidos) reg.data.items_liquidos.forEach((item: any) => { if (item.verificacion) { totalItems++; if (item.verificacion === 'Si') itemsCumple++; } });
    });
    return totalItems === 0 ? 0 : Math.round((itemsCumple / totalItems) * 100);
  }

  async calcularCumplimientoPlagas(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FPC-05').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let totalItems = 0, itemsCumple = 0;
    data.forEach((reg: any) => {
      if (reg.data?.items_plagas && Array.isArray(reg.data.items_plagas)) {
        reg.data.items_plagas.forEach((item: any) => { 
          if (item.verificacion) { 
            totalItems++; 
            if (item.verificacion === 'Si') itemsCumple++; 
          } 
        });
      }
    });
    return totalItems === 0 ? 0 : Math.round((itemsCumple / totalItems) * 100);
  }

  async calcularCumplimientoPHCloro(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FCFA-07').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let dentroRango = 0;
    data.forEach((reg: any) => {
      const ph = parseFloat(reg.data?.ph);
      const cloro = parseFloat(reg.data?.cloro);
      if (!isNaN(ph) && !isNaN(cloro) && ph >= 6.5 && ph <= 8.5 && cloro >= 0.5 && cloro <= 2.0) {
        dentroRango++;
      }
    });
    return Math.round((dentroRango / data.length) * 100);
  }

  async calcularCumplimientoDevolucion(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-TZP-08').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    return (data && data.length > 0) ? 100 : 0;
  }

  async calcularCumplimientoMateriaPrima(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FMP-09').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let totalItems = 0, aprobados = 0;
    data.forEach((reg: any) => {
      if (reg.data?.items_mp && Array.isArray(reg.data.items_mp)) {
        reg.data.items_mp.forEach((item: any) => { 
          if (item.aprobado) { 
            totalItems++; 
            if (item.aprobado === 'Si') aprobados++; 
          } 
        });
      }
    });
    return totalItems === 0 ? 0 : Math.round((aprobados / totalItems) * 100);
  }

  async calcularCumplimientoTempHR(dia: string): Promise<number> {
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FTHR-11').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    if (!data || data.length === 0) return 0;
    let registrosCompletos = 0;
    let totalItems = 0;
    data.forEach((reg: any) => {
      if (reg.data?.items_temp_hr && Array.isArray(reg.data.items_temp_hr)) {
        totalItems += reg.data.items_temp_hr.length;
        const completos = reg.data.items_temp_hr.filter((item: any) => 
          item.hora && item.temperatura !== '' && item.hr !== ''
        ).length;
        registrosCompletos += completos;
      }
    });
    return totalItems > 0 ? Math.round((registrosCompletos / totalItems) * 100) : 0;
  }

  async contarFormulario(formatType: string, dia: string): Promise<number> {
    const { count } = await this.supabaseService.from('checklists').select('*', { count: 'exact', head: true }).eq('format_type', formatType).eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', dia);
    return count || 0;
  }

  async cargarAlertas() {
    try {
      this.alertas = [];
      const hoy = this.fechaHoy;

      // 1. Verificaciones que no cumplen
      const { data: verifNoCumple } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FVL-06').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', hoy).eq('data->>cumple', 'No');
      if (verifNoCumple) {
        verifNoCumple.forEach((reg: any) => {
          this.alertas.push({ tipo: 'danger', icono: '🚨', titulo: 'Verificación NO CUMPLE', descripcion: `Área: ${reg.data?.aspecto_evaluar || 'Sin especificar'}`, subtitulo: `Responsable: ${reg.data?.responsable || 'N/A'}`, fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), formatCode: 'SGI-FVL-06' });
        });
      }

      // 2. pH y Cloro fuera de rango
      const { data: phCloroData } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FCFA-07').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', hoy);
      if (phCloroData) {
        phCloroData.forEach((reg: any) => {
          const ph = parseFloat(reg.data?.ph);
          const cloro = parseFloat(reg.data?.cloro);
          if (!isNaN(ph) && (ph < 6.5 || ph > 8.5)) {
            this.alertas.push({ tipo: 'danger', icono: '💧', titulo: 'pH Fuera de Rango', descripcion: `pH registrado: ${ph}`, subtitulo: 'Rango aceptable: 6.5 - 8.5', fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), formatCode: 'SGI-FCFA-07' });
          }
          if (!isNaN(cloro) && (cloro < 0.5 || cloro > 2.0)) {
            this.alertas.push({ tipo: 'danger', icono: '💧', titulo: 'Cloro Fuera de Rango', descripcion: `Cloro registrado: ${cloro} ppm`, subtitulo: 'Rango aceptable: 0.5 - 2.0 ppm', fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), formatCode: 'SGI-FCFA-07' });
          }
        });
      }

      // 3. Cumplimiento bajo en Higiénicas
      const { data: higienicas } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FPH-03').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', hoy);
      if (higienicas) {
        higienicas.forEach((reg: any) => {
          if (reg.data?.items && Array.isArray(reg.data.items)) {
            const total = reg.data.items.filter((i: any) => i.cumple).length;
            const cumple = reg.data.items.filter((i: any) => i.cumple === 'Si').length;
            const porcentaje = total > 0 ? Math.round((cumple / total) * 100) : 0;
            if (porcentaje < 80) {
              this.alertas.push({ tipo: 'warning', icono: '⚠️', titulo: 'Cumplimiento bajo en Higiénicas', descripcion: `${reg.data?.nombre_evaluado || 'Empleado'}: ${porcentaje}%`, subtitulo: `Cargo: ${reg.data?.cargo || 'N/A'}`, fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), formatCode: 'SGI-FPH-03' });
            }
          }
        });
      }

      // ✅ 4. ALERTAS DE TEMPERATURA DE HORNOS (Desde la tabla alerts)
      const { data: alertasHornos } = await this.supabaseService
        .from('alerts')
        .select('*')
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('format_type', 'SGI-FT-01')
        .in('parameter', ['horno_1', 'horno_2'])
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (alertasHornos) {
        alertasHornos.forEach((alert: any) => {
          this.alertas.push({
            tipo: 'danger', // Para que salga en rojo
            icono: '🔥',
            titulo: alert.message || `Temperatura fuera de rango`,
            descripcion: `Valor: ${alert.value}°C (Rango: ${alert.min_value}-${alert.max_value}°C)`,
            subtitulo: `Registrado: ${new Date(alert.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
            fecha: new Date(alert.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            formatCode: 'SGI-FT-01',
            alertId: alert.id // Para poder reconocerla al hacer clic
          });
        });
      }

      // 5. Alertas de formularios pendientes (TODOS los 10 formatos)
      const formsToCheck = [
        { code: 'SGI-FLD-02', name: 'Limpieza y Desinfección', icon: '🧹' },
        { code: 'SGI-FVL-06', name: 'Verificación de Limpieza', icon: '🔍' },
        { code: 'SGI-FT-01', name: 'Temperatura de Hornos', icon: '🔥' },
        { code: 'SGI-FPH-03', name: 'Prácticas Higiénicas', icon: '✨' },
        { code: 'SGI-FIR-04', name: 'Inspección de Residuos', icon: '🗑️' },
        { code: 'SGI-FPC-05', name: 'Control de Plagas', icon: '🪲' },
        { code: 'SGI-FCFA-07', name: 'Seguimiento pH y Cloro', icon: '💧' },
        { code: 'SGI-TZP-08', name: 'Devolución de Producto', icon: '🔄' },
        { code: 'SGI-FMP-09', name: 'Control de Materia Prima', icon: '📦' },
        { code: 'SGI-FTHR-11', name: 'Registro Temp y HR', icon: '🌡️' }
      ];

      for (const form of formsToCheck) {
        const count = await this.contarFormulario(form.code, hoy);
        if (count === 0) {
          this.alertas.push({ 
            tipo: 'info', 
            icono: form.icon, 
            titulo: `${form.name} pendiente`, 
            descripcion: `No hay registros de ${form.name} para hoy`, 
            subtitulo: 'Se requiere diligenciar', 
            fecha: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), 
            formatCode: form.code 
          });
        }
      }

      this.kpis.alertasActivas = this.alertas.filter((a: any) => a.tipo === 'danger' || a.tipo === 'warning').length;
    } catch (error) {
      console.error('Error cargando alertas:', error);
    }
  }

  async resolverYRedirigirAlerta(alerta: any) {
    const formatCode = alerta.formatCode;
    if (!formatCode) return;

    // ✅ Si es una alerta de temperatura (tiene alertId), la reconocemos en la BD
    if (alerta.alertId) {
      const user = await this.supabaseService.getCurrentUser();
      if (user) {
        await this.supabaseService
          .from('alerts')
          .update({ 
            acknowledged: true,
            acknowledged_by: user.id,
            acknowledged_at: new Date().toISOString()
          })
          .eq('id', alerta.alertId);
      }
      // Recargar alertas para quitarla de la lista visualmente
      await this.cargarAlertas();
    }

    if (alerta.titulo.includes('pendiente')) {
      const { data } = await this.supabaseService
        .from('checklists')
        .select('id')
        .eq('format_type', formatCode)
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', this.fechaHoy)
        .limit(1);

      if (data && data.length > 0) {
        this.alertas = this.alertas.filter(a => a !== alerta);
        this.kpis.alertasActivas = this.alertas.filter((a: any) => a.tipo === 'danger' || a.tipo === 'warning').length;
      }
    }

    const route = this.formatToRoute[formatCode];
    if (route) {
      this.router.navigate([`/pages/${route}`], { queryParams: { date: this.fechaHoy } });
    }
  }

  async cargarRegistrosRecientes() {
    try {
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .in('format_type', Object.keys(this.formatToRoute))
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      this.registrosRecientes = (data || []).map((reg: any) => ({
        id: reg.id,
        formato: this.getFormatName(reg.format_type),
        formatoIcono: this.getFormatIcon(reg.format_type),
        formatoColor: this.getFormatColor(reg.format_type),
        resumen: this.getResumen(reg.format_type, reg.data),
        fecha: new Date(reg.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }),
        hora: new Date(reg.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      }));
    } catch (error) {
      console.error('Error cargando registros recientes:', error);
    }
  }

  getFormatName(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': 'Limpieza y Desinfección', 'SGI-FVL-06': 'Verificación de Limpieza', 'SGI-FT-01': 'Temperatura de Hornos',
      'SGI-FPH-03': 'Prácticas Higiénicas', 'SGI-FIR-04': 'Inspección de Residuos', 'SGI-FPC-05': 'Control de Plagas',
      'SGI-FCFA-07': 'Seguimiento pH y Cloro', 'SGI-TZP-08': 'Devolución de Producto', 'SGI-FMP-09': 'Control de Materia Prima', 'SGI-FTHR-11': 'Registro Temp y HR'
    };
    return map[formatType] || formatType;
  }

  getFormatIcon(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': '🧹', 'SGI-FVL-06': '🔍', 'SGI-FT-01': '🔥', 'SGI-FPH-03': '✨', 'SGI-FIR-04': '🗑️',
      'SGI-FPC-05': '🪲', 'SGI-FCFA-07': '💧', 'SGI-TZP-08': '🔄', 'SGI-FMP-09': '📦', 'SGI-FTHR-11': '🌡️'
    };
    return map[formatType] || '📋';
  }

  getFormatColor(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FLD-02': 'blue', 'SGI-FVL-06': 'emerald', 'SGI-FT-01': 'orange', 'SGI-FPH-03': 'purple', 'SGI-FIR-04': 'amber',
      'SGI-FPC-05': 'rose', 'SGI-FCFA-07': 'cyan', 'SGI-TZP-08': 'violet', 'SGI-FMP-09': 'fuchsia', 'SGI-FTHR-11': 'teal'
    };
    return map[formatType] || 'gray';
  }

  getResumen(formatType: string, data: any): string {
    if (!data) return 'Sin datos';
    switch (formatType) {
      case 'SGI-FLD-02': return `${data.aspecto_evaluar || '-'} • ${data.responsable || '-'}`;
      case 'SGI-FVL-06': return `${data.aspecto_evaluar || '-'} • ${data.cumple === 'Si' ? '✅' : '❌'}`;
      case 'SGI-FT-01': return `${data.jornada || '-'} • H1: ${data.horno_1 || '-'}°C`;
      case 'SGI-FPH-03': return `${data.nombre_evaluado || '-'} • ${data.cargo || '-'}`;
      case 'SGI-FIR-04': return `${data.area_inspeccionada || '-'} • ${data.responsable || '-'}`;
      case 'SGI-FPC-05': return `${data.area_inspeccionada || '-'} • ${data.responsable || '-'}`;
      case 'SGI-FCFA-07': return `pH: ${data.ph || '-'} • Cloro: ${data.cloro || '-'}`;
      case 'SGI-TZP-08': return `${data.nombre_producto || '-'} • ${data.cantidad || '-'}`;
      case 'SGI-FMP-09': return `${data.producto || '-'} • ${data.proveedor || '-'}`;
      case 'SGI-FTHR-11': return `Temp: ${data.temperatura_manana || '-'}°C • HR: ${data.hr_manana || '-'}%`;
      default: return 'Registro completado';
    }
  }

  async cargarCumplimientoPorFormato() {
    try {
      const hoy = this.fechaHoy;
      const [
        cumpleLimpieza, cumpleVerif, cumpleHornos, cumpleHig, cumpleRes, 
        cumplePlag, cumplePHCloro, cumpleDevolucion, cumpleMP, cumpleTempHR
      ] = await Promise.all([
        this.calcularCumplimientoLimpieza(hoy),
        this.calcularCumplimientoVerificacion(hoy),
        this.calcularCumplimientoHornos(hoy),
        this.calcularCumplimientoHigienicas(hoy),
        this.calcularCumplimientoResiduos(hoy),
        this.calcularCumplimientoPlagas(hoy),
        this.calcularCumplimientoPHCloro(hoy),
        this.calcularCumplimientoDevolucion(hoy),
        this.calcularCumplimientoMateriaPrima(hoy),
        this.calcularCumplimientoTempHR(hoy)
      ]);

      this.cumplimientoPorFormato = [
        { formato: 'Limpieza', porcentaje: cumpleLimpieza >= 0 ? cumpleLimpieza : 0 },
        { formato: 'Verificación', porcentaje: cumpleVerif >= 0 ? cumpleVerif : 0 },
        { formato: 'Hornos', porcentaje: cumpleHornos >= 0 ? cumpleHornos : 0 },
        { formato: 'Higiénicas', porcentaje: cumpleHig >= 0 ? cumpleHig : 0 },
        { formato: 'Residuos', porcentaje: cumpleRes >= 0 ? cumpleRes : 0 },
        { formato: 'Plagas', porcentaje: cumplePlag >= 0 ? cumplePlag : 0 },
        { formato: 'pH/Cloro', porcentaje: cumplePHCloro >= 0 ? cumplePHCloro : 0 },
        { formato: 'Devolución', porcentaje: cumpleDevolucion >= 0 ? cumpleDevolucion : 0 },
        { formato: 'Materia Prima', porcentaje: cumpleMP >= 0 ? cumpleMP : 0 },
        { formato: 'Temp/HR', porcentaje: cumpleTempHR >= 0 ? cumpleTempHR : 0 }
      ].filter(c => c.porcentaje >= 0);

    } catch (error) {
      console.error('Error cargando cumplimiento por formato:', error);
    }
  }

  async cargarCausasDevolucion() {
    try {
      const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-TZP-08').eq('plant_id', '00000000-0000-0000-0000-000000000001');
      if (!data || data.length === 0) { this.causasDevolucion = []; return; }

      const causasMap: { [key: string]: number } = {};
      data.forEach((reg: any) => {
        const causa = reg.data?.causa_devolucion || 'Sin especificar';
        causasMap[causa] = (causasMap[causa] || 0) + 1;
      });

      this.causasDevolucion = Object.keys(causasMap).map(causa => ({ causa, cantidad: causasMap[causa] })).sort((a, b) => b.cantidad - a.cantidad);
    } catch (error) {
      console.error('Error cargando causas de devolución:', error);
    }
  }

  async renderizarGraficos() {
    try {
      this.charts.forEach(c => c.destroy());
      this.charts = [];
      await Promise.all([
        this.renderizarTendencia(),
        this.renderizarDistribucion(),
        this.renderizarCumplimientoFormato(),
        this.renderizarHornos(),
        this.renderizarCausasDevolucion()
      ]);
    } catch (error) {
      console.error('Error renderizando gráficos:', error);
    }
  }

  async renderizarTendencia() {
    if (!this.tendenciaChartRef?.nativeElement) return;

    const labels: string[] = [];
    const datasets: any[] = [];
    const formatConfigs = [
      { code: 'SGI-FLD-02', label: 'Limpieza', color: '#3B82F6' },
      { code: 'SGI-FVL-06', label: 'Verificación', color: '#10B981' },
      { code: 'SGI-FT-01', label: 'Hornos', color: '#F97316' },
      { code: 'SGI-FPH-03', label: 'Higiénicas', color: '#A855F7' },
      { code: 'SGI-FIR-04', label: 'Residuos', color: '#F59E0B' },
      { code: 'SGI-FPC-05', label: 'Plagas', color: '#EF4444' },
      { code: 'SGI-FCFA-07', label: 'pH/Cloro', color: '#06B6D4' },
      { code: 'SGI-TZP-08', label: 'Devolución', color: '#8B5CF6' },
      { code: 'SGI-FMP-09', label: 'Materia Prima', color: '#EC4899' },
      { code: 'SGI-FTHR-11', label: 'Temp/HR', color: '#14B8A6' }
    ];

    for (let i = 6; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      const fechaStr = this.formatDate(fecha);
      labels.push(fecha.toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit' }));
    }

    for (const config of formatConfigs) {
      const dataPoints: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() - i);
        const count = await this.contarFormulario(config.code, this.formatDate(fecha));
        dataPoints.push(count);
      }
      datasets.push({
        label: config.label,
        data: dataPoints,
        borderColor: config.color,
        backgroundColor: config.color + '20',
        tension: 0.3,
        fill: false,
        pointRadius: 2,
        borderWidth: 2
      });
    }

    const ctx = this.tendenciaChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#6B7280', font: { size: 10 }, boxWidth: 10 } } },
        scales: {
          y: { beginAtZero: true, ticks: { color: '#6B7280', stepSize: 1 }, grid: { color: 'rgba(107, 114, 128, 0.1)' } },
          x: { ticks: { color: '#6B7280', font: { size: 9 } }, grid: { display: false } }
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
        labels: ['Limpieza', 'Verificación', 'Hornos', 'Higiénicas', 'Residuos', 'Plagas', 'pH/Cloro', 'Devolución', 'Materia Prima', 'Temp/HR'],
        datasets: [{
          data: [this.statsPorFormulario.limpieza, this.statsPorFormulario.verificacion, this.statsPorFormulario.hornos, this.statsPorFormulario.higienicas, this.statsPorFormulario.residuos, this.statsPorFormulario.plagas, this.statsPorFormulario.phCloro, this.statsPorFormulario.devolucion, this.statsPorFormulario.materiaPrima, this.statsPorFormulario.tempHr],
          backgroundColor: ['#3B82F6', '#10B981', '#F97316', '#A855F7', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#EC4899', '#14B8A6'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { color: '#6B7280', font: { size: 10 }, padding: 10, boxWidth: 10 } } },
        cutout: '65%'
      }
    });
    this.charts.push(chart);
  }

  async renderizarCumplimientoFormato() {
    if (!this.cumplimientoFormatoChartRef?.nativeElement || this.cumplimientoPorFormato.length === 0) return;
    const ctx = this.cumplimientoFormatoChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: this.cumplimientoPorFormato.map(c => c.formato),
        datasets: [{
          label: '% Cumplimiento',
          data: this.cumplimientoPorFormato.map(c => c.porcentaje),
          backgroundColor: this.cumplimientoPorFormato.map(c => c.porcentaje >= 80 ? '#10B981' : c.porcentaje >= 60 ? '#F59E0B' : '#EF4444'),
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, max: 100, ticks: { color: '#6B7280', callback: (v: any) => v + '%' }, grid: { color: 'rgba(107, 114, 128, 0.1)' } },
          y: { ticks: { color: '#6B7280', font: { size: 10 } }, grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  async renderizarHornos() {
    if (!this.hornosChartRef?.nativeElement) return;
    const { data } = await this.supabaseService.from('checklists').select('data').eq('format_type', 'SGI-FT-01').eq('plant_id', '00000000-0000-0000-0000-000000000001').eq('data->>dia', this.fechaHoy).order('created_at', { ascending: true });

    const labels = (data || []).map((r: any) => r.data?.jornada || '-');
    const horno1 = (data || []).map((r: any) => parseFloat(r.data?.horno_1) || 0);
    const horno2 = (data || []).map((r: any) => parseFloat(r.data?.horno_2) || 0);

    const ctx = this.hornosChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length > 0 ? labels : ['Sin datos'],
        datasets: [
          { label: 'Horno 1 (°C)', data: horno1.length > 0 ? horno1 : [0], borderColor: '#F97316', backgroundColor: 'rgba(249, 115, 22, 0.1)', tension: 0.3, fill: true },
          { label: 'Horno 2 (°C)', data: horno2.length > 0 ? horno2 : [0], borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', tension: 0.3, fill: true }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { color: '#6B7280', font: { size: 11 } } } },
        scales: {
          y: { beginAtZero: false, ticks: { color: '#6B7280', callback: (v: any) => v + '°C' }, grid: { color: 'rgba(107, 114, 128, 0.1)' } },
          x: { ticks: { color: '#6B7280' }, grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  async renderizarCausasDevolucion() {
    if (!this.causasDevolucionChartRef?.nativeElement || this.causasDevolucion.length === 0) return;
    const ctx = this.causasDevolucionChartRef.nativeElement.getContext('2d');
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: this.causasDevolucion.map(c => c.causa),
        datasets: [{
          data: this.causasDevolucion.map(c => c.cantidad),
          backgroundColor: ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#6B7280'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#6B7280', font: { size: 10 }, padding: 10, boxWidth: 10 } } },
        cutout: '60%'
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