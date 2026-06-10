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
    { value: 'SGI-FT-01', label: 'Temperatura de Hornos' },
    { value: 'SGI-FLD-02', label: 'Limpieza y Desinfección' },
    { value: 'SGI-FVL-06', label: 'Verificación de Limpieza' },
    { value: 'SGI-FPH-03', label: 'Prácticas Higiénicas' },
    { value: 'SGI-FIR-04', label: 'Inspección de Residuos' },
    { value: 'SGI-FPC-05', label: 'Control de Plagas' },
    { value: 'SGI-FCFA-07', label: 'Seguimiento pH y Cloro' },
    { value: 'SGI-TZP-08', label: 'Devolución de Producto' },
    { value: 'SGI-FMP-09', label: 'Control de Materia Prima' },
    { value: 'SGI-FTHR-11', label: 'Registro Temp y HR CC' }
  ];

  statusOptions = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'completed', label: 'Completado' },
    { value: 'in_progress', label: 'En Progreso' }
  ];

  exporting = false;
  loadingPreview = false;
  previewCount = 0;
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
      const { data, error } = await this.exportService.getSupabase()
        .from('checklists')
        .select('created_at', { count: 'exact', head: true })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data) {
        const { count } = await this.exportService.getSupabase()
          .from('checklists')
          .select('*', { count: 'exact', head: true });

        this.stats.totalRegistros = count || 0;
        if (data.length > 0) {
          this.stats.ultimoRegistro = data[0].created_at;
        }
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  async previewData() {
  this.loadingPreview = true;
  
  try {
    let query = this.exportService.getSupabase()
      .from('checklists')
      .select('*', { count: 'exact', head: true });

    // Aplicar filtros (solo fecha y formato)
    if (this.filters.startDate) {
      query = query.gte('data->>dia', this.filters.startDate);
    }
    if (this.filters.endDate) {
      query = query.lte('data->>dia', this.filters.endDate);
    }
    if (this.filters.formatType) {
      query = query.eq('format_type', this.filters.formatType);
    }
    // ❌ Eliminamos filtros de status y establishment

    const { count, error } = await query;

    if (!error) {
      this.previewCount = count || 0;
    }

    this.updateActiveFilters();

  } catch (error) {
    console.error('Error en vista previa:', error);
  } finally {
    this.loadingPreview = false;
  }
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
    this.activeFilters.push({ key: 'formatType', label: `📋 ${format?.label || this.filters.formatType}` });
  }
  
  // ❌ Eliminamos los filtros de status y establishment
}

  removeFilter(key: string) {
  if (key === 'startDate') {
    this.filters.startDate = '';
  } else if (key === 'endDate') {
    this.filters.endDate = '';
  } else if (key === 'formatType') {
    this.filters.formatType = '';
  }
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
    
    // Pasar solo los filtros necesarios
    const filters = {
      startDate: this.filters.startDate,
      endDate: this.filters.endDate,
      formatType: this.filters.formatType
    };
    
    const result = await this.exportService.exportToExcel(filters);
    
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
    
    // Pasar solo los filtros necesarios
    const filters = {
      startDate: this.filters.startDate,
      endDate: this.filters.endDate,
      formatType: this.filters.formatType
    };
    
    const result = await this.exportService.exportToPDF(filters);
    
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
      formatType: '',
    };
    this.previewData();
  }
}