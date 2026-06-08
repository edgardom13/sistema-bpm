import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-formulario-dinamico',
  templateUrl: './formulario-dinamico.page.html',
  styleUrls: ['./formulario-dinamico.page.scss'],
  standalone: false
})
export class FormularioDinamicoPage implements OnInit {
  formatType: string = '';
  selectedDate: string = '';
  checklistData: any = null;
  loading = true;
  isEditing = false;

  // Configuración de cada formato
formatConfigs: { [key: string]: any } = {
  'limpiezaydesinfeccion': {
    title: 'Limpieza y Desinfección',
    icon: '🛡️',
    formatCode: 'SGI-FLD-02',
    fields: [
      { key: 'area', label: 'Área a limpiar', type: 'text' },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'sustancia', label: 'Sustancia utilizada', type: 'select', options: ['Hipoclorito de Sodio', 'Amonio Cuaternario', 'Peróxido de Hidrógeno', 'Ácido Peracético', 'Alcohol 70%', 'Detergente Alcalino'] },
      { key: 'concentracion', label: 'Concentración (%)', type: 'number', unit: '%' },
      { key: 'hora_inicio', label: 'Hora inicio', type: 'text' },
      { key: 'hora_fin', label: 'Hora fin', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ],
  },
  'verificacion': {
    title: 'Verificación de Limpieza',
    icon: '📋',
    formatCode: 'SGI-FVL-06',
    fields: [
      { key: 'area_inspeccionada', label: 'Área inspeccionada', type: 'text' },
      { key: 'inspector', label: 'Inspector', type: 'text' },
      { key: 'resultado', label: 'Resultado', type: 'select', options: ['Aprobado', 'Rechazado', 'Requiere corrección'] },
      { key: 'metodo_verificacion', label: 'Método de verificación', type: 'select', options: ['Visual', 'ATP', 'Hisopado', 'Organoléptico'] },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'hornos': {
    title: 'Temperatura de Hornos',
    icon: '🔥',
    formatCode: 'SGI-FT-01',
    fields: [
      { key: 'horno_1', label: 'Horno 1 - Temperatura', type: 'number', unit: '°C' },
      { key: 'horno_2', label: 'Horno 2 - Temperatura', type: 'number', unit: '°C' },
      { key: 'horno_3', label: 'Horno 3 - Temperatura', type: 'number', unit: '°C' },
      { key: 'tiempo_coccion', label: 'Tiempo de cocción', type: 'number', unit: 'min' },
      { key: 'operador', label: 'Operador responsable', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'higienicas': {
    title: 'Prácticas Higiénicas',
    icon: '✨',
    formatCode: 'SGI-FPH-03',
    fields: [
      { key: 'area', label: 'Área evaluada', type: 'text' },
      { key: 'uniforme_completo', label: 'Uniforme completo', type: 'select', options: ['Sí', 'No', 'Parcial'] },
      { key: 'lavado_manos', label: 'Lavado de manos correcto', type: 'select', options: ['Sí', 'No'] },
      { key: 'uso_cofia', label: 'Uso de cofia', type: 'select', options: ['Sí', 'No'] },
      { key: 'uso_cubrebocas', label: 'Uso de cubrebocas', type: 'select', options: ['Sí', 'No'] },
      { key: 'calzado_adecuado', label: 'Calzado adecuado', type: 'select', options: ['Sí', 'No'] },
      { key: 'uñas_cortas_limpias', label: 'Uñas cortas y limpias', type: 'select', options: ['Sí', 'No'] },
      { key: 'sin_joyas', label: 'Sin joyas ni accesorios', type: 'select', options: ['Sí', 'No'] },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'residuos': {
    title: 'Inspección de Residuos',
    icon: '🗑️',
    formatCode: 'SGI-FIR-04',
    fields: [
      { key: 'area', label: 'Área inspeccionada', type: 'text' },
      { key: 'tipo_residuo', label: 'Tipo de residuo', type: 'select', options: ['Orgánico', 'Inorgánico', 'Peligroso', 'Reciclable'] },
      { key: 'contenedores_adecuados', label: 'Contenedores adecuados', type: 'select', options: ['Sí', 'No'] },
      { key: 'senalizacion', label: 'Señalización correcta', type: 'select', options: ['Sí', 'No'] },
      { key: 'frecuencia_recoleccion', label: 'Frecuencia de recolección', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'plagas': {
    title: 'Control de Plagas',
    icon: '🪰',
    formatCode: 'SGI-FPC-05',
    fields: [
      { key: 'area_inspeccionada', label: 'Área inspeccionada', type: 'text' },
      { key: 'evidencia_plagas', label: 'Evidencia de plagas', type: 'select', options: ['Sí', 'No'] },
      { key: 'tipo_plaga', label: 'Tipo de plaga detectada', type: 'select', options: ['Ninguna', 'Roedores', 'Insectos voladores', 'Insectos rastreros', 'Aves'] },
      { key: 'trampas_colocadas', label: 'Trampas colocadas', type: 'select', options: ['Sí', 'No'] },
      { key: 'cantidad_trampas', label: 'Cantidad de trampas', type: 'number' },
      { key: 'fumigacion_reciente', label: 'Fumigación reciente', type: 'select', options: ['Sí', 'No'] },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'ph-cloro': {
    title: 'Seguimiento pH y Cloro',
    icon: '💧',
    formatCode: 'SGI-FCFA-07',
    fields: [
      { key: 'punto_muestreo', label: 'Punto de muestreo', type: 'text' },
      { key: 'ph', label: 'pH medido', type: 'number', unit: 'pH' },
      { key: 'ph_min', label: 'pH mínimo aceptable', type: 'number', unit: 'pH' },
      { key: 'ph_max', label: 'pH máximo aceptable', type: 'number', unit: 'pH' },
      { key: 'cloro_libre', label: 'Cloro libre', type: 'number', unit: 'ppm' },
      { key: 'cloro_min', label: 'Cloro mínimo', type: 'number', unit: 'ppm' },
      { key: 'cloro_max', label: 'Cloro máximo', type: 'number', unit: 'ppm' },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'devolucion': {
    title: 'Devolución de Producto',
    icon: '🔄',
    formatCode: 'SGI-TZP-08',
    fields: [
      { key: 'producto', label: 'Producto', type: 'text' },
      { key: 'lote', label: 'Lote', type: 'text' },
      { key: 'cantidad', label: 'Cantidad devuelta', type: 'number' },
      { key: 'motivo', label: 'Motivo de devolución', type: 'select', options: ['Producto dañado', 'Vencido', 'Error en pedido', 'Rechazo de cliente', 'Otro'] },
      { key: 'origen', label: 'Origen de la devolución', type: 'text' },
      { key: 'estado_producto', label: 'Estado del producto', type: 'select', options: ['Apto para reventa', 'Apto para reproceso', 'Desechar'] },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'materia-prima': {
    title: 'Control de Materia Prima',
    icon: '📦',
    formatCode: 'SGI-FMP-09',
    fields: [
      { key: 'proveedor', label: 'Proveedor', type: 'text' },
      { key: 'producto', label: 'Producto/Materia prima', type: 'text' },
      { key: 'lote', label: 'Lote', type: 'text' },
      { key: 'fecha_vencimiento', label: 'Fecha de vencimiento', type: 'text' },
      { key: 'cantidad_recibida', label: 'Cantidad recibida', type: 'number' },
      { key: 'unidad_medida', label: 'Unidad de medida', type: 'select', options: ['kg', 'L', 'unidades', 'cajas'] },
      { key: 'temperatura_recepcion', label: 'Temperatura de recepción', type: 'number', unit: '°C' },
      { key: 'inspeccion_organoleptica', label: 'Inspección organoléptica', type: 'select', options: ['Aprobado', 'Rechazado'] },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  },
  'temp-hr': {
    title: 'Registro Temp y HR CC',
    icon: '⏱️',
    formatCode: 'SGI-FTHR-11',
    fields: [
      { key: 'area', label: 'Área/Cuarto', type: 'text' },
      { key: 'temperatura_manana', label: 'Temperatura mañana', type: 'number', unit: '°C' },
      { key: 'hr_manana', label: 'Humedad relativa mañana', type: 'number', unit: '%' },
      { key: 'temperatura_tarde', label: 'Temperatura tarde', type: 'number', unit: '°C' },
      { key: 'hr_tarde', label: 'Humedad relativa tarde', type: 'number', unit: '%' },
      { key: 'temp_min_permitida', label: 'Temp. mínima permitida', type: 'number', unit: '°C' },
      { key: 'temp_max_permitida', label: 'Temp. máxima permitida', type: 'number', unit: '°C' },
      { key: 'responsable', label: 'Responsable', type: 'text' },
      { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
    ]
  }
};

  currentConfig: any = null;
  formData: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    // Obtener parámetros de la URL
    this.route.queryParams.subscribe(params => {
      this.selectedDate = params['date'] || this.formatDate(new Date());
    });

    // Obtener el tipo de formato de la ruta
    const urlSegments = this.router.url.split('/');
    this.formatType = urlSegments[urlSegments.length - 1].split('?')[0];

    this.currentConfig = this.formatConfigs[this.formatType];

    if (!this.currentConfig) {
      this.presentToast('Formato no configurado', 'error');
      this.router.navigate(['/pages/dashboard']);
      return;
    }

    await this.cargarDatosDelDia();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  async cargarDatosDelDia() {
    try {
      this.loading = true;

      // Buscar checklist existente para ese día y formato
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .eq('format_type', this.formatType)
        .gte('created_at', `${this.selectedDate}T00:00:00`)
        .lte('created_at', `${this.selectedDate}T23:59:59`)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        this.checklistData = data;
        this.formData = data.data || {};
        this.isEditing = true;
      } else {
        // Inicializar formulario vacío
        this.formData = {};
        this.currentConfig.fields.forEach((field: any) => {
          this.formData[field.key] = '';
        });
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      this.presentToast('Error al cargar datos', 'error');
    } finally {
      this.loading = false;
    }
  }

  async guardarFormulario() {
  try {
    const user = await this.supabaseService.getCurrentUser();
    
    if (!user) {
      await this.presentToast('Debes iniciar sesión', 'error');
      return;
    }

    const checklistData = {
      format_type: this.currentConfig?.formatCode || this.formatType,
      establishment: 'Pan del Sur — Planta Principal',
      status: 'pending',
      data: {
        ...this.formData,
        date: this.selectedDate
      },
      created_by: user.id,
      plant_id: '00000000-0000-0000-0000-000000000001',  // ← Pega el ID real aquí
      updated_at: new Date().toISOString()
    };

    console.log('📦 Guardando:', checklistData);

    const result = await this.supabaseService
      .from('checklists')
      .insert([checklistData]);

    if (result.error) {
      console.error('❌ Error:', result.error);
      throw result.error;
    }

    await this.presentToast('Formulario guardado exitosamente', 'success');
    this.router.navigate(['/pages/dashboard']);

  } catch (error) {
    console.error('Error guardando:', error);
    await this.presentToast('Error: ' + (error as any).message, 'error');
  }
}

  async presentToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }

  onDateChange(event: any) {
    this.selectedDate = event.target.value;
    this.cargarDatosDelDia();
  }
}