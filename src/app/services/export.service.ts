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

  // Mapeo de campos legibles por tipo de formulario
  private fieldMappings: { [key: string]: { [key: string]: string } } = {
    'SGI-FLD-02': { // Limpieza y Desinfección
      'aspecto_evaluar': 'Aspecto a Evaluar',
      'responsable': 'Responsable',
      'actividad': 'Actividad',
      'cantidad': 'Cantidad',
      'concentracion': 'Concentración (%)',
      'dia': 'Día',
      'frecuencia': 'Frecuencia',
      'observaciones': 'Observaciones'
    },
    'SGI-FT-01': { // Temperatura de Hornos
      'horno_1': 'Horno 1 (°C)',
      'horno_2': 'Horno 2 (°C)',
      'horno_3': 'Horno 3 (°C)',
      'tiempo_coccion': 'Tiempo Cocción (min)',
      'operador': 'Operador',
      'observaciones': 'Observaciones'
    },
    'SGI-FVL-06': { // Verificación de Limpieza
      'area_inspeccionada': 'Área Inspeccionada',
      'inspector': 'Inspector',
      'resultado': 'Resultado',
      'metodo_verificacion': 'Método Verificación',
      'observaciones': 'Observaciones'
    },
    'SGI-FPH-03': { // Prácticas Higiénicas
      'area': 'Área Evaluada',
      'uniforme_completo': 'Uniforme Completo',
      'lavado_manos': 'Lavado Manos',
      'uso_cofia': 'Uso de Cofia',
      'uso_cubrebocas': 'Uso de Cubrebocas',
      'calzado_adecuado': 'Calzado Adecuado',
      'uñas_cortas_limpias': 'Uñas Cortas/Limpias',
      'sin_joyas': 'Sin Joyas',
      'observaciones': 'Observaciones'
    },
    'SGI-FIR-04': { // Inspección de Residuos
      'area': 'Área Inspeccionada',
      'tipo_residuo': 'Tipo Residuo',
      'contenedores_adecuados': 'Contenedores Adecuados',
      'senalizacion': 'Señalización',
      'frecuencia_recoleccion': 'Frecuencia Recolección',
      'observaciones': 'Observaciones'
    },
    'SGI-FPC-05': { // Control de Plagas
      'area_inspeccionada': 'Área Inspeccionada',
      'evidencia_plagas': 'Evidencia Plagas',
      'tipo_plaga': 'Tipo Plaga',
      'trampas_colocadas': 'Trampas Colocadas',
      'cantidad_trampas': 'Cantidad Trampas',
      'fumigacion_reciente': 'Fumigación Reciente',
      'observaciones': 'Observaciones'
    },
    'SGI-FCFA-07': { // pH y Cloro
      'punto_muestreo': 'Punto Muestreo',
      'ph': 'pH Medido',
      'ph_min': 'pH Mínimo',
      'ph_max': 'pH Máximo',
      'cloro_libre': 'Cloro Libre (ppm)',
      'cloro_min': 'Cloro Mínimo',
      'cloro_max': 'Cloro Máximo',
      'responsable': 'Responsable',
      'observaciones': 'Observaciones'
    },
    'SGI-TZP-08': { // Devolución de Producto
      'producto': 'Producto',
      'lote': 'Lote',
      'cantidad': 'Cantidad Devuelta',
      'motivo': 'Motivo',
      'origen': 'Origen',
      'estado_producto': 'Estado Producto',
      'responsable': 'Responsable',
      'observaciones': 'Observaciones'
    },
    'SGI-FMP-09': { // Materia Prima
      'proveedor': 'Proveedor',
      'producto': 'Producto/Materia Prima',
      'lote': 'Lote',
      'fecha_vencimiento': 'Fecha Vencimiento',
      'cantidad_recibida': 'Cantidad Recibida',
      'unidad_medida': 'Unidad Medida',
      'temperatura_recepcion': 'Temp. Recepción (°C)',
      'inspeccion_organoleptica': 'Inspección Organoléptica',
      'observaciones': 'Observaciones'
    },
    'SGI-FTHR-11': { // Temp y HR CC
      'area': 'Área/Cuarto',
      'temperatura_manana': 'Temp. Mañana (°C)',
      'hr_manana': 'HR Mañana (%)',
      'temperatura_tarde': 'Temp. Tarde (°C)',
      'hr_tarde': 'HR Tarde (%)',
      'temp_min_permitida': 'Temp. Mín Permitida',
      'temp_max_permitida': 'Temp. Máx Permitida',
      'responsable': 'Responsable',
      'observaciones': 'Observaciones'
    }
  };

  // Nombres legibles de formatos
  private formatNames: { [key: string]: string } = {
    'SGI-FT-01': 'Temperatura de Hornos',
    'SGI-FLD-02': 'Limpieza y Desinfección',
    'SGI-FVL-06': 'Verificación de Limpieza',
    'SGI-FPH-03': 'Prácticas Higiénicas',
    'SGI-FIR-04': 'Inspección de Residuos',
    'SGI-FPC-05': 'Control de Plagas',
    'SGI-FCFA-07': 'Seguimiento pH y Cloro',
    'SGI-TZP-08': 'Devolución de Producto',
    'SGI-FMP-09': 'Control de Materia Prima',
    'SGI-FTHR-11': 'Registro Temp y HR CC'
  };

  constructor(private supabaseService: SupabaseService) {}

  getSupabase() {
    return this.supabaseService.getSupabase();
  }

  // Construir query con filtros (SOLO fecha y formato)
  private buildQuery(filters: any) {
    let query = this.supabaseService
      .from('checklists')
      .select('*');

    // ✅ Usar data->>dia para filtros de fecha (consistente con formulario)
    if (filters.startDate) {
      query = query.gte('data->>dia', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('data->>dia', filters.endDate);
    }
    if (filters.formatType) {
      query = query.eq('format_type', filters.formatType);
    }

    return query.order('created_at', { ascending: false });
  }

  // Generar nombre de archivo descriptivo
  private generateFileName(prefix: string, extension: string, filters: any): string {
    const parts = [prefix];
    
    if (filters.formatType) {
      const formatName = this.formatNames[filters.formatType] || filters.formatType;
      parts.push(formatName.replace(/\s+/g, '_'));
    }
    
    if (filters.startDate && filters.endDate) {
      if (filters.startDate === filters.endDate) {
        parts.push(filters.startDate);
      } else {
        parts.push(`${filters.startDate}_a_${filters.endDate}`);
      }
    } else if (filters.startDate) {
      parts.push(`desde_${filters.startDate}`);
    } else if (filters.endDate) {
      parts.push(`hasta_${filters.endDate}`);
    }
    
    const timestamp = new Date().toISOString().split('T')[0];
    parts.push(timestamp);
    
    return `${parts.join('_')}.${extension}`;
  }

  // ============================================
  // EXPORTAR A EXCEL
  // ============================================
  async exportToExcel(filters: {
    startDate?: string;
    endDate?: string;
    formatType?: string;
  } = {}) {
    try {
      const { data, error } = await this.buildQuery(filters);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: false, error: new Error('No hay registros que coincidan con los filtros') };
      }

      // Agrupar por tipo de formato
      const workbook = XLSX.utils.book_new();
      const groupedData = this.groupByFormat(data);

      // Crear una hoja por cada tipo de formato
      Object.keys(groupedData).forEach(formatType => {
        const items = groupedData[formatType];
        const fieldMapping = this.fieldMappings[formatType] || {};
        
        // Obtener todas las claves únicas
        const allKeys = new Set<string>();
        items.forEach(item => {
          if (item.data) {
            Object.keys(item.data).forEach(key => allKeys.add(key));
          }
        });

        // Crear datos con cabeceras legibles
        const excelData = items.map(item => {
          const row: any = {
            'ID': item.id,
            'Fecha Registro': new Date(item.created_at).toLocaleString('es-ES'),
          };

          // Agregar campos del formulario con nombres legibles
          allKeys.forEach(key => {
            const label = fieldMapping[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            let value = item.data?.[key];
            
            // Formatear concentración con %
            if (key === 'concentracion' && value !== undefined && value !== null) {
              value = `${value}%`;
            }
            
            row[label] = value ?? '';
          });

          return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        
        // Ajustar ancho de columnas
        const colWidths = Object.keys(excelData[0] || {}).map(key => ({
          wch: Math.max(key.length, 15)
        }));
        worksheet['!cols'] = colWidths;

        // Nombre de hoja (máximo 31 caracteres)
        const sheetName = (this.formatNames[formatType] || formatType).substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Si hay múltiples formatos, crear una hoja "Resumen General"
      if (Object.keys(groupedData).length > 1) {
        const summaryData = data.map(item => ({
          'ID': item.id,
          'Formato': this.formatNames[item.format_type] || item.format_type,
          'Fecha': new Date(item.created_at).toLocaleString('es-ES'),
          'Día Registro': item.data?.dia || '',
          'Resumen': this.extractSummary(item.data)
        }));

        const summarySheet = XLSX.utils.json_to_sheet(summaryData);
        summarySheet['!cols'] = [
          { wch: 40 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, 
          { wch: 50 }
        ];
        XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen General');
      }

      // Generar nombre de archivo
      const fileName = this.generateFileName('Reporte', 'xlsx', filters);

      // Descargar
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      saveAs(blob, fileName);

      return { success: true, count: data.length };

    } catch (error) {
      console.error('Error exportando a Excel:', error);
      return { success: false, error };
    }
  }

  // ============================================
  // EXPORTAR A PDF
  // ============================================
  async exportToPDF(filters: {
    startDate?: string;
    endDate?: string;
    formatType?: string;
  } = {}) {
    try {
      const { data, error } = await this.buildQuery(filters);

      if (error) throw error;
      if (!data || data.length === 0) {
        return { success: false, error: new Error('No hay registros que coincidan con los filtros') };
      }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Agrupar por formato
      const groupedData = this.groupByFormat(data);
      let isFirstPage = true;

      Object.keys(groupedData).forEach((formatType, index) => {
        const items = groupedData[formatType];
        const formatName = this.formatNames[formatType] || formatType;
        const fieldMapping = this.fieldMappings[formatType] || {};

        // Nueva página para cada formato (excepto el primero)
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        // Encabezado
        doc.setFillColor(60, 80, 224);
        doc.rect(0, 0, pageWidth, 25, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(formatName, 14, 12);
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Sistema BPM - Pan del Sur | ${items.length} registro(s)`, 14, 19);

        // Información de filtros
        let yPos = 32;
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        
        const filterInfo: string[] = [];
        if (filters.startDate && filters.endDate) {
          if (filters.startDate === filters.endDate) {
            filterInfo.push(`Fecha: ${filters.startDate}`);
          } else {
            filterInfo.push(`Período: ${filters.startDate} a ${filters.endDate}`);
          }
        } else if (filters.startDate) {
          filterInfo.push(`Desde: ${filters.startDate}`);
        } else if (filters.endDate) {
          filterInfo.push(`Hasta: ${filters.endDate}`);
        }
        
        if (filterInfo.length > 0) {
          doc.text(filterInfo.join(' | '), 14, yPos);
          yPos += 6;
        }

        // Obtener todas las claves únicas de los datos
        const allKeys = new Set<string>();
        items.forEach(item => {
          if (item.data) {
            Object.keys(item.data).forEach(key => allKeys.add(key));
          }
        });

        // Preparar cabeceras
        const headers = ['N°', 'Fecha', ...Array.from(allKeys).map(k => fieldMapping[k] || k)];
        
        // Preparar datos de la tabla
        const tableData = items.map((item, idx) => {
          const row: any[] = [
            idx + 1,
            new Date(item.created_at).toLocaleDateString('es-ES')
          ];
          
          allKeys.forEach(key => {
            let value = item.data?.[key];
            if (key === 'concentracion' && value !== undefined && value !== null) {
              value = `${value}%`;
            }
            row.push(value ?? '-');
          });
          
          return row;
        });

        // Crear tabla
        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: tableData,
          styles: {
            fontSize: 7,
            cellPadding: 2,
            overflow: 'linebreak',
            lineColor: [220, 220, 220],
            lineWidth: 0.1
          },
          headStyles: {
            fillColor: [255, 107, 53],
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 7
          },
          alternateRowStyles: {
            fillColor: [250, 250, 250]
          },
          columnStyles: {
            0: { cellWidth: 8, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 22 }
          },
          margin: { left: 14, right: 14 }
        });

        // Pie de página
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(
            `Página ${i} de ${pageCount} | Generado: ${new Date().toLocaleString('es-ES')} | Sistema BPM - Pan del Sur`,
            14,
            pageHeight - 8
          );
        }
      });

      // Generar nombre de archivo
      const fileName = this.generateFileName('Reporte', 'pdf', filters);
      doc.save(fileName);

      return { success: true, count: data.length };

    } catch (error) {
      console.error('Error exportando a PDF:', error);
      return { success: false, error };
    }
  }

  // ============================================
  // EXPORTAR REGISTRO INDIVIDUAL
  // ============================================
  async exportIndividualRecord(recordId: string, format: 'excel' | 'pdf') {
    try {
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .eq('id', recordId)
        .single();

      if (error) throw error;
      if (!data) {
        return { success: false, error: new Error('Registro no encontrado') };
      }

      if (format === 'excel') {
        return this.exportSingleToExcel(data);
      } else {
        return this.exportSingleToPDF(data);
      }
    } catch (error) {
      console.error('Error exportando registro individual:', error);
      return { success: false, error };
    }
  }

  private async exportSingleToExcel(item: any) {
    const fieldMapping = this.fieldMappings[item.format_type] || {};
    const formatName = this.formatNames[item.format_type] || item.format_type;

    const excelData = [{
      'Campo': 'ID',
      'Valor': item.id
    }, {
      'Campo': 'Formato',
      'Valor': formatName
    }, {
      'Campo': 'Fecha de Registro',
      'Valor': new Date(item.created_at).toLocaleString('es-ES')
    }, {
      'Campo': 'Estado',
      'Valor': item.status
    }, {
      'Campo': 'Establecimiento',
      'Valor': item.establishment
    }];

    // Agregar campos del formulario
    if (item.data) {
      Object.keys(item.data).forEach(key => {
        let value = item.data[key];
        const label = fieldMapping[key] || key;
        
        if (key === 'concentracion' && value !== undefined && value !== null) {
          value = `${value}%`;
        }
        
        excelData.push({
          'Campo': label,
          'Valor': value ?? ''
        });
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registro');
    
    worksheet['!cols'] = [{ wch: 30 }, { wch: 50 }];

    const fileName = `Registro_${formatName.replace(/\s+/g, '_')}_${item.data?.dia || new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    saveAs(blob, fileName);

    return { success: true, count: 1 };
  }

  private async exportSingleToPDF(item: any) {
    const fieldMapping = this.fieldMappings[item.format_type] || {};
    const formatName = this.formatNames[item.format_type] || item.format_type;

    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Encabezado con color
    doc.setFillColor(60, 80, 224);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(formatName, 14, 18);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema BPM - Pan del Sur', 14, 26);
    doc.text(`Registro Individual`, 14, 31);

    // Información general
    let yPos = 45;
    
    doc.setTextColor(60, 80, 224);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Información General', 14, yPos);
    yPos += 2;
    
    doc.setDrawColor(60, 80, 224);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    const generalInfo = [
      ['ID del Registro', item.id],
      ['Fecha de Creación', new Date(item.created_at).toLocaleString('es-ES')],
      ['Estado', item.status],
      ['Establecimiento', item.establishment]
    ];

    doc.setFontSize(10);
    generalInfo.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text(`${label}:`, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(String(value), 70, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Datos del formulario
    doc.setTextColor(255, 107, 53);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Datos del Formulario', 14, yPos);
    yPos += 2;
    
    doc.setDrawColor(255, 107, 53);
    doc.setLineWidth(0.5);
    doc.line(14, yPos, pageWidth - 14, yPos);
    yPos += 8;

    // Tabla con los datos
    if (item.data) {
      const tableData = Object.keys(item.data).map(key => {
        const label = fieldMapping[key] || key.replace(/_/g, ' ');
        let value = item.data[key];
        
        if (key === 'concentracion' && value !== undefined && value !== null) {
          value = `${value}%`;
        }
        
        return [label, value ?? '-'];
      });

      autoTable(doc, {
        startY: yPos,
        head: [['Campo', 'Valor']],
        body: tableData,
        styles: {
          fontSize: 10,
          cellPadding: 4,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [255, 107, 53],
          textColor: 255,
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { cellWidth: 70, fontStyle: 'bold', fillColor: [250, 250, 250] },
          1: { cellWidth: 'auto' }
        },
        margin: { left: 14, right: 14 }
      });
    }

    // Pie de página
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generado: ${new Date().toLocaleString('es-ES')} | Sistema BPM - Pan del Sur`,
      14,
      pageHeight - 10
    );

    const fileName = `Registro_${formatName.replace(/\s+/g, '_')}_${item.data?.dia || new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);

    return { success: true, count: 1 };
  }

  // ============================================
  // UTILIDADES
  // ============================================
  private groupByFormat(data: any[]): { [key: string]: any[] } {
    return data.reduce((acc, item) => {
      const format = item.format_type;
      if (!acc[format]) acc[format] = [];
      acc[format].push(item);
      return acc;
    }, {} as { [key: string]: any[] });
  }

  private extractSummary(data: any): string {
    if (!data) return 'Sin datos';
    
    try {
      const obj = typeof data === 'string' ? JSON.parse(data) : data;
      const keys = Object.keys(obj);
      
      const summary = keys.slice(0, 3).map(key => {
        const value = obj[key];
        return `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`;
      }).join(', ');
      
      return summary + (keys.length > 3 ? '...' : '');
    } catch {
      return 'Datos no válidos';
    }
  }
}