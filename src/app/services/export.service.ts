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
    'SGI-FLD-02': {
      'aspecto_evaluar': 'Aspecto a Evaluar',
      'responsable': 'Responsable',
      'actividad': 'Actividad',
      'cantidad': 'Cantidad',
      'concentracion': 'Concentración',
      'dia': 'Día',
      'frecuencia': 'Frecuencia',
      'observaciones': 'Observaciones'
    },
    'SGI-FT-01': {
      'dia': 'Día',
      'jornada': 'Jornada',
      'horno_1': 'Horno 1 (°C)',
      'horno_2': 'Horno 2 (°C)',
      'responsable': 'Responsable',
      'observaciones': 'Observaciones'
    },
    'SGI-FVL-06': {
      'aspecto_evaluar': 'Aspecto a Evaluar',
      'responsable': 'Responsable',
      'cumple': 'Cumple',
      'dia': 'Día',
      'observaciones': 'Observaciones',
      'procedimiento': 'Procedimiento',
      'verificado': 'Verificado'
    },
    'SGI-FPH-03': {
      'dia': 'Día',
      'nombre_evaluado': 'Nombre del Evaluado',
      'responsable_checkeo': 'Responsable del Checkeo',
      'firma_evaluado': 'Firma del Evaluado',
      'cargo': 'Cargo',
      'recomendaciones': 'Recomendaciones'
    }
  };

  // Items de evaluación para Higiénicas
  private itemsHigienicas: string[] = [
    'Utiliza correctamente su uniforme de dotación limpio y en buen estado',
    'Ingresa y sale del area de trabajo con el uniforme de dotación',
    'Delantal plástico atado al cuerpo',
    'Lava y desinfecta sus manos y/o guantes siempre que se requiere',
    'Cabello recogido y cubierto totalmente',
    'Se afeita diariamente',
    'Usa maquillaje y/o perfume',
    'Uñas cortas, limpias y sin esmalte',
    'Ausencia de anillos, aretes, joyas u otros accesorios',
    'No come, bebe o mastica ningún objeto o producto',
    'No habla, tose o estornuda sobre los alimentos',
    'No se toca ninguna parte del cuerpo con las manos',
    'No se sienta o reposa sobre las áreas de trabajo',
    'No fuma en el área de trabajo',
    'Guantes limpios, sin roturas o desperfectos (en caso de usarlos)',
    'Usa tapabocas que cubra desde la nariz hasta la boca',
    'Ausencia de celulares equipos electronicos y objetos ajenos al proceso',
    'Uso de calzado en buen estado y limpio'
  ];

  private formatNames: { [key: string]: string } = {
    'SGI-FT-01': 'Temperatura de Hornos',
    'SGI-FLD-02': 'Limpieza y Desinfección',
    'SGI-FVL-06': 'Verificación de Limpieza',
    'SGI-FPH-03': 'Prácticas Higiénicas'
  };

  constructor(private supabaseService: SupabaseService) {}

  getSupabase() {
    return this.supabaseService.getSupabase();
  }

  // ============================================
  // OBTENER DATOS FILTRADOS (para vista previa)
  // ============================================
  async getFilteredData(filters: any = {}) {
    let query = this.supabaseService
      .from('checklists')
      .select('*');

    if (filters.startDate) {
      query = query.gte('data->>dia', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('data->>dia', filters.endDate);
    }
    if (filters.formatType) {
      query = query.eq('format_type', filters.formatType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  // ============================================
  // EXPORTAR A EXCEL
  // ============================================
  async exportToExcel(filters: any = {}) {
    try {
      const data = await this.getFilteredData(filters);

      if (!data || data.length === 0) {
        return { success: false, error: new Error('No hay registros') };
      }

      const workbook = XLSX.utils.book_new();
      
      // Agrupar por tipo de formato
      const grouped = this.groupByFormat(data);

      Object.keys(grouped).forEach(formatType => {
        const items = grouped[formatType];
        const formatName = this.formatNames[formatType] || formatType;
        let excelData: any[] = [];

        // Caso especial: Higiénicas (con items anidados)
        if (formatType === 'SGI-FPH-03') {
          excelData = items.map(item => {
            const row: any = {
              'Día': item.data?.dia || '',
              'Nombre del Evaluado': item.data?.nombre_evaluado || '',
              'Responsable del Checkeo': item.data?.responsable_checkeo || '',
              'Firma del Evaluado': item.data?.firma_evaluado || '',
              'Cargo': item.data?.cargo || '',
              'Recomendaciones': item.data?.recomendaciones || ''
            };

            // Agregar cada ítem de evaluación
            if (item.data?.items && Array.isArray(item.data.items)) {
              this.itemsHigienicas.forEach((itemNombre, idx) => {
                const itemData = item.data.items[idx] || {};
                const nombreCorto = itemNombre.length > 40 
                  ? itemNombre.substring(0, 40) + '...' 
                  : itemNombre;
                row[`✅ ${nombreCorto}`] = itemData.cumple || '-';
                row[`📝 Obs: ${nombreCorto.substring(0, 30)}`] = itemData.observaciones || '';
              });
            }

            return row;
          });
        } 
        // Caso especial: Limpieza (con concentración como %)
        else if (formatType === 'SGI-FLD-02') {
          excelData = items.map(item => ({
            'Aspecto a Evaluar': item.data?.aspecto_evaluar || '',
            'Responsable': item.data?.responsable || '',
            'Actividad': item.data?.actividad || '',
            'Cantidad': item.data?.cantidad || '',
            'Concentración': item.data?.concentracion ? `${item.data.concentracion}%` : '',
            'Día': item.data?.dia || '',
            'Frecuencia': item.data?.frecuencia || '',
            'Observaciones': item.data?.observaciones || ''
          }));
        }
        // Caso especial: Verificación
        else if (formatType === 'SGI-FVL-06') {
          excelData = items.map(item => ({
            'Aspecto a Evaluar': item.data?.aspecto_evaluar || '',
            'Responsable': item.data?.responsable || '',
            'Cumple': item.data?.cumple || '',
            'Día': item.data?.dia || '',
            'Observaciones': item.data?.observaciones || '',
            'Procedimiento': item.data?.procedimiento || '',
            'Verificado': item.data?.verificado || ''
          }));
        }
        // Caso especial: Hornos
        else if (formatType === 'SGI-FT-01') {
          excelData = items.map(item => ({
            'Día': item.data?.dia || '',
            'Jornada': item.data?.jornada || '',
            'Horno 1 (°C)': item.data?.horno_1 || '',
            'Horno 2 (°C)': item.data?.horno_2 || '',
            'Responsable': item.data?.responsable || '',
            'Observaciones': item.data?.observaciones || ''
          }));
        }
        // Caso genérico
        else {
          const fieldMapping = this.fieldMappings[formatType] || {};
          excelData = items.map(item => {
            const row: any = {
              'ID': item.id,
              'Fecha Registro': new Date(item.created_at).toLocaleString('es-ES')
            };
            if (item.data) {
              Object.keys(item.data).forEach(key => {
                const label = fieldMapping[key] || key;
                row[label] = item.data[key] ?? '';
              });
            }
            return row;
          });
        }

        if (excelData.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(excelData);
          const colWidths = Object.keys(excelData[0]).map(key => ({
            wch: Math.max(key.length, 15)
          }));
          worksheet['!cols'] = colWidths;
          XLSX.utils.book_append_sheet(workbook, worksheet, formatName.substring(0, 31));
        }
      });

      const fileName = this.generateFileName('Reporte', 'xlsx', filters);
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
  async exportToPDF(filters: any = {}) {
    try {
      const data = await this.getFilteredData(filters);

      if (!data || data.length === 0) {
        return { success: false, error: new Error('No hay registros') };
      }

      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const grouped = this.groupByFormat(data);
      let isFirstPage = true;

      Object.keys(grouped).forEach((formatType) => {
        const items = grouped[formatType];
        const formatName = this.formatNames[formatType] || formatType;

        if (!isFirstPage) doc.addPage();
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
        }
        if (filterInfo.length > 0) {
          doc.text(filterInfo.join(' | '), 14, yPos);
          yPos += 6;
        }

        // Caso especial: Higiénicas (tabla con items)
        if (formatType === 'SGI-FPH-03') {
          items.forEach((item, idx) => {
            if (idx > 0) doc.addPage();
            
            doc.setFontSize(12);
            doc.setTextColor(60, 80, 224);
            doc.setFont('helvetica', 'bold');
            doc.text(`Evaluación: ${item.data?.nombre_evaluado || 'N/A'}`, 14, yPos);
            yPos += 6;
            
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(`Día: ${item.data?.dia || '-'} | Cargo: ${item.data?.cargo || '-'}`, 14, yPos);
            yPos += 5;
            doc.text(`Responsable: ${item.data?.responsable_checkeo || '-'}`, 14, yPos);
            yPos += 8;

            // Tabla de items
            if (item.data?.items && Array.isArray(item.data.items)) {
              const tableData = this.itemsHigienicas.map((itemNombre, i) => {
                const itemData = item.data.items[i] || {};
                return [
                  (i + 1).toString(),
                  itemNombre,
                  itemData.cumple || '-',
                  itemData.observaciones || '-'
                ];
              });

              autoTable(doc, {
                startY: yPos,
                head: [['N°', 'Ítem a Evaluar', 'Cumple', 'Observaciones']],
                body: tableData,
                styles: { fontSize: 7, cellPadding: 2 },
                headStyles: { fillColor: [255, 107, 53], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                  0: { cellWidth: 8, halign: 'center' },
                  1: { cellWidth: 120 },
                  2: { cellWidth: 20, halign: 'center' },
                  3: { cellWidth: 'auto' }
                }
              });
            }
            
            yPos = (doc as any).lastAutoTable.finalY + 10;
            doc.text(`Recomendaciones: ${item.data?.recomendaciones || '-'}`, 14, yPos);
          });
        }
        // Caso especial: Limpieza
        else if (formatType === 'SGI-FLD-02') {
          const headers = ['N°', 'Aspecto', 'Responsable', 'Actividad', 'Cantidad', 'Conc.', 'Frecuencia', 'Día'];
          const tableData = items.map((item, idx) => [
            (idx + 1).toString(),
            item.data?.aspecto_evaluar || '-',
            item.data?.responsable || '-',
            item.data?.actividad || '-',
            item.data?.cantidad || '-',
            item.data?.concentracion ? `${item.data.concentracion}%` : '-',
            item.data?.frecuencia || '-',
            item.data?.dia || '-'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: tableData,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [255, 107, 53], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 50 },
              6: { cellWidth: 22 }
            }
          });
        }
        // Caso especial: Verificación
        else if (formatType === 'SGI-FVL-06') {
          const headers = ['N°', 'Aspecto', 'Responsable', 'Cumple', 'Procedimiento', 'Verificado', 'Día'];
          const tableData = items.map((item, idx) => [
            (idx + 1).toString(),
            item.data?.aspecto_evaluar || '-',
            item.data?.responsable || '-',
            item.data?.cumple || '-',
            item.data?.procedimiento || '-',
            item.data?.verificado || '-',
            item.data?.dia || '-'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: tableData,
            styles: { fontSize: 7, cellPadding: 2 },
            headStyles: { fillColor: [255, 107, 53], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 8, halign: 'center' },
              1: { cellWidth: 60 },
              3: { cellWidth: 18, halign: 'center' }
            }
          });
        }
        // Caso especial: Hornos
        else if (formatType === 'SGI-FT-01') {
          const headers = ['N°', 'Día', 'Jornada', 'Horno 1 (°C)', 'Horno 2 (°C)', 'Responsable'];
          const tableData = items.map((item, idx) => [
            (idx + 1).toString(),
            item.data?.dia || '-',
            item.data?.jornada || '-',
            item.data?.horno_1 || '-',
            item.data?.horno_2 || '-',
            item.data?.responsable || '-'
          ]);

          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: tableData,
            styles: { fontSize: 8, cellPadding: 3 },
            headStyles: { fillColor: [255, 107, 53], textColor: 255, fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              2: { cellWidth: 20, halign: 'center' },
              3: { cellWidth: 30, halign: 'center' },
              4: { cellWidth: 30, halign: 'center' }
            }
          });
        }

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

      const fileName = this.generateFileName('Reporte', 'pdf', filters);
      doc.save(fileName);

      return { success: true, count: data.length };

    } catch (error) {
      console.error('Error exportando a PDF:', error);
      return { success: false, error };
    }
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
}