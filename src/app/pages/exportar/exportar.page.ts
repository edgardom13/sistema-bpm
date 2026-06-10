import { Component, OnInit } from '@angular/core';
import { ExportService } from '../../services/export.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-exportar',
  templateUrl: './exportar.page.html',
  styleUrls: ['./exportar.page.scss'],
  standalone: false
})
export class ExportarPage implements OnInit {
  filters = {
    startDate: '',
    endDate: '',
    formatType: ''
  };

  formatOptions = [
    { value: 'SGI-FT-01', label: 'Temperatura de Hornos', icon: '🔥' },
    { value: 'SGI-FLD-02', label: 'Limpieza y Desinfección', icon: '🧹' },
    { value: 'SGI-FVL-06', label: 'Verificación de Limpieza', icon: '🔍' },
    { value: 'SGI-FPH-03', label: 'Prácticas Higiénicas', icon: '✨' }
  ];

  exporting = false;
  loadingPreview = false;
  previewCount = 0;
  previewDataList: any[] = [];
  activeFilters: { key: string; label: string }[] = [];

  stats = {
    totalRegistros: 0,
    ultimoRegistro: null as string | null
  };

  constructor(
    private exportService: ExportService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.cargarEstadisticas();
    this.previewData();
  }

  async cargarEstadisticas() {
    try {
      const { count } = await this.exportService.getSupabase()
        .from('checklists')
        .select('*', { count: 'exact', head: true });

      const { data } = await this.exportService.getSupabase()
        .from('checklists')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      this.stats.totalRegistros = count || 0;
      if (data && data.length > 0) {
        this.stats.ultimoRegistro = data[0].created_at;
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  async previewData() {
    this.loadingPreview = true;
    
    try {
      // Obtener datos reales para la vista previa
      const data = await this.exportService.getFilteredData(this.filters);
      
      this.previewCount = data.length;
      this.previewDataList = data.slice(0, 10).map(reg => this.mapRegistro(reg));
      
      this.updateActiveFilters();

    } catch (error) {
      console.error('Error en vista previa:', error);
      this.previewDataList = [];
      this.previewCount = 0;
    } finally {
      this.loadingPreview = false;
    }
  }

  // Mapear registro para mostrar en la vista previa
  private mapRegistro(reg: any): any {
    const data = reg.data || {};
    const formatType = reg.format_type;
    
    let resumen = '';
    let detalles: { label: string; value: string }[] = [];
    
    switch (formatType) {
      case 'SGI-FLD-02':
        resumen = data.aspecto_evaluar || '-';
        detalles = [
          { label: 'Responsable', value: data.responsable || '-' },
          { label: 'Actividad', value: data.actividad || '-' },
          { label: 'Concentración', value: data.concentracion ? `${data.concentracion}%` : '-' },
          { label: 'Frecuencia', value: data.frecuencia || '-' }
        ];
        break;
      case 'SGI-FVL-06':
        resumen = data.aspecto_evaluar || '-';
        detalles = [
          { label: 'Responsable', value: data.responsable || '-' },
          { label: 'Cumple', value: data.cumple || '-' },
          { label: 'Procedimiento', value: data.procedimiento || '-' },
          { label: 'Verificado', value: data.verificado || '-' }
        ];
        break;
      case 'SGI-FT-01':
        resumen = `H1: ${data.horno_1 || '-'}°C | H2: ${data.horno_2 || '-'}°C`;
        detalles = [
          { label: 'Jornada', value: data.jornada || '-' },
          { label: 'Responsable', value: data.responsable || '-' }
        ];
        break;
      case 'SGI-FPH-03':
        resumen = data.nombre_evaluado || '-';
        const cumpleCount = data.items?.filter((i: any) => i.cumple === 'Si').length || 0;
        const totalItems = data.items?.length || 0;
        detalles = [
          { label: 'Cargo', value: data.cargo || '-' },
          { label: 'Cumplimiento', value: `${cumpleCount}/${totalItems} ítems` },
          { label: 'Responsable', value: data.responsable_checkeo || '-' }
        ];
        break;
      default:
        resumen = 'Registro';
    }
    
    return {
      id: reg.id,
      formato: this.getFormatName(formatType),
      formatoIcon: this.getFormatIcon(formatType),
      formatoColor: this.getFormatColor(formatType),
      dia: data.dia || '-',
      resumen,
      detalles,
      fechaRegistro: new Date(reg.created_at).toLocaleString('es-ES')
    };
  }

  private getFormatName(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FT-01': 'Hornos',
      'SGI-FLD-02': 'Limpieza',
      'SGI-FVL-06': 'Verificación',
      'SGI-FPH-03': 'Higiénicas'
    };
    return map[formatType] || formatType;
  }

  private getFormatIcon(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FT-01': '🔥',
      'SGI-FLD-02': '🧹',
      'SGI-FVL-06': '🔍',
      'SGI-FPH-03': '✨'
    };
    return map[formatType] || '📋';
  }

  private getFormatColor(formatType: string): string {
    const map: { [key: string]: string } = {
      'SGI-FT-01': 'orange',
      'SGI-FLD-02': 'blue',
      'SGI-FVL-06': 'emerald',
      'SGI-FPH-03': 'purple'
    };
    return map[formatType] || 'gray';
  }

  updateActiveFilters() {
    this.activeFilters = [];
    
    if (this.filters.startDate) {
      const label = this.filters.endDate && this.filters.startDate === this.filters.endDate
        ? `📅 Fecha: ${this.formatDate(this.filters.startDate)}`
        : `📅 Desde: ${this.formatDate(this.filters.startDate)}`;
      this.activeFilters.push({ key: 'startDate', label });
    }
    
    if (this.filters.endDate && this.filters.endDate !== this.filters.startDate) {
      this.activeFilters.push({ key: 'endDate', label: `📅 Hasta: ${this.formatDate(this.filters.endDate)}` });
    }
    
    if (this.filters.formatType) {
      const format = this.formatOptions.find(f => f.value === this.filters.formatType);
      this.activeFilters.push({ key: 'formatType', label: `${format?.icon || '📋'} ${format?.label || this.filters.formatType}` });
    }
  }

  removeFilter(key: string) {
    (this.filters as any)[key] = '';
    this.previewData();
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  async exportExcel() {
    if (this.previewCount === 0) {
      await this.showToast('No hay registros que coincidan con los filtros', 'error');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: `📊 Exportando ${this.previewCount} registros a Excel...`,
      duration: 0
    });
    await loading.present();

    try {
      this.exporting = true;
      const result = await this.exportService.exportToExcel(this.filters);
      await loading.dismiss();
      
      if (result.success) {
        await this.showToast(`✅ Exportados ${result.count} registros a Excel`, 'success');
      } else {
        await this.showToast('❌ Error al exportar: ' + (result.error as any).message, 'error');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showToast('❌ Error: ' + (error as any).message, 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportPDF() {
    if (this.previewCount === 0) {
      await this.showToast('No hay registros que coincidan con los filtros', 'error');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: `📄 Generando PDF con ${this.previewCount} registros...`,
      duration: 0
    });
    await loading.present();

    try {
      this.exporting = true;
      const result = await this.exportService.exportToPDF(this.filters);
      await loading.dismiss();
      
      if (result.success) {
        await this.showToast(`✅ PDF generado con ${result.count} registros`, 'success');
      } else {
        await this.showToast('❌ Error al generar PDF: ' + (result.error as any).message, 'error');
      }
    } catch (error) {
      await loading.dismiss();
      await this.showToast('❌ Error: ' + (error as any).message, 'error');
    } finally {
      this.exporting = false;
    }
  }

  async showToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }

  clearFilters() {
    this.filters = {
      startDate: '',
      endDate: '',
      formatType: ''
    };
    this.previewData();
  }
}