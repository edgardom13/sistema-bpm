import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private supabaseService: SupabaseService) {}

  // Exportar a Excel
  async exportToExcel(filters: {
    startDate?: string;
    endDate?: string;
    formatType?: string;
    status?: string;
  } = {}) {
    try {
      // Obtener datos de Supabase
      let query = this.supabaseService
        .from('checklists')
        .select(`
          id,
          format_type,
          establishment,
          status,
          created_at,
          created_by,
          data
        `);

      // Aplicar filtros
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.formatType) {
        query = query.eq('format_type', filters.formatType);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Transformar datos para Excel
      const excelData = data.map(item => ({
        'ID': item.id,
        'Formato': item.format_type,
        'Establecimiento': item.establishment,
        'Estado': item.status,
        'Fecha Creación': new Date(item.created_at).toLocaleString('es-ES'),
        'Creado Por': item.created_by,
        'Datos': JSON.stringify(item.data, null, 2)
      }));

      // Crear workbook
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Checklists');

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 40 }, // ID
        { wch: 20 }, // Formato
        { wch: 30 }, // Establecimiento
        { wch: 15 }, // Estado
        { wch: 25 }, // Fecha
        { wch: 40 }, // Creado Por
        { wch: 60 }  // Datos
      ];
      worksheet['!cols'] = colWidths;

      // Generar nombre de archivo con fecha
      const fileName = `checklists_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Descargar
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      return { success: true, count: data.length };

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      return { success: false, error };
    }
  }

  // Exportar a PDF
  async exportToPDF(filters: {
    startDate?: string;
    endDate?: string;
    formatType?: string;
    status?: string;
  } = {}) {
    try {
      // Obtener datos
      let query = this.supabaseService
        .from('checklists')
        .select(`
          format_type,
          establishment,
          status,
          created_at,
          data
        `);

      if (filters.startDate) query = query.gte('created_at', filters.startDate);
      if (filters.endDate) query = query.lte('created_at', filters.endDate);
      if (filters.formatType) query = query.eq('format_type', filters.formatType);
      if (filters.status) query = query.eq('status', filters.status);

      const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

      if (error) throw error;

      // Crear PDF
      const doc = new jsPDF('landscape', 'mm', 'a4');

      // Título
      doc.setFontSize(18);
      doc.text('Reporte de Checklists - Sistema BPM', 14, 20);

      // Filtros aplicados
      doc.setFontSize(10);
      doc.setTextColor(100);
      let yPos = 28;
      if (filters.startDate || filters.endDate) {
        doc.text(`Período: ${filters.startDate || 'Inicio'} - ${filters.endDate || 'Actual'}`, 14, yPos);
        yPos += 5;
      }
      if (filters.formatType) {
        doc.text(`Formato: ${filters.formatType}`, 14, yPos);
        yPos += 5;
      }
      yPos += 3;

      // Preparar datos para tabla
      const tableData = data.map(item => [
        item.format_type,
        item.establishment,
        item.status,
        new Date(item.created_at).toLocaleDateString('es-ES'),
        this.extractSummary(item.data)
      ]);

      // Crear tabla
      autoTable(doc, {
        startY: yPos,
        head: [['Formato', 'Establecimiento', 'Estado', 'Fecha', 'Resumen']],
        body: tableData,
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [60, 80, 224],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 35 },
          1: { cellWidth: 50 },
          2: { cellWidth: 30 },
          3: { cellWidth: 30 },
          4: { cellWidth: 'auto' }
        }
      });

      // Pie de página
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Página ${i} de ${pageCount} | Generado: ${new Date().toLocaleString('es-ES')}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      // Descargar
      const fileName = `reporte_checklists_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      return { success: true, count: data.length };

    } catch (error) {
      console.error('Error exportando a PDF:', error);
      return { success: false, error };
    }
  }

  // Extraer resumen de datos JSON
  private extractSummary(data: any): string {
    if (!data) return 'Sin datos';
    
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      const keys = Object.keys(obj);
      
      // Mostrar primeros 3 valores
      const summary = keys.slice(0, 3).map(key => {
        const value = obj[key];
        return `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
      }).join(', ');
      
      return summary + (keys.length > 3 ? '...' : '');
    } catch {
      return 'Datos no válidos';
    }
  }
  // Agrega esto al final de ExportService
getSupabase() {
  return this.supabaseService.getSupabase();
}

}