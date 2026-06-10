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

  // Nuevas propiedades para la tabla y exportación
  registrosDelDia: any[] = [];
  selectedItems: Set<string> = new Set();

  // Configuración de cada formato
  formatConfigs: { [key: string]: any } = {
    'limpiezaydesinfeccion': {
      title: 'Limpieza y Desinfección',
      icon: '',
      formatCode: 'SGI-FLD-02',
      fields: [
        { 
          key: 'aspecto_evaluar', 
          label: 'Aspectos a evaluar', 
          type: 'select', 
          options: [
            'Manos del personal manipulador',
            'Calzado del personal manipulador',
            'Cuarto de crecimiento',
            'Area de produccion y Empaque',
            'Hornos',
            'Techos, puertas, paredes y Ventanas',
            'Area de cargue vehiculos',
            'Equipos y Utensilios',
            'Canastillas Plasticas',
            'Bandejas',
            'Baños'
          ]
        },
        { 
          key: 'responsable', 
          label: 'Responsable', 
          type: 'text' 
        },
        { 
          key: 'actividad', 
          label: 'Actividad', 
          type: 'select', 
          options: ['D', 'L', 'D y L']
        },
        { 
          key: 'cantidad', 
          label: 'Cantidad', 
          type: 'select', 
          options: [
            'Jabon neutro antibacterial',
            'Power Quat (Sal de amonio cuaternario 3era Gen.)',
            '60cc DETERGENTE INDUSTRIAL 25/10 litros de agua',
            '7 cc HIPOCLORITO DE SODIO/5 litro de agua',
            '4 cc AMONIO CUATERNARIO/1 litro de agua',
            '100 g DETERGENTE EN POLVO/10 litros de agua',
            '20 cc AMONIO CUATERNARIO/1 litro de agua',
            '3 cc HIPOCLORITO DE SODIO/5 litro de agua',
            '17 cc HIPOCLORITO DE SODIO/5 litro de agua'
          ]
        },
        { 
          key: 'concentracion', 
          label: 'Concentración', 
          type: 'range',
          unit: '%',
          min: 0,
          max: 100
        },
        { 
          key: 'dia', 
          label: 'Día', 
          type: 'date-auto' 
        },
        { 
          key: 'frecuencia', 
          label: 'Frecuencia', 
          type: 'select', 
          options: ['Diurna', 'Nocturna']
        },
        { 
          key: 'observaciones', 
          label: 'Observaciones', 
          type: 'textarea' 
        }
      ],
    },
    'verificacion': {
      title: 'Verificación de Limpieza',
      icon: '🔍',
      formatCode: 'SGI-FVL-06',
      fields: [
        { 
          key: 'aspecto_evaluar', 
          label: 'Aspectos a evaluar', 
          type: 'select', 
          options: [
            'Ambientes /aspersión',
            'Manos del personal manipulador',
            'Calzado del personal manipulador',
            'Hornos, cuartos de crecimiento',
            'Area de empaque y almacenamiento',
            'Area de produccion',
            'Techos, puertas, paredes y Ventanas',
            'Pisos',
            'Equipos y utensilios',
            'Canecas de residuos solidos',
            'Baños',
            'Limpiones y traperos',
            'Area de descargue',
            'Canastillas Plasticas'
          ]
        },
        { 
          key: 'responsable', 
          label: 'Responsable', 
          type: 'text' 
        },
        { 
          key: 'cumple', 
          label: 'Cumple', 
          type: 'select', 
          options: ['Si', 'No']
        },
        { 
          key: 'dia', 
          label: 'Día', 
          type: 'date-auto' 
        },
        { 
          key: 'procedimiento', 
          label: 'Procedimiento', 
          type: 'select', 
          options: ['Repite', 'No Repite']
        },
        { 
          key: 'verificado', 
          label: 'Verificado', 
          type: 'select', 
          options: ['Jefe de Calidad']
        },
        { 
          key: 'observaciones', 
          label: 'Observaciones', 
          type: 'text' 
        }
      ],
    },
    'hornos': {
      title: 'Temperatura de Hornos',
      icon: '',
      formatCode: 'SGI-FT-01',
      fields: [
        { 
          key: 'dia', 
          label: 'Día', 
          type: 'date-auto' 
        },
        { 
          key: 'jornada', 
          label: 'Jornada', 
          type: 'jornada-auto'
        },
        { 
          key: 'horno_1', 
          label: 'Horno 1 (°C)', 
          type: 'number', 
          unit: '°C' 
        },
        { 
          key: 'horno_2', 
          label: 'Horno 2 (°C)', 
          type: 'number', 
          unit: '°C' 
        },
        { 
          key: 'responsable', 
          label: 'Responsable', 
          type: 'select', 
          options: ['Panadero Líder']
        },
        { 
          key: 'observaciones', 
          label: 'Observaciones', 
          type: 'textarea' 
        }
      ],
    },
    'higienicas': {
      title: 'Prácticas Higiénicas',
      icon: '✨',
      formatCode: 'SGI-FPH-03',
      fields: [
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'nombre_evaluado', label: 'Nombre del Evaluado', type: 'text' },
        { key: 'responsable_checkeo', label: 'Responsable del Checkeo', type: 'text' },
        { key: 'firma_evaluado', label: 'Firma del Evaluado', type: 'text' },
        { key: 'cargo', label: 'Cargo', type: 'text' },
        { key: 'recomendaciones', label: 'Recomendaciones', type: 'textarea' }
      ],
      itemsEvaluacion: [
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
      icon: '🪲',
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
      icon: '',
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
      icon: '🌡️',
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
    public toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.selectedDate = params['date'] || this.formatDate(new Date());
    });

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

      console.log('🔍 Buscando registros con filtros:');
      console.log('  - format_type:', this.currentConfig.formatCode);
      console.log('  - selectedDate:', this.selectedDate);

      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .eq('format_type', this.currentConfig.formatCode)
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', this.selectedDate)
        .order('created_at', { ascending: false });

      console.log('📦 Datos recibidos:', data);
      console.log('❌ Error:', error);

      if (error) throw error;

      this.registrosDelDia = data || [];
      console.log('✅ Total de registros encontrados:', this.registrosDelDia.length);

      this.formData = {};
      this.currentConfig.fields.forEach((field: any) => {
        this.formData[field.key] = '';
      });
      
      this.formData['dia'] = this.selectedDate;
      
      // ✅ Inicializar estructura de items para prácticas higiénicas
      if (this.formatType === 'higienicas' && this.currentConfig?.itemsEvaluacion) {
        this.formData['items'] = this.currentConfig.itemsEvaluacion.map(() => ({
          cumple: '',
          observaciones: ''
        }));
      }
      
      // ✅ Calcular jornada automáticamente para hornos
      if (this.formatType === 'hornos') {
        this.formData['jornada'] = this.calcularJornada();
      }
      
      this.isEditing = false;
      this.checklistData = null;

      console.log('✅ Formulario listo para NUEVO registro');

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      this.presentToast('Error al cargar datos', 'error');
    } finally {
      this.loading = false;
    }
  }

  calcularJornada(): string {
    const ahora = new Date();
    const hora = ahora.getHours();
    return hora < 12 ? 'AM' : 'PM';
  }

  getHoraActual(): string {
    const ahora = new Date();
    return ahora.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  async guardarFormulario() {
    try {
      console.log('💾 Guardando formulario...');
      console.log('  - isEditing:', this.isEditing);
      console.log('  - checklistData:', this.checklistData);
      console.log('  - formData:', this.formData);

      const user = await this.supabaseService.getCurrentUser();
      if (!user) {
        await this.presentToast('Debes iniciar sesión', 'error');
        return;
      }

      const checklistData = {
        format_type: this.currentConfig.formatCode,
        establishment: 'Pan del Sur — Planta Principal',
        status: 'pending',
        data: { ...this.formData, date: this.selectedDate },
        created_by: user.id,
        plant_id: '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString()
      };

      console.log('📦 Datos a guardar:', checklistData);

      let result;
      if (this.isEditing && this.checklistData?.id) {
        console.log('🔄 Actualizando registro ID:', this.checklistData.id);
        result = await this.supabaseService
          .from('checklists')
          .update(checklistData)
          .eq('id', this.checklistData.id);
      } else {
        console.log('➕ Insertando nuevo registro');
        result = await this.supabaseService
          .from('checklists')
          .insert([checklistData]);
      }

      if (result.error) {
        console.error('❌ Error al guardar:', result.error);
        throw result.error;
      }

      await this.presentToast(
        this.isEditing ? 'Registro actualizado correctamente' : 'Registro guardado exitosamente', 
        'success'
      );

      this.formData = {};
      this.currentConfig.fields.forEach((field: any) => {
        this.formData[field.key] = '';
      });
      this.formData['dia'] = this.selectedDate;
      this.isEditing = false;
      this.checklistData = null;
      
      await this.cargarDatosDelDia();

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

  cancelarEdicion() {
    this.formData = {};
    this.currentConfig.fields.forEach((field: any) => {
      this.formData[field.key] = '';
    });
    this.formData['dia'] = this.selectedDate;
    
    // Re-inicializar items para higiénicas
    if (this.formatType === 'higienicas' && this.currentConfig?.itemsEvaluacion) {
      this.formData['items'] = this.currentConfig.itemsEvaluacion.map(() => ({
        cumple: '',
        observaciones: ''
      }));
    }
    
    // Re-calcular jornada para hornos
    if (this.formatType === 'hornos') {
      this.formData['jornada'] = this.calcularJornada();
    }
    
    this.isEditing = false;
    this.checklistData = null;
  }

  editarRegistro(registro: any) {
    console.log('✏️ Editando registro:', registro);
    
    this.checklistData = registro;
    this.formData = { ...registro.data };
    this.isEditing = true;
    
    // Asegurar que items exista para higiénicas
    if (this.formatType === 'higienicas' && !this.formData.items) {
      this.formData.items = this.currentConfig.itemsEvaluacion.map(() => ({
        cumple: '',
        observaciones: ''
      }));
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.presentToast('Editando registro. Modifica y haz clic en Actualizar', 'success');
  }

  async eliminarRegistro(id: string) {
    console.log('🗑️ Eliminando registro ID:', id);
    
    const confirm = await this.toastCtrl.create({
      message: '¿Estás seguro de eliminar este registro?',
      duration: 0,
      position: 'top',
      color: 'warning',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              const { data, error, count } = await this.supabaseService
                .from('checklists')
                .delete({ count: 'exact' })
                .eq('id', id)
                .select();

              if (error) throw error;

              if (count === 0) {
                await this.presentToast('No se pudo eliminar el registro. Verifica permisos.', 'error');
                return;
              }

              await this.presentToast('Registro eliminado correctamente', 'success');
              await this.cargarDatosDelDia();
            } catch (error) {
              await this.presentToast('Error al eliminar: ' + (error as any).message, 'error');
            }
          }
        }
      ]
    });
    
    await confirm.present();
  }

  async exportarRegistroIndividual(registro: any) {
    let datosExportar: any = {};
    
    if (this.formatType === 'limpiezaydesinfeccion') {
      datosExportar = {
        'Aspecto a Evaluar': registro.data?.aspecto_evaluar || '',
        'Responsable': registro.data?.responsable || '',
        'Actividad': registro.data?.actividad || '',
        'Cantidad': registro.data?.cantidad || '',
        'Concentración': (registro.data?.concentracion || 0) + '%',
        'Frecuencia': registro.data?.frecuencia || '',
        'Día': registro.data?.dia || '',
        'Observaciones': registro.data?.observaciones || ''
      };
    } else if (this.formatType === 'verificacion') {
      datosExportar = {
        'Aspecto a Evaluar': registro.data?.aspecto_evaluar || '',
        'Responsable': registro.data?.responsable || '',
        'Cumple': registro.data?.cumple || '',
        'Día': registro.data?.dia || '',
        'Observaciones': registro.data?.observaciones || '',
        'Procedimiento': registro.data?.procedimiento || '',
        'Verificado': registro.data?.verificado || ''
      };
    } else if (this.formatType === 'hornos') {
      datosExportar = {
        'Día': registro.data?.dia || '',
        'Jornada': registro.data?.jornada || '',
        'Horno 1 (°C)': registro.data?.horno_1 || '',
        'Horno 2 (°C)': registro.data?.horno_2 || '',
        'Responsable': registro.data?.responsable || '',
        'Observaciones': registro.data?.observaciones || ''
      };
    } else if (this.formatType === 'higienicas') {
      datosExportar = {
        'Día': registro.data?.dia || '',
        'Nombre Evaluado': registro.data?.nombre_evaluado || '',
        'Responsable Checkeo': registro.data?.responsable_checkeo || '',
        'Firma Evaluado': registro.data?.firma_evaluado || '',
        'Cargo': registro.data?.cargo || '',
        'Recomendaciones': registro.data?.recomendaciones || ''
      };
      
      // Agregar cada ítem de evaluación
      if (registro.data?.items && this.currentConfig.itemsEvaluacion) {
        this.currentConfig.itemsEvaluacion.forEach((item: string, idx: number) => {
          const itemData = registro.data.items[idx] || {};
          datosExportar[`Ítem ${idx + 1}: ${item.substring(0, 40)}`] = itemData.cumple || '';
          datosExportar[`Obs Ítem ${idx + 1}`] = itemData.observaciones || '';
        });
      }
    } else {
      this.currentConfig.fields.forEach((field: any) => {
        const label = field.label;
        let value = registro.data?.[field.key] || '';
        if (field.type === 'range' && value) {
          value = `${value}${field.unit || '%'}`;
        }
        datosExportar[label] = value;
      });
    }

    const csvContent = [
      Object.keys(datosExportar).join(','),
      Object.values(datosExportar).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const formatName = this.currentConfig?.title || 'registro';
    link.setAttribute('download', `${formatName.replace(/\s+/g, '_')}_${registro.data?.dia || 'individual'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await this.presentToast('Registro exportado correctamente', 'success');
  }

  async exportarTodoExcel() {
    if (this.registrosDelDia.length === 0) {
      await this.presentToast('No hay datos para exportar', 'error');
      return;
    }

    let datosExportar: any[] = [];

    if (this.formatType === 'limpiezaydesinfeccion') {
      datosExportar = this.registrosDelDia.map(reg => ({
        'Aspecto a Evaluar': reg.data?.aspecto_evaluar || '',
        'Responsable': reg.data?.responsable || '',
        'Actividad': reg.data?.actividad || '',
        'Cantidad': reg.data?.cantidad || '',
        'Concentración': (reg.data?.concentracion || 0) + '%',
        'Frecuencia': reg.data?.frecuencia || '',
        'Día': reg.data?.dia || '',
        'Observaciones': reg.data?.observaciones || ''
      }));
    } else if (this.formatType === 'verificacion') {
      datosExportar = this.registrosDelDia.map(reg => ({
        'Aspecto a Evaluar': reg.data?.aspecto_evaluar || '',
        'Responsable': reg.data?.responsable || '',
        'Cumple': reg.data?.cumple || '',
        'Día': reg.data?.dia || '',
        'Observaciones': reg.data?.observaciones || '',
        'Procedimiento': reg.data?.procedimiento || '',
        'Verificado': reg.data?.verificado || ''
      }));
    } else if (this.formatType === 'hornos') {
      datosExportar = this.registrosDelDia.map(reg => ({
        'Día': reg.data?.dia || '',
        'Jornada': reg.data?.jornada || '',
        'Horno 1 (°C)': reg.data?.horno_1 || '',
        'Horno 2 (°C)': reg.data?.horno_2 || '',
        'Responsable': reg.data?.responsable || '',
        'Observaciones': reg.data?.observaciones || ''
      }));
    } else if (this.formatType === 'higienicas') {
      datosExportar = this.registrosDelDia.map(reg => {
        const row: any = {
          'Día': reg.data?.dia || '',
          'Nombre Evaluado': reg.data?.nombre_evaluado || '',
          'Responsable Checkeo': reg.data?.responsable_checkeo || '',
          'Firma Evaluado': reg.data?.firma_evaluado || '',
          'Cargo': reg.data?.cargo || '',
          'Recomendaciones': reg.data?.recomendaciones || ''
        };
        
        if (reg.data?.items && this.currentConfig.itemsEvaluacion) {
          this.currentConfig.itemsEvaluacion.forEach((item: string, idx: number) => {
            const itemData = reg.data.items[idx] || {};
            row[`Ítem ${idx + 1}: ${item.substring(0, 30)}...`] = itemData.cumple || '';
            row[`Obs Ítem ${idx + 1}`] = itemData.observaciones || '';
          });
        }
        
        return row;
      });
    } else {
      datosExportar = this.registrosDelDia.map(reg => {
        const row: any = {
          'Día': reg.data?.dia || ''
        };
        
        this.currentConfig.fields.forEach((field: any) => {
          if (field.type !== 'date-auto' && field.type !== 'textarea') {
            let value = reg.data?.[field.key] || '';
            if (field.type === 'range' && value) {
              value = `${value}${field.unit || '%'}`;
            }
            row[field.label] = value;
          }
        });
        
        row['Observaciones'] = reg.data?.observaciones || '';
        return row;
      });
    }

    const headers = Object.keys(datosExportar[0]);
    const csvContent = [
      headers.join(','),
      ...datosExportar.map(row => 
        headers.map(header => {
          const value = (row as any)[header];
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.currentConfig?.title?.replace(/\s+/g, '_') || 'export'}_${this.selectedDate}_COMPLETO.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    await this.presentToast('Todos los registros exportados a Excel', 'success');
  }

  async exportarTodoPDF() {
    if (this.registrosDelDia.length === 0) {
      await this.presentToast('No hay datos para exportar', 'error');
      return;
    }

    const formatTitle = this.currentConfig?.title || 'Reporte';
    
    let headers: string[] = [];
    let rows: string[][] = [];

    if (this.formatType === 'limpiezaydesinfeccion') {
      headers = ['Aspecto a Evaluar', 'Responsable', 'Actividad', 'Cantidad', 'Concentración', 'Frecuencia', 'Día', 'Observaciones'];
      rows = this.registrosDelDia.map(reg => [
        reg.data?.aspecto_evaluar || '',
        reg.data?.responsable || '',
        reg.data?.actividad || '',
        reg.data?.cantidad || '',
        (reg.data?.concentracion || 0) + '%',
        reg.data?.frecuencia || '',
        reg.data?.dia || '',
        reg.data?.observaciones || ''
      ]);
    } else if (this.formatType === 'verificacion') {
      headers = ['Aspecto a Evaluar', 'Responsable', 'Cumple', 'Día', 'Observaciones', 'Procedimiento', 'Verificado'];
      rows = this.registrosDelDia.map(reg => [
        reg.data?.aspecto_evaluar || '',
        reg.data?.responsable || '',
        reg.data?.cumple || '',
        reg.data?.dia || '',
        reg.data?.observaciones || '',
        reg.data?.procedimiento || '',
        reg.data?.verificado || ''
      ]);
    } else if (this.formatType === 'hornos') {
      headers = ['Día', 'Jornada', 'Horno 1 (°C)', 'Horno 2 (°C)', 'Responsable', 'Observaciones'];
      rows = this.registrosDelDia.map(reg => [
        reg.data?.dia || '',
        reg.data?.jornada || '',
        reg.data?.horno_1 || '',
        reg.data?.horno_2 || '',
        reg.data?.responsable || '',
        reg.data?.observaciones || ''
      ]);
    } else if (this.formatType === 'higienicas') {
      headers = ['Día', 'Nombre Evaluado', 'Responsable', 'Cargo', 'Recomendaciones'];
      rows = this.registrosDelDia.map(reg => [
        reg.data?.dia || '',
        reg.data?.nombre_evaluado || '',
        reg.data?.responsable_checkeo || '',
        reg.data?.cargo || '',
        reg.data?.recomendaciones || ''
      ]);
    } else {
      headers = this.currentConfig.fields
        .filter((f: any) => f.type !== 'date-auto' && f.type !== 'textarea')
        .map((f: any) => f.label);
      headers.push('Día', 'Observaciones');
      
      rows = this.registrosDelDia.map(reg => {
        const row: string[] = [];
        this.currentConfig.fields.forEach((field: any) => {
          if (field.type !== 'date-auto' && field.type !== 'textarea') {
            let value = reg.data?.[field.key] || '';
            if (field.type === 'range' && value) {
              value = `${value}${field.unit || '%'}`;
            }
            row.push(value);
          }
        });
        row.push(reg.data?.dia || '', reg.data?.observaciones || '');
        return row;
      });
    }

    let htmlContent = `
      <html>
      <head>
        <title>${formatTitle} - ${this.selectedDate}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #3C50E0; text-align: center; }
          h2 { color: #666; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background-color: #FF6B35; color: white; padding: 10px; text-align: left; font-size: 12px; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 11px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
        </style>
      </head>
      <body>
        <h1>${formatTitle}</h1>
        <h2>Fecha: ${this.selectedDate}</h2>
        <p><strong>Total de registros:</strong> ${this.registrosDelDia.length}</p>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <p>Generado el: ${new Date().toLocaleString()}</p>
          <p>Sistema BPM - Pan del Sur</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    await this.presentToast('PDF generado correctamente', 'success');
  }

  async exportarRegistroIndividualPDF(registro: any) {
    const formatTitle = this.currentConfig?.title || 'Registro';
    
    let contenidoHTML = '';
    
    if (this.formatType === 'higienicas') {
      contenidoHTML = `
        <h1>✨ ${formatTitle}</h1>
        <h2>Sistema BPM - Pan del Sur</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Día</div>
            <div class="info-value">${registro.data?.dia || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Nombre del Evaluado</div>
            <div class="info-value">${registro.data?.nombre_evaluado || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Responsable del Checkeo</div>
            <div class="info-value">${registro.data?.responsable_checkeo || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Cargo</div>
            <div class="info-value">${registro.data?.cargo || 'N/A'}</div>
          </div>
        </div>
        ${registro.data?.recomendaciones ? `
        <div class="observaciones">
          <div class="info-label">Recomendaciones</div>
          <div class="info-value">${registro.data.recomendaciones}</div>
        </div>
        ` : ''}
        <h3 style="margin-top: 30px; color: #FF6B35;">Evaluación de Ítems</h3>
        <table style="margin-top: 15px;">
          <thead>
            <tr>
              <th>N°</th>
              <th>Ítem</th>
              <th>Cumple</th>
              <th>Observaciones</th>
            </tr>
          </thead>
          <tbody>
            ${this.currentConfig.itemsEvaluacion.map((item: string, idx: number) => {
              const itemData = registro.data?.items?.[idx] || {};
              return `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${item}</td>
                  <td><span class="badge ${itemData.cumple === 'Si' ? 'badge-green' : itemData.cumple === 'No' ? 'badge-red' : 'badge-gray'}">${itemData.cumple || '-'}</span></td>
                  <td>${itemData.observaciones || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    } else {
      contenidoHTML = `
        <h1>🧹 ${formatTitle}</h1>
        <h2>Sistema BPM - Pan del Sur</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Fecha de Registro</div>
            <div class="info-value">${registro.data?.dia || 'N/A'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Registrado el</div>
            <div class="info-value">${new Date(registro.created_at).toLocaleString()}</div>
          </div>
        </div>
        ${registro.data?.observaciones ? `
        <div class="observaciones">
          <div class="info-label">Observaciones</div>
          <div class="info-value">${registro.data.observaciones}</div>
        </div>
        ` : ''}
      `;
    }
    
    const htmlContent = `
      <html>
      <head>
        <title>${formatTitle} - ${registro.data?.dia || 'Individual'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; background: white; }
          .header { text-align: center; border-bottom: 3px solid #FF6B35; padding-bottom: 20px; margin-bottom: 30px; }
          h1 { color: #3C50E0; margin: 0; font-size: 24px; }
          h2 { color: #666; margin: 10px 0; font-size: 16px; }
          h3 { color: #FF6B35; margin: 20px 0 10px 0; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
          .info-item { background: #f9f9f9; padding: 12px; border-left: 4px solid #FF6B35; }
          .info-label { font-size: 11px; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 5px; }
          .info-value { font-size: 14px; color: #333; font-weight: 600; }
          .observaciones { background: #fff5f0; border-left: 4px solid #FF6B35; padding: 15px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background-color: #FF6B35; color: white; padding: 10px; text-align: left; font-size: 11px; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 10px; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #ddd; text-align: center; font-size: 10px; color: #999; }
          .badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-green { background: #d1fae5; color: #065f46; }
          .badge-red { background: #fee2e2; color: #991b1b; }
          .badge-gray { background: #f3f4f6; color: #6b7280; }
        </style>
      </head>
      <body>
        ${contenidoHTML}
        <div class="footer">
          <p>Documento generado el ${new Date().toLocaleString()}</p>
          <p>Sistema BPM - Control de Calidad | Pan del Sur</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    await this.presentToast('PDF del registro generado correctamente', 'success');
  }

  getTableColumns(): string[] {
    switch (this.formatType) {
      case 'limpiezaydesinfeccion':
        return ['Aspecto', 'Responsable', 'Actividad', 'Cantidad', 'Concentración', 'Frecuencia', 'Día', 'Acciones'];
      case 'verificacion':
        return ['Aspecto', 'Responsable', 'Cumple', 'Procedimiento', 'Verificado', 'Día', 'Acciones'];
      case 'hornos':
        return ['Día', 'Jornada', 'Horno 1 (°C)', 'Horno 2 (°C)', 'Responsable', 'Acciones'];
      case 'higienicas':
        return ['Día', 'Nombre Evaluado', 'Responsable', 'Cargo', 'Acciones'];
      default:
        const fields = this.currentConfig?.fields || [];
        const cols = fields
          .filter((f: any) => f.type !== 'date-auto' && f.type !== 'textarea')
          .map((f: any) => f.label);
        return [...cols, 'Día', 'Acciones'];
    }
  }

  getCellValue(registro: any, columnName: string): any {
    const data = registro.data || {};
    
    switch (this.formatType) {
      case 'limpiezaydesinfeccion':
        switch (columnName) {
          case 'Aspecto': return data.aspecto_evaluar;
          case 'Responsable': return data.responsable;
          case 'Actividad': return data.actividad;
          case 'Cantidad': return data.cantidad;
          case 'Concentración': return data.concentracion ? `${data.concentracion}%` : '0%';
          case 'Frecuencia': return data.frecuencia;
          case 'Día': return data.dia;
          default: return '-';
        }
      case 'verificacion':
        switch (columnName) {
          case 'Aspecto': return data.aspecto_evaluar;
          case 'Responsable': return data.responsable;
          case 'Cumple': return data.cumple;
          case 'Procedimiento': return data.procedimiento;
          case 'Verificado': return data.verificado;
          case 'Día': return data.dia;
          default: return '-';
        }
      case 'hornos':
        switch (columnName) {
          case 'Día': return data.dia;
          case 'Jornada': return data.jornada;
          case 'Horno 1 (°C)': return data.horno_1 ? `${data.horno_1}°C` : '-';
          case 'Horno 2 (°C)': return data.horno_2 ? `${data.horno_2}°C` : '-';
          case 'Responsable': return data.responsable;
          default: return '-';
        }
      case 'higienicas':
        switch (columnName) {
          case 'Día': return data.dia;
          case 'Nombre Evaluado': return data.nombre_evaluado;
          case 'Responsable': return data.responsable_checkeo;
          case 'Cargo': return data.cargo;
          default: return '-';
        }
      default:
        const field = this.currentConfig?.fields?.find((f: any) => f.label === columnName);
        if (field) {
          return data[field.key] ?? '-';
        }
        return '-';
    }
  }

  isBadgeValue(columnName: string): boolean {
    const badgeColumns = ['Actividad', 'Frecuencia', 'Cumple', 'Procedimiento', 'Verificado', 'Concentración', 'Jornada'];
    return badgeColumns.includes(columnName);
  }

  getBadgeColor(columnName: string, value: any): string {
    if (columnName === 'Cumple') {
      return value === 'Si' 
        ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400'
        : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400';
    }
    if (columnName === 'Concentración') {
      return 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400';
    }
    if (columnName === 'Jornada') {
      return value === 'AM'
        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
        : 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400';
    }
    return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400';
  }
}