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
    formatType: '',
    status: '',
    establishment: ''
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
  }

  async cargarEstadisticas() {
    try {
      const { data, error } = await this.exportService.getSupabase()
        .from('checklists')
        .select('created_at', { count: 'exact', head: true })
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        this.stats.totalRegistros = data.length;
        this.stats.ultimoRegistro = data[0].created_at;
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }

  async exportExcel() {
    const loading = await this.loadingCtrl.create({
      message: '📊 Exportando a Excel...',
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
    const loading = await this.loadingCtrl.create({
      message: '📄 Generando PDF...',
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
      formatType: '',
      status: '',
      establishment: ''
    };
  }

  
}