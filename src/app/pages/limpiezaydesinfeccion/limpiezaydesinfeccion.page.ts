import { Component, OnInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ChecklistItem {
  id: number;
  recurso: string;
  area: string;
  icono: string;
  tipo: string;
  conc: number;
  sustancia: string;
  aprobado: boolean;
  observaciones: string;
  evaluado: boolean;
  fechaEvaluacion?: string;
  evaluador?: string;
}

interface RegistroItem {
  itemId: number;
  recurso: string;
  area: string;
  tipo: string;
  conc: number;
  sustancia: string;
  aprobado: boolean;
  observaciones: string;
  fechaEvaluacion: string;
  fechaEvaluacionFormateada: string;
  evaluador: string;
}

interface RegistroDiario {
  id: string;
  fecha: string;
  fechaFormateada: string;
  mes: string;
  anio: number;
  supervisor: string;
  formato: string;
  itemsEvaluados: RegistroItem[];
  observacionesGenerales: string;
  totalEvaluados: number;
  totalAprobados: number;
  totalRechazados: number;
  porcentajeCumplimiento: number;
  estado: 'pendiente' | 'completado' | 'parcial';
  fechaRegistro: string;
}

@Component({
  selector: 'app-limpiezaydesinfeccion',
  templateUrl: './limpiezaydesinfeccion.page.html',
  styleUrls: ['./limpiezaydesinfeccion.page.scss'],
  standalone: false
})
export class LimpiezaydesinfeccionPage implements OnInit {
  
  isModalOpen = false;
  isEvaluacionModalOpen = false;
  itemEvaluacion: any = null;
  observacionesGenerales = '';
  supervisorActual = 'Musharof - Supervisor CC';
  
  fechaActual: Date = new Date();
  fechaFormateada: string = '';
  mesActual: string = '';
  anioActual: number = 0;
  hayRegistroHoy = false;
  
  // Variables para exportación por rango de fechas
  fechaInicio: string = '';
  fechaFin: string = '';
  registrosFiltrados: RegistroDiario[] = [];
  estadisticasRango = {
    totalRegistros: 0,
    totalEvaluaciones: 0,
    promedioCumplimiento: 0,
    totalAprobados: 0,
    totalRechazados: 0
  };
  
  sustanciasDisponibles = [
    'Hipoclorito de Sodio',
    'Amonio Cuaternario',
    'Peróxido de Hidrógeno',
    'Ácido Peracético',
    'Yodóforos',
    'Alcohol 70%',
    'Detergente Alcalino',
    'Detergente Ácido'
  ];

  checklistItems: ChecklistItem[] = [
    { id: 1, recurso: 'Manos del personal manipulador', area: 'Higiene del Personal', icono: '', tipo: 'L', conc: 75, sustancia: 'Alcohol 70%', aprobado: true, observaciones: '', evaluado: false },
    { id: 2, recurso: 'Calzado del personal manipulador', area: 'Higiene del Personal', icono: '👟', tipo: 'L y D', conc: 80, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 3, recurso: 'Cuarto de crecimiento', area: 'Cuarto de Crecimiento', icono: '', tipo: 'L y D', conc: 70, sustancia: 'Amonio Cuaternario', aprobado: true, observaciones: '', evaluado: false },
    { id: 4, recurso: 'Cuarto de crecimiento', area: 'Cuarto de Crecimiento', icono: '', tipo: 'L y D', conc: 70, sustancia: 'Amonio Cuaternario', aprobado: true, observaciones: '', evaluado: false },
    { id: 5, recurso: 'Cuarto de Crecimiento', area: 'Cuarto de Crecimiento', icono: '', tipo: 'L y D', conc: 70, sustancia: 'Amonio Cuaternario', aprobado: true, observaciones: '', evaluado: false },
    { id: 6, recurso: 'Area de produccion y Empaque', area: 'Producción', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 7, recurso: 'Area de produccion y Empaque', area: 'Producción', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 8, recurso: 'Area de produccion y Empaque', area: 'Producción', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 9, recurso: 'Hornos', area: 'Producción', icono: '', tipo: 'L', conc: 85, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 10, recurso: 'Hornos', area: 'Producción', icono: '', tipo: 'L', conc: 85, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 11, recurso: 'Hornos', area: 'Producción', icono: '', tipo: 'L', conc: 85, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 12, recurso: 'Techos, puertas, paredes y Ventanas', area: 'Infraestructura', icono: '', tipo: 'L', conc: 70, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 13, recurso: 'Techos, puertas, paredes y Ventanas', area: 'Infraestructura', icono: '', tipo: 'L', conc: 70, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 14, recurso: 'Techos, puertas, paredes y Ventanas', area: 'Infraestructura', icono: '', tipo: 'L', conc: 70, sustancia: 'Detergente Alcalino', aprobado: true, observaciones: '', evaluado: false },
    { id: 15, recurso: 'Area de cargue vehiculos', area: 'Logística', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 16, recurso: 'Area de cargue vehiculos', area: 'Logística', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 17, recurso: 'Equipos y Utensilios', area: 'Producción', icono: '', tipo: 'L y D', conc: 80, sustancia: 'Peróxido de Hidrógeno', aprobado: true, observaciones: '', evaluado: false },
    { id: 18, recurso: 'Equipos y Utensilios', area: 'Producción', icono: '', tipo: 'L y D', conc: 80, sustancia: 'Peróxido de Hidrógeno', aprobado: true, observaciones: '', evaluado: false },
    { id: 19, recurso: 'Equipos y Utensilios', area: 'Producción', icono: '', tipo: 'L y D', conc: 80, sustancia: 'Peróxido de Hidrógeno', aprobado: true, observaciones: '', evaluado: false },
    { id: 20, recurso: 'Canastillas Plasticas', area: 'Almacenamiento', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 21, recurso: 'Canastillas Plasticas', area: 'Almacenamiento', icono: '', tipo: 'L y D', conc: 75, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 22, recurso: 'Bandejas', area: 'Producción', icono: '', tipo: 'L y D', conc: 80, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 23, recurso: 'Bandejas', area: 'Producción', icono: '', tipo: 'L y D', conc: 80, sustancia: 'Hipoclorito de Sodio', aprobado: true, observaciones: '', evaluado: false },
    { id: 24, recurso: 'Baños', area: 'Servicios Sanitarios', icono: '', tipo: 'L y D', conc: 85, sustancia: 'Ácido Peracético', aprobado: true, observaciones: '', evaluado: false },
    { id: 25, recurso: 'Baños', area: 'Servicios Sanitarios', icono: '', tipo: 'L y D', conc: 85, sustancia: 'Ácido Peracético', aprobado: true, observaciones: '', evaluado: false }
  ];

  evaluacionesGuardadas: RegistroItem[] = [];
  registrosGuardados: RegistroDiario[] = [];

  constructor() {}

  ngOnInit() {
    this.inicializarFecha();
    this.cargarDatosLocales();
    this.verificarRegistroHoy();
    this.establecerRangoPorDefecto();
  }

  inicializarFecha() {
    this.fechaActual = new Date();
    this.fechaFormateada = this.formatearFecha(this.fechaActual);
    this.mesActual = this.obtenerMes(this.fechaActual);
    this.anioActual = this.fechaActual.getFullYear();
  }

  formatearFecha(fecha: Date): string {
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diaSemana = dias[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${diaSemana}, ${dia} de ${mes} de ${anio}`;
  }

  obtenerMes(fecha: Date): string {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[fecha.getMonth()];
  }

  formatearFechaHora(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${dia}/${mes}/${anio} ${horas}:${minutos}:${segundos}`;
  }

  formatearFechaInput(fecha: Date): string {
    const anio = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  formatearFechaLegible(fechaInput: string): string {
    const fecha = new Date(fechaInput + 'T00:00:00');
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const diaSemana = dias[fecha.getDay()];
    const dia = fecha.getDate();
    const mes = meses[fecha.getMonth()];
    const anio = fecha.getFullYear();
    return `${dia} de ${mes} de ${anio}`;
  }

  establecerRangoPorDefecto() {
    const hoy = new Date();
    const hace30Dias = new Date();
    hace30Dias.setDate(hoy.getDate() - 30);
    
    this.fechaFin = this.formatearFechaInput(hoy);
    this.fechaInicio = this.formatearFechaInput(hace30Dias);
    
    this.filtrarRegistros();
  }

  filtrarRegistros() {
    if (!this.fechaInicio || !this.fechaFin) {
      this.registrosFiltrados = this.registrosGuardados;
    } else {
      const inicio = new Date(this.fechaInicio);
      const fin = new Date(this.fechaFin);
      fin.setHours(23, 59, 59, 999);

      this.registrosFiltrados = this.registrosGuardados.filter(registro => {
        const fechaRegistro = new Date(registro.fechaRegistro);
        return fechaRegistro >= inicio && fechaRegistro <= fin;
      });
    }

    this.calcularEstadisticas();
  }

  calcularEstadisticas() {
    const totalRegistros = this.registrosFiltrados.length;
    const totalEvaluaciones = this.registrosFiltrados.reduce((acc, reg) => acc + reg.itemsEvaluados.length, 0);
    const totalAprobados = this.registrosFiltrados.reduce((acc, reg) => acc + reg.totalAprobados, 0);
    const totalRechazados = this.registrosFiltrados.reduce((acc, reg) => acc + reg.totalRechazados, 0);
    
    const promedioCumplimiento = totalRegistros > 0
      ? Math.round(this.registrosFiltrados.reduce((acc, reg) => acc + reg.porcentajeCumplimiento, 0) / totalRegistros)
      : 0;

    this.estadisticasRango = {
      totalRegistros,
      totalEvaluaciones,
      promedioCumplimiento,
      totalAprobados,
      totalRechazados
    };
  }

  verificarRegistroHoy() {
    const hoy = new Date().toDateString();
    this.hayRegistroHoy = this.registrosGuardados.some(registro => {
      const fechaRegistro = new Date(registro.fechaRegistro).toDateString();
      return fechaRegistro === hoy;
    });
  }

  abrirModalRegistro() {
    this.inicializarFecha();
    this.isModalOpen = true;
    this.observacionesGenerales = '';
    document.body.style.overflow = 'hidden';
  }

  cerrarModal() {
    this.isModalOpen = false;
    document.body.style.overflow = '';
  }

  abrirEvaluacion(item: ChecklistItem) {
    this.itemEvaluacion = JSON.parse(JSON.stringify(item));
    this.isEvaluacionModalOpen = true;
  }

  cerrarEvaluacionModal() {
    this.isEvaluacionModalOpen = false;
    this.itemEvaluacion = null;
  }

  validarEvaluacion(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    if (!this.itemEvaluacion) {
      errores.push('No hay item seleccionado');
    } else {
      if (!this.itemEvaluacion.tipo) errores.push('Debe seleccionar el tipo de acción BPM');
      if (this.itemEvaluacion.conc < 0 || this.itemEvaluacion.conc > 100) errores.push('La concentración debe estar entre 0% y 100%');
      if (!this.itemEvaluacion.sustancia) errores.push('Debe seleccionar una sustancia química');
    }
    return { valido: errores.length === 0, errores };
  }

  validarRegistroDiario(): { valido: boolean; errores: string[] } {
    const errores: string[] = [];
    const itemsNoEvaluados = this.checklistItems.filter(item => !item.evaluado);
    if (itemsNoEvaluados.length > 0) {
      errores.push(`Hay ${itemsNoEvaluados.length} aspecto(s) sin evaluar`);
    }
    return { valido: errores.length === 0, errores };
  }

  guardarEvaluacion() {
    const validacion = this.validarEvaluacion();
    if (!validacion.valido) {
      this.mostrarError('Validación fallida', validacion.errores);
      return;
    }
    if (!this.itemEvaluacion) return;

    const index = this.checklistItems.findIndex(item => item.id === this.itemEvaluacion.id);
    const ahora = new Date();

    if (index !== -1) {
      this.checklistItems[index] = {
        ...this.itemEvaluacion,
        evaluado: true,
        fechaEvaluacion: ahora.toISOString(),
        evaluador: this.supervisorActual
      };

      const registroItem: RegistroItem = {
        itemId: this.itemEvaluacion.id,
        recurso: this.itemEvaluacion.recurso,
        area: this.itemEvaluacion.area,
        tipo: this.itemEvaluacion.tipo,
        conc: this.itemEvaluacion.conc,
        sustancia: this.itemEvaluacion.sustancia,
        aprobado: this.itemEvaluacion.aprobado,
        observaciones: this.itemEvaluacion.observaciones || '',
        fechaEvaluacion: ahora.toISOString(),
        fechaEvaluacionFormateada: this.formatearFechaHora(ahora),
        evaluador: this.supervisorActual
      };

      const evaluacionExistente = this.evaluacionesGuardadas.findIndex(ev => ev.itemId === registroItem.itemId);
      if (evaluacionExistente !== -1) {
        this.evaluacionesGuardadas[evaluacionExistente] = registroItem;
      } else {
        this.evaluacionesGuardadas.push(registroItem);
      }

      this.guardarEvaluacionesEnLocalStorage();
      console.log('✅ Evaluación guardada:', registroItem);
      this.mostrarExito('Evaluación guardada', `${this.itemEvaluacion.recurso} - ${this.formatearFechaHora(ahora)}`);
    }
    this.cerrarEvaluacionModal();
  }

  guardarRegistroDiario() {
    const validacion = this.validarRegistroDiario();
    if (!validacion.valido) {
      this.mostrarError('No se puede guardar', validacion.errores);
      return;
    }

    const ahora = new Date();
    const totalEvaluados = this.evaluacionesGuardadas.length;
    const totalAprobados = this.evaluacionesGuardadas.filter(e => e.aprobado).length;
    const totalRechazados = this.evaluacionesGuardadas.filter(e => !e.aprobado).length;
    const porcentajeCumplimiento = totalEvaluados > 0 ? Math.round((totalAprobados / totalEvaluados) * 100) : 0;

    let estado: 'pendiente' | 'completado' | 'parcial' = 'pendiente';
    if (totalEvaluados === this.checklistItems.length) estado = 'completado';
    else if (totalEvaluados > 0) estado = 'parcial';

    const registro: RegistroDiario = {
      id: this.generarId(),
      fecha: ahora.toISOString(),
      fechaFormateada: this.formatearFecha(ahora),
      mes: this.obtenerMes(ahora),
      anio: ahora.getFullYear(),
      supervisor: this.supervisorActual,
      formato: 'SGI-LD-02',
      itemsEvaluados: JSON.parse(JSON.stringify(this.evaluacionesGuardadas)),
      observacionesGenerales: this.observacionesGenerales,
      totalEvaluados,
      totalAprobados,
      totalRechazados,
      porcentajeCumplimiento,
      estado,
      fechaRegistro: ahora.toISOString()
    };

    this.registrosGuardados.push(registro);
    this.guardarRegistroEnLocalStorage(registro);
    this.verificarRegistroHoy();
    this.filtrarRegistros();

    console.log('📋 Registro diario guardado:', registro);
    this.mostrarExito('Registro guardado', `Fecha: ${this.formatearFecha(ahora)} | ${totalEvaluados} items | ${porcentajeCumplimiento}%`);

    this.resetearFormulario();
    this.cerrarModal();
  }

  // ✅ EXPORTAR PDF POR RANGO DE FECHAS
  exportarPDF() {
    if (this.registrosFiltrados.length === 0) {
      this.mostrarError('Sin datos', 'No hay registros en el rango de fechas seleccionado');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Título principal
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REGISTRO DE INSPECCIONES - CONTROL DE CALIDAD', pageWidth / 2, 15, { align: 'center' });

    // Rango de fechas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${this.formatearFechaLegible(this.fechaInicio)} al ${this.formatearFechaLegible(this.fechaFin)}`, pageWidth / 2, 22, { align: 'center' });

    // Estadísticas
    doc.setFontSize(9);
    doc.text(`Total Registros: ${this.estadisticasRango.totalRegistros} | Total Evaluaciones: ${this.estadisticasRango.totalEvaluaciones} | Promedio Cumplimiento: ${this.estadisticasRango.promedioCumplimiento}%`, pageWidth / 2, 28, { align: 'center' });

    // Tabla resumen por día
    const head = [['Fecha', 'Supervisor', 'Items Evaluados', 'Aprobados', 'Rechazados', '% Cumplimiento', 'Estado']];
    
    const body = this.registrosFiltrados.map(registro => [
      registro.fechaFormateada,
      registro.supervisor,
      registro.totalEvaluados.toString(),
      registro.totalAprobados.toString(),
      registro.totalRechazados.toString(),
      registro.porcentajeCumplimiento + '%',
      registro.estado.toUpperCase()
    ]);

    autoTable(doc, {
      startY: 35,
      head: head,
      body: body,
      theme: 'grid',
      headStyles: {
        fillColor: [28, 36, 52],
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      margin: { left: 10, right: 10 }
    });

    // Detalle de cada registro (una página por registro)
    this.registrosFiltrados.forEach((registro, index) => {
      doc.addPage();
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Registro #${index + 1} - ${registro.fechaFormateada}`, pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(`Supervisor: ${registro.supervisor} | Formato: ${registro.formato}`, pageWidth / 2, 22, { align: 'center' });

      // Tabla de items evaluados
      const itemHead = [['Recurso', 'Área', 'Tipo', 'Conc.', 'Sustancia', 'Estado', 'Observaciones']];
      
      const itemBody = registro.itemsEvaluados.map(item => [
        item.recurso,
        item.area,
        item.tipo,
        item.conc + '%',
        item.sustancia,
        item.aprobado ? 'APROBADO' : 'RECHAZADO',
        item.observaciones || '-'
      ]);

      autoTable(doc, {
        startY: 30,
        head: itemHead,
        body: itemBody,
        theme: 'grid',
        headStyles: {
          fillColor: [28, 36, 52],
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold'
        },
        bodyStyles: {
          fontSize: 7
        },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 35 },
          5: { cellWidth: 20, halign: 'center' },
          6: { cellWidth: 45 }
        },
        margin: { left: 10, right: 10 }
      });

      // Observaciones generales
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Observaciones Generales:', 10, finalY);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const obsText = registro.observacionesGenerales || 'Sin observaciones';
      const splitObs = doc.splitTextToSize(obsText, pageWidth - 20);
      doc.text(splitObs, 10, finalY + 5);
    });

    const fileName = `Registros_BPM_${this.fechaInicio}_al_${this.fechaFin}.pdf`;
    doc.save(fileName);
    
    this.mostrarExito('PDF exportado', `${this.registrosFiltrados.length} registros exportados`);
  }

  // ✅ EXPORTAR EXCEL POR RANGO DE FECHAS
  exportarExcel() {
    if (this.registrosFiltrados.length === 0) {
      this.mostrarError('Sin datos', 'No hay registros en el rango de fechas seleccionado');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen
    const resumenData: any[] = [];
    resumenData.push(['REGISTRO DE INSPECCIONES - CONTROL DE CALIDAD']);
    resumenData.push([]);
    resumenData.push(['Período:', `${this.formatearFechaLegible(this.fechaInicio)} al ${this.formatearFechaLegible(this.fechaFin)}`]);
    resumenData.push([]);
    resumenData.push(['Total Registros:', this.estadisticasRango.totalRegistros]);
    resumenData.push(['Total Evaluaciones:', this.estadisticasRango.totalEvaluaciones]);
    resumenData.push(['Promedio Cumplimiento:', this.estadisticasRango.promedioCumplimiento + '%']);
    resumenData.push(['Total Aprobados:', this.estadisticasRango.totalAprobados]);
    resumenData.push(['Total Rechazados:', this.estadisticasRango.totalRechazados]);
    resumenData.push([]);
    resumenData.push(['RESUMEN POR DÍA']);
    resumenData.push(['Fecha', 'Supervisor', 'Items Evaluados', 'Aprobados', 'Rechazados', '% Cumplimiento', 'Estado']);

    this.registrosFiltrados.forEach(registro => {
      resumenData.push([
        registro.fechaFormateada,
        registro.supervisor,
        registro.totalEvaluados,
        registro.totalAprobados,
        registro.totalRechazados,
        registro.porcentajeCumplimiento + '%',
        registro.estado.toUpperCase()
      ]);
    });

    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [
      { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Hoja 2: Detalle de cada registro
    this.registrosFiltrados.forEach((registro, index) => {
      const detalleData: any[] = [];
      detalleData.push([`Registro #${index + 1} - ${registro.fechaFormateada}`]);
      detalleData.push(['Supervisor:', registro.supervisor, 'Formato:', registro.formato]);
      detalleData.push([]);
      detalleData.push(['Recurso', 'Área', 'Tipo', 'Concentración', 'Sustancia', 'Estado', 'Observaciones', 'Fecha Evaluación', 'Evaluador']);

      registro.itemsEvaluados.forEach(item => {
        detalleData.push([
          item.recurso,
          item.area,
          item.tipo,
          item.conc + '%',
          item.sustancia,
          item.aprobado ? 'APROBADO' : 'RECHAZADO',
          item.observaciones || '-',
          item.fechaEvaluacionFormateada,
          item.evaluador
        ]);
      });

      detalleData.push([]);
      detalleData.push(['Observaciones Generales:']);
      detalleData.push([registro.observacionesGenerales || 'Sin observaciones']);

      const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
      wsDetalle['!cols'] = [
        { wch: 35 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 25 }, 
        { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, wsDetalle, `Registro ${index + 1}`);
    });

    const fileName = `Registros_BPM_${this.fechaInicio}_al_${this.fechaFin}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    this.mostrarExito('Excel exportado', `${this.registrosFiltrados.length} registros exportados`);
  }

  private formatearFechaCorta(fecha: Date): string {
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  private generarId(): string {
    return 'REG-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  private guardarEvaluacionesEnLocalStorage() {
    try {
      localStorage.setItem('evaluacionesBPM', JSON.stringify(this.evaluacionesGuardadas));
    } catch (error) {
      console.error('Error al guardar evaluaciones:', error);
    }
  }

  private guardarRegistroEnLocalStorage(registro: RegistroDiario) {
    try {
      const registros = JSON.parse(localStorage.getItem('registrosBPM') || '[]');
      registros.push(registro);
      localStorage.setItem('registrosBPM', JSON.stringify(registros));
    } catch (error) {
      console.error('Error al guardar registro:', error);
    }
  }

  private cargarDatosLocales() {
    try {
      const evaluaciones = JSON.parse(localStorage.getItem('evaluacionesBPM') || '[]');
      this.evaluacionesGuardadas = evaluaciones;
      const registros = JSON.parse(localStorage.getItem('registrosBPM') || '[]');
      this.registrosGuardados = registros;
      console.log('📂 Datos cargados:', { evaluaciones: evaluaciones.length, registros: registros.length });
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }

  private resetearFormulario() {
    this.checklistItems.forEach(item => {
      item.evaluado = false;
      item.fechaEvaluacion = undefined;
      item.evaluador = undefined;
    });
    this.evaluacionesGuardadas = [];
    this.observacionesGenerales = '';
    this.guardarEvaluacionesEnLocalStorage();
  }

  private mostrarExito(titulo: string, mensaje: string) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[99999] bg-emerald-500 text-white px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-top duration-300';
    toast.innerHTML = `<div class="font-bold text-sm">${titulo}</div><div class="text-xs mt-1 opacity-90">${mensaje}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private mostrarError(titulo: string, errores: string | string[]) {
    const listaErrores = Array.isArray(errores) ? errores : [errores];
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 z-[99999] bg-rose-500 text-white px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-top duration-300';
    toast.innerHTML = `<div class="font-bold text-sm">${titulo}</div><div class="text-xs mt-1 opacity-90">${listaErrores.join(', ')}</div>`;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
}