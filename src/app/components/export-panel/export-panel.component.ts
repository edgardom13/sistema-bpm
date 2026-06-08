import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExportService } from '../../services/export.service';
import { ToastController, LoadingController } from '@ionic/angular';

@Component({
  selector: 'app-export-panel',
  standalone: true,  // ✅ Mantener standalone
  imports: [CommonModule, FormsModule],  // ✅ Agregar imports necesarios
  template: `
    <div class="bg-white dark:bg-[#1C2434] rounded-2xl p-5 border border-gray-200 dark:border-[#2D313A] shadow-sm">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exportar Datos</h3>
      
      <!-- Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fecha Inicio</label>
          <input 
            type="date" 
            [(ngModel)]="filters.startDate"
            class="w-full bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-[#2D313A] rounded-lg px-3 py-2 text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Fecha Fin</label>
          <input 
            type="date" 
            [(ngModel)]="filters.endDate"
            class="w-full bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-[#2D313A] rounded-lg px-3 py-2 text-sm"
          >
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Formato</label>
          <select 
            [(ngModel)]="filters.formatType"
            class="w-full bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-[#2D313A] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="SGI-FT-01">Temperatura Hornos</option>
            <option value="SGI-FLD-02">Limpieza</option>
            <option value="SGI-TZP-08">Devolución</option>
            <option value="SGI-FCFA-07">pH y Cloro</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Estado</label>
          <select 
            [(ngModel)]="filters.status"
            class="w-full bg-gray-50 dark:bg-[#121824] border border-gray-200 dark:border-[#2D313A] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="approved">Aprobado</option>
            <option value="rejected">Rechazado</option>
          </select>
        </div>
      </div>

      <!-- Botones de exportación -->
      <div class="flex gap-2">
        <button 
          (click)="exportExcel()"
          [disabled]="exporting"
          class="flex-1 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-400 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          Excel
        </button>
        
        <button 
          (click)="exportPDF()"
          [disabled]="exporting"
          class="flex-1 flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 disabled:bg-gray-400 text-white font-semibold text-sm py-2.5 px-4 rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          PDF
        </button>
      </div>
    </div>
  `
})
export class ExportPanelComponent {
  @Output() exportComplete = new EventEmitter<any>();
  
  filters = {
    startDate: '',
    endDate: '',
    formatType: '',
    status: ''
  };
  
  exporting = false;

  constructor(
    private exportService: ExportService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async exportExcel() {
    const loading = await this.loadingCtrl.create({ message: 'Exportando a Excel...' });
    await loading.present();

    try {
      this.exporting = true;
      const result = await this.exportService.exportToExcel(this.filters);
      
      await loading.dismiss();
      
      if (result.success) {
        this.showToast(`✅ Exportados ${result.count} registros a Excel`, 'success');
        this.exportComplete.emit(result);
      } else {
        this.showToast(' Error al exportar', 'error');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('❌ Error: ' + (error as any).message, 'error');
    } finally {
      this.exporting = false;
    }
  }

  async exportPDF() {
    const loading = await this.loadingCtrl.create({ message: 'Generando PDF...' });
    await loading.present();

    try {
      this.exporting = true;
      const result = await this.exportService.exportToPDF(this.filters);
      
      await loading.dismiss();
      
      if (result.success) {
        this.showToast(`✅ PDF generado con ${result.count} registros`, 'success');
        this.exportComplete.emit(result);
      } else {
        this.showToast('❌ Error al generar PDF', 'error');
      }
    } catch (error) {
      await loading.dismiss();
      this.showToast('❌ Error: ' + (error as any).message, 'error');
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
}