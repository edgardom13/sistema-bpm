import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ConfigService } from './config.service';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ExportService {
  
  private logoBase64: string | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService
  ) {}

  getSupabase() {
    return this.supabaseService.getSupabase();
  }

  async getFilteredData(filters: any) {
    let query = this.getSupabase()
      .from('checklists')
      .select('*')
      .eq('plant_id', '00000000-0000-0000-0000-000000000001');

    if (filters.startDate && filters.endDate) {
      query = query.gte('data->>dia', filters.startDate).lte('data->>dia', filters.endDate);
    } else if (filters.startDate) {
      query = query.gte('data->>dia', filters.startDate);
    } else if (filters.endDate) {
      query = query.lte('data->>dia', filters.endDate);
    }

    if (filters.formatType) {
      query = query.eq('format_type', filters.formatType);
    }

    const { data, error } = await query.order('data->>dia', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async exportToExcel(filters: any) {
    try {
      const data = await this.getFilteredData(filters);
      if (data.length === 0) return { success: false, error: 'No hay datos para exportar' };

      await this.loadLogoFromConfig();

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('TEMPERATURA HORNOS');

      // ✅ DIMENSIONES EXACTAS SEGÚN LA IMAGEN
      worksheet.columns = [
        { key: 'item', width: 10 },        // Columna A: Item
        { key: 'fecha', width: 25 },       // Columna B: Fecha  
        { key: 'jornada', width: 15 },     // Columna C: Jornada
        { key: 'h1', width: 18 },          // Columna D: H1
        { key: 'h2', width: 18 },          // Columna E: H2
        { key: 'responsable', width: 30 }  // Columna F: Responsable
      ];

      // ==================== HEADER (Filas 1-4) ====================
      
      // Logo en A1:A4
      if (this.logoBase64) {
        try {
          const imageId = workbook.addImage({
            base64: this.logoBase64,
            extension: 'png',
          });
          worksheet.addImage(imageId, {
            tl: { col: 0.3, row: 0.3 },
            ext: { width: 130, height: 95 }
          });
        } catch (error) {
          console.warn('Error agregando logo:', error);
        }
      }

      // Título principal - Merge C1:E3 (3 filas, 3 columnas)
      worksheet.mergeCells('C1:E3');
      const titleCell = worksheet.getCell('C1');
      titleCell.value = 'FORMATO DE CONTROL DE TEMPERATURA\nHORNOS DE COCCION';
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      // Sin bordes verdes, solo celda blanca

      // Metadata en columna F (F1:F4)
      const metadata = [
        { label: 'CODIGO:', value: 'SGI-FT-01' },
        { label: 'VERSION:', value: '01' },
        { label: 'FECHA:', value: new Date().toLocaleDateString('es-ES') },
        { label: 'PAGINA:', value: '1 DE 1' }
      ];

      metadata.forEach((meta, index) => {
        const currentRow = index + 1;
        worksheet.getCell(`F${currentRow}`).value = `${meta.label} ${meta.value}`;
        worksheet.getCell(`F${currentRow}`).font = { bold: true, size: 10 };
        worksheet.getCell(`F${currentRow}`).alignment = { horizontal: 'left' };
        worksheet.getCell(`F${currentRow}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // ==================== INFORMACIÓN (Filas 5-6) ====================
      
      // Fila 5: ESTABLECIMIENTO y PLANTA DE PRODUCCION
      worksheet.mergeCells('A5:B5');
      worksheet.getCell('A5').value = 'ESTABLECIMIENTO';
      worksheet.getCell('A5').font = { bold: true, size: 11 };
      worksheet.getCell('A5').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      worksheet.mergeCells('C5:F5');
      worksheet.getCell('C5').value = 'PLANTA DE PRODUCCION';
      worksheet.getCell('C5').font = { bold: true, size: 11 };
      worksheet.getCell('C5').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Fila 6: MES y valor del mes
      worksheet.mergeCells('A6:B6');
      worksheet.getCell('A6').value = 'MES';
      worksheet.getCell('A6').font = { bold: true, size: 11 };
      worksheet.getCell('A6').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      worksheet.mergeCells('C6:F6');
      const monthName = this.getMonthName(filters.startDate || new Date().toISOString());
      worksheet.getCell('C6').value = monthName;
      worksheet.getCell('C6').font = { bold: true, size: 11 };
      worksheet.getCell('C6').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // ==================== TABLA ====================
      
      // Fila 7: Encabezados principales
      const headerRow = 7;
      
      // Item (A7)
      worksheet.getCell('A7').value = 'Item';
      worksheet.getCell('A7').font = { bold: true, size: 11 };
      worksheet.getCell('A7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('A7').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('A7').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('A7').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Fecha (B7)
      worksheet.getCell('B7').value = 'Fecha';
      worksheet.getCell('B7').font = { bold: true, size: 11 };
      worksheet.getCell('B7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('B7').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('B7').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('B7').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Jornada (C7)
      worksheet.getCell('C7').value = 'Jornada';
      worksheet.getCell('C7').font = { bold: true, size: 11 };
      worksheet.getCell('C7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('C7').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('C7').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('C7').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // TEMPERATURA °C - Merge D7:E7
      worksheet.mergeCells('D7:E7');
      worksheet.getCell('D7').value = 'TEMPERATURA °C';
      worksheet.getCell('D7').font = { bold: true, size: 11 };
      worksheet.getCell('D7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('D7').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('D7').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('D7').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // RESPONSABLE (F7)
      worksheet.getCell('F7').value = 'RESPONSABLE';
      worksheet.getCell('F7').font = { bold: true, size: 11 };
      worksheet.getCell('F7').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('F7').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('F7').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('F7').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Fila 8: Sub-encabezados H1 y H2
      worksheet.getCell('D8').value = 'H1';
      worksheet.getCell('D8').font = { bold: true, size: 11 };
      worksheet.getCell('D8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('D8').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('D8').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('D8').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      worksheet.getCell('E8').value = 'H2';
      worksheet.getCell('E8').font = { bold: true, size: 11 };
      worksheet.getCell('E8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
      worksheet.getCell('E8').font.color = { argb: 'FFFFFFFF' };
      worksheet.getCell('E8').alignment = { horizontal: 'center', vertical: 'middle' };
      worksheet.getCell('E8').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Celdas A8, B8, C8, F8 (vacías pero con fondo naranja)
      ['A8', 'B8', 'C8', 'F8'].forEach(cellAddress => {
        worksheet.getCell(cellAddress).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF8000' } };
        worksheet.getCell(cellAddress).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // ==================== DATOS (Fila 9 en adelante) ====================
      let row = 9;
      let itemNumber = 1;
      
      for (const record of data) {
        const d = record.data || {};
        
        // Item
        worksheet.getCell(`A${row}`).value = itemNumber++;
        worksheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`A${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Fecha
        worksheet.getCell(`B${row}`).value = d.dia || '';
        worksheet.getCell(`B${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Jornada
        worksheet.getCell(`C${row}`).value = d.jornada || '';
        worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`C${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // H1
        worksheet.getCell(`D${row}`).value = d.horno_1 !== null && d.horno_1 !== undefined ? d.horno_1 : '';
        worksheet.getCell(`D${row}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`D${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // H2
        worksheet.getCell(`E${row}`).value = d.horno_2 !== null && d.horno_2 !== undefined ? d.horno_2 : '';
        worksheet.getCell(`E${row}`).alignment = { horizontal: 'center' };
        worksheet.getCell(`E${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Responsable
        worksheet.getCell(`F${row}`).value = d.responsable || '';
        worksheet.getCell(`F${row}`).border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        row++;
      }

      // Filas vacías hasta completar (aproximadamente 30 filas totales)
      while (row <= 35) {
        ['A', 'B', 'C', 'D', 'E', 'F'].forEach(col => {
          worksheet.getCell(`${col}${row}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        row++;
      }

      // ==================== FOOTER ====================
      
      // Observaciones (merge A36:F39 - 4 filas de alto)
      worksheet.mergeCells('A36:F39');
      const obsCell = worksheet.getCell('A36');
      obsCell.value = 'OBSERVACIONES:';
      obsCell.font = { bold: true, size: 11 };
      obsCell.alignment = { horizontal: 'left', vertical: 'top' };
      obsCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // JEFE DE CONTROL DE CALIDAD (merge A40:F41 - 2 filas)
      worksheet.mergeCells('A40:F41');
      const firmaCell = worksheet.getCell('A40');
      firmaCell.value = 'JEFE DE CONTROL DE CALIDAD';
      firmaCell.font = { bold: true, size: 11 };
      firmaCell.alignment = { horizontal: 'left', vertical: 'middle' };
      firmaCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Guardar archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const fileName = `Control_Temperatura_Hornos_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(blob, fileName);

      return { success: true, count: data.length };
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      return { success: false, error };
    }
  }

  private async loadLogoFromConfig(): Promise<void> {
    try {
      const config = this.configService.getConfig();
      const logoUrl = config.brandLogo;

      if (!logoUrl) {
        this.logoBase64 = null;
        return;
      }

      const response = await fetch(logoUrl);
      const blob = await response.blob();
      
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          this.logoBase64 = reader.result as string;
          resolve();
        };
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Error cargando logo:', error);
      this.logoBase64 = null;
    }
  }

  private getMonthName(dateStr: string): string {
    if (!dateStr) return 'MAYO';
    const months = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
    const date = new Date(dateStr + 'T00:00:00');
    return months[date.getMonth()];
  }

  async exportToPDF(filters: any) {
    try {
      const data = await this.getFilteredData(filters);
      if (data.length === 0) return { success: false, error: 'No hay datos para exportar' };

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      let yPos = 15;

      // Header
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('FORMATO DE CONTROL DE TEMPERATURA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
      pdf.text('HORNOS DE COCCION', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      // Metadata
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`CODIGO: SGI-FT-01`, pageWidth - 60, 15);
      pdf.text(`FECHA: ${new Date().toLocaleDateString('es-ES')}`, pageWidth - 60, 20);
      
      // Tabla
      const tableData = data.map((record: any, index: number) => {
        const d = record.data || {};
        return [
          index + 1,
          d.dia || '',
          d.jornada || '',
          d.horno_1 !== null && d.horno_1 !== undefined ? d.horno_1 : '',
          d.horno_2 !== null && d.horno_2 !== undefined ? d.horno_2 : '',
          d.responsable || ''
        ];
      });

      autoTable(pdf, {
        startY: yPos,
        head: [['Item', 'Fecha', 'Jornada', 'H1', 'H2', 'Responsable']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [255, 128, 0], textColor: 255, fontStyle: 'bold', halign: 'center' },
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 30 },
          2: { cellWidth: 20 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 40 }
        }
      });

      const fileName = `Control_Temperatura_Hornos_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);

      return { success: true, count: data.length };
    } catch (error) {
      console.error('Error exportando a PDF:', error);
      return { success: false, error };
    }
  }
}