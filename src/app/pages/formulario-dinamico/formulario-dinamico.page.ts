import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ToastController } from '@ionic/angular';
import { NotificationService } from '../../services/notification.service';

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
  registrosDelDia: any[] = [];
  selectedItems: Set<string> = new Set();
  listaEmpleadosOperativos: string[] = [];
  listaJefesCalidad: string[] = [];

  formatConfigs: { [key: string]: any } = {
    'limpiezaydesinfeccion': {
      title: 'Limpieza y Desinfección',
      icon: '🧹',
      formatCode: 'SGI-FLD-02',
      fields: [
        { key: 'aspecto_evaluar', label: 'Aspectos a evaluar', type: 'select', options: ['Manos del personal manipulador', 'Calzado del personal manipulador', 'Cuarto de crecimiento', 'Area de produccion y Empaque', 'Hornos', 'Techos, puertas, paredes y Ventanas', 'Area de cargue vehiculos', 'Equipos y Utensilios', 'Canastillas Plasticas', 'Bandejas', 'Baños'] },
        { key: 'responsable', label: 'Responsable', type: 'select-responsable' },
        { key: 'actividad', label: 'Actividad', type: 'select', options: ['D', 'L', 'D y L'] },
        { key: 'cantidad', label: 'Cantidad', type: 'select', options: ['Jabon neutro antibacterial', 'Power Quat', '60cc DETERGENTE INDUSTRIAL', '7 cc HIPOCLORITO DE SODIO', '4 cc AMONIO CUATERNARIO', '100 g DETERGENTE EN POLVO', '20 cc AMONIO CUATERNARIO', '3 cc HIPOCLORITO DE SODIO', '17 cc HIPOCLORITO DE SODIO'] },
        { key: 'concentracion', label: 'Concentración', type: 'range', unit: '%', min: 0, max: 100 },
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'frecuencia', label: 'Frecuencia', type: 'select', options: ['Diurna', 'Nocturna'] },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ],
    },
    'verificacion': {
      title: 'Verificación de Limpieza',
      icon: '🔍',
      formatCode: 'SGI-FVL-06',
      fields: [
        { key: 'aspecto_evaluar', label: 'Aspectos a evaluar', type: 'select', options: ['Ambientes /aspersión', 'Manos del personal manipulador', 'Calzado del personal manipulador', 'Hornos, cuartos de crecimiento', 'Area de empaque y almacenamiento', 'Area de produccion', 'Techos, puertas, paredes y Ventanas', 'Pisos', 'Equipos y utensilios', 'Canecas de residuos solidos', 'Baños', 'Limpiones y traperos', 'Area de descargue', 'Canastillas Plasticas'] },
        { key: 'responsable', label: 'Responsable', type: 'select-responsable' },
        { key: 'cumple', label: 'Cumple', type: 'select', options: ['Si', 'No'] },
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'procedimiento', label: 'Procedimiento', type: 'select', options: ['Repite', 'No Repite'] },
        { key: 'verificado', label: 'Verificado', type: 'select-jefe-calidad' },
        { key: 'observaciones', label: 'Observaciones', type: 'text' }
      ],
    },
    'hornos': {
      title: 'Temperatura de Hornos',
      icon: '🔥',
      formatCode: 'SGI-FT-01',
      fields: [
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'jornada', label: 'Jornada', type: 'jornada-auto' },
        { key: 'horno_1', label: 'Horno 1 (°C)', type: 'number', unit: '°C' },
        { key: 'horno_2', label: 'Horno 2 (°C)', type: 'number', unit: '°C' },
        { key: 'responsable', label: 'Responsable', type: 'select', options: ['Panadero Líder'] },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ],
    },
    'higienicas': {
      title: 'Prácticas Higiénicas',
      icon: '✨',
      formatCode: 'SGI-FPH-03',
      fields: [
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'nombre_evaluado', label: 'Nombre del Evaluado', type: 'select-empleado' },
        { key: 'responsable_checkeo', label: 'Responsable del Checkeo', type: 'select-responsable' },
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
        'No usa joyas, relojes ni objetos personales durante el proceso',
        'Mantiene las uñas cortas, limpias y sin esmalte',
        'No fuma, come ni bebe en las áreas de proceso',
        'Reporta enfermedades o heridas',
        'Utiliza correctamente los elementos de protección personal',
        'Mantiene el área de trabajo ordenada y limpia',
        'Manipula adecuadamente los alimentos'
      ]
    },
    'residuos': {
      title: 'Inspección de Residuos',
      icon: '🗑️',
      formatCode: 'SGI-FIR-04',
      fields: [
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'responsable', label: 'Responsable de la inspección', type: 'select-responsable' },
        { key: 'area_inspeccionada', label: 'Área inspeccionada', type: 'text' },
        { key: 'observaciones_generales', label: 'Observaciones generales', type: 'textarea' }
      ],
      itemsEvaluacion: [
        'El área de almacenamiento de residuos se encuentra debidamente aislada de las demás áreas',
        'Las canecas se encuentran en buen estado, con tapa y pedal',
        'Las canecas están debidamente identificadas según el tipo de residuo',
        'Se realiza la separación adecuada de residuos orgánicos e inorgánicos',
        'Las canecas se encuentran limpias y desinfectadas',
        'Los residuos se retiran diariamente del área de producción',
        'Existe un cronograma de recolección de residuos',
        'El personal utiliza guantes para manejar residuos',
        'Las bolsas de residuos están debidamente cerradas',
        'No hay acumulación excesiva de residuos en el área',
        'Las canecas de residuos orgánicos se limpian diariamente',
        'Las canecas de residuos inorgánicos se limpian semanalmente',
        'Las rejillas de protección de los drenajes se encuentran bien ubicadas y libres de residuos'
      ]
    },
    'plagas': {
      title: 'Control de Plagas',
      icon: '🪲',
      formatCode: 'SGI-FPC-05',
      fields: [
        { key: 'dia', label: 'Día', type: 'date-auto' },
        { key: 'responsable', label: 'Responsable', type: 'select-responsable' },
        { key: 'area_inspeccionada', label: 'Área inspeccionada', type: 'text' },
        { key: 'medidas_preventivas', label: 'Medidas Preventivas', type: 'textarea' },
        { key: 'medidas_correctivas', label: 'Medidas Correctivas', type: 'textarea' },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ],
      itemsEvaluacion: [
        'Se realiza inspección de plagas en el área',
        'No hay evidencia de roedores (heces, roeduras, huellas)',
        'No hay evidencia de insectos (cucarachas, hormigas, moscas)',
        'Las trampas de luz se encuentran funcionando correctamente',
        'Las cebaderas están debidamente ubicadas y señalizadas',
        'No hay acumulación de agua estancada',
        'Las puertas y ventanas están en buen estado (sin huecos)',
        'Las mallas de protección están en buen estado',
        'Se controla la presencia de plagas en las diferentes áreas de proceso, almacenamiento y empaque',
        'Se deja soporte del último servicio de fumigación y control de roedores',
        'Se hace rotación de los productos utilizados para el control de plagas y roedores'
      ]
    },
    'ph-cloro': {
      title: 'Seguimiento pH y Cloro',
      icon: '💧',
      formatCode: 'SGI-FCFA-07',
      fields: [
        { key: 'dia', label: 'Fecha', type: 'date-auto' },
        { key: 'punto_toma_de', label: 'Punto de Toma', type: 'select', options: ['Grifo de produccion', 'Tanque almacenamiento', 'Linea envasado'] },
        { key: 'ph', label: 'pH', type: 'number', unit: 'pH' },
        { key: 'cloro', label: 'Cloro (ppm)', type: 'number', unit: 'ppm' },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ]
    },
    'devolucion': {
      title: 'Devolución de Producto',
      icon: '🔄',
      formatCode: 'SGI-TZP-08',
      fields: [
        { key: 'dia', label: 'Fecha', type: 'date-auto' },
        { key: 'nombre_producto', label: 'Nombre del Producto', type: 'text' },
        { key: 'cantidad', label: 'Cantidad', type: 'text' },
        { key: 'fecha_devolucion', label: 'Fecha de Devolución', type: 'text' },
        { key: 'cliente', label: 'Cliente', type: 'text' },
        { key: 'causa_devolucion', label: 'Causa de la Devolución', type: 'select', options: ['PRESENTA MOHO', 'VENCIDO', 'DANADO', 'ERROR_PEDIDO', 'OTRO'] },
        { key: 'observaciones', label: 'Observaciones', type: 'textarea' }
      ]
    },
    'materia-prima': {
      title: 'Control de Materia Prima',
      icon: '📦',
      formatCode: 'SGI-FMP-09',
      fields: [
        { key: 'observaciones_generales', label: 'Observaciones Generales', type: 'textarea' },
        { key: 'operario_responsable', label: 'Operario Responsable', type: 'select-empleado' },
        { key: 'jefe_calidad', label: 'Jefe de Calidad', type: 'select-jefe-calidad' }
      ]
    },
    'temp-hr': {
      title: 'Registro Temp y HR CC',
      icon: '️',
      formatCode: 'SGI-FTHR-11',
      fields: [
        { key: 'jefe_calidad', label: 'Jefe de Calidad', type: 'select-jefe-calidad' }
      ]
    }
  };

  currentConfig: any = null;
  formData: any = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    public toastCtrl: ToastController,
    private notificationService: NotificationService
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
    
    await this.cargarEmpleados();
    await this.cargarDatosDelDia();
  }

  async cargarEmpleados() {
    try {
      const { data, error } = await this.supabaseService
        .from('empleados')
        .select('nombre, rol');
      
      if (error) throw error;
      
      if (data) {
        this.listaEmpleadosOperativos = data
          .filter((e: any) => e.rol === 'Operario' || e.rol === 'Panadero' || e.rol === 'Auxiliar')
          .map((e: any) => e.nombre);
        
        this.listaJefesCalidad = data
          .filter((e: any) => e.rol === 'Jefe de Calidad')
          .map((e: any) => e.nombre);
      }
    } catch (error) {
      console.error('Error cargando empleados:', error);
    }
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
      const { data, error } = await this.supabaseService
        .from('checklists')
        .select('*')
        .eq('format_type', this.currentConfig.formatCode)
        .eq('plant_id', '00000000-0000-0000-0000-000000000001')
        .eq('data->>dia', this.selectedDate)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      this.registrosDelDia = data || [];
      this.formData = {};
      
      this.currentConfig.fields.forEach((field: any) => {
        this.formData[field.key] = '';
      });
      
      this.formData['dia'] = this.selectedDate;
      
      if (this.formatType === 'higienicas' && this.currentConfig?.itemsEvaluacion) {
        this.formData['items'] = this.currentConfig.itemsEvaluacion.map(() => ({
          cumple: '',
          observaciones: ''
        }));
      }
      
      if (this.formatType === 'residuos' && this.currentConfig?.itemsEvaluacion) {
        this.formData['items_solidos'] = this.getResiduosSolidosItems().map(() => ({
          verificacion: '',
          observaciones: ''
        }));
        this.formData['items_liquidos'] = this.getResiduosLiquidosItems().map(() => ({
          verificacion: '',
          observaciones: ''
        }));
      }
      
      if (this.formatType === 'plagas' && this.currentConfig?.itemsEvaluacion) {
        this.formData['items_plagas'] = this.getPlagasItems().map(() => ({
          verificacion: '',
          observaciones: ''
        }));
      }
      
      if (this.formatType === 'materia-prima') {
        this.formData['items_mp'] = [{
          fecha: this.selectedDate,
          proveedor: '',
          producto: '',
          fecha_vencimiento: '',
          temperatura: '',
          aprobado: '',
          observaciones: ''
        }];
      }
      
      if (this.formatType === 'temp-hr') {
        this.formData['items_temp_hr'] = [{
          fecha: this.selectedDate,
          hora: '',
          temperatura: '',
          hr: '',
          observaciones: ''
        }];
      }
      
      if (this.formatType === 'hornos') {
        this.formData['jornada'] = this.calcularJornada();
      }
      
      this.isEditing = false;
      this.checklistData = null;
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.presentToast('Error al cargar datos', 'error');
    } finally {
      this.loading = false;
    }
  }

  calcularJornada(): string {
    const ahora = new Date();
    return ahora.getHours() < 12 ? 'AM' : 'PM';
  }

  async guardarFormulario() {
    try {
      // ==========================================
      // 1. VALIDACIONES COMPLETAS PARA LOS 10 FORMULARIOS
      // ==========================================
      
      // 1. Limpieza y Desinfección
      if (this.formatType === 'limpiezaydesinfeccion') {
        if (!this.formData['aspecto_evaluar']) return this.presentToast('❌ Seleccione el aspecto a evaluar', 'error');
        if (!this.formData['responsable']?.trim()) return this.presentToast('❌ Seleccione el responsable', 'error');
        if (!this.formData['actividad']) return this.presentToast('❌ Seleccione la actividad', 'error');
        if (!this.formData['cantidad']) return this.presentToast('❌ Seleccione la cantidad', 'error');
        if (this.formData['concentracion'] === '' || this.formData['concentracion'] === null || this.formData['concentracion'] === undefined) return this.presentToast('❌ Ingrese la concentración', 'error');
        if (!this.formData['frecuencia']) return this.presentToast('❌ Seleccione la frecuencia', 'error');
      }

      // 2. Verificación de Limpieza
      if (this.formatType === 'verificacion') {
        if (!this.formData['aspecto_evaluar']) return this.presentToast('❌ Seleccione el aspecto a evaluar', 'error');
        if (!this.formData['responsable']?.trim()) return this.presentToast('❌ Seleccione el responsable', 'error');
        if (!this.formData['cumple']) return this.presentToast('❌ Seleccione si cumple o no', 'error');
        if (!this.formData['procedimiento']) return this.presentToast('❌ Seleccione el procedimiento', 'error');
        if (!this.formData['verificado']) return this.presentToast(' Seleccione quién verificó', 'error');
      }

      // 3. Temperatura de Hornos - CON ALERTAS
      if (this.formatType === 'hornos') {
        if (this.formData['horno_1'] === '' || this.formData['horno_1'] === null || this.formData['horno_1'] === undefined) 
          return this.presentToast('❌ Ingrese la temperatura del Horno 1', 'error');
        if (this.formData['horno_2'] === '' || this.formData['horno_2'] === null || this.formData['horno_2'] === undefined) 
          return this.presentToast('❌ Ingrese la temperatura del Horno 2', 'error');
        if (!this.formData['responsable']) return this.presentToast('❌ Seleccione el responsable', 'error');
        
        // ✅ VERIFICAR TEMPERATURAS Y CREAR ALERTAS
        const temp1 = parseFloat(this.formData['horno_1']);
        const temp2 = parseFloat(this.formData['horno_2']);
        
        if (temp1 < 120 || temp1 > 180) {
          await this.crearAlertaTemperatura('horno_1', temp1);
        }
        
        if (temp2 < 120 || temp2 > 180) {
          await this.crearAlertaTemperatura('horno_2', temp2);
        }
      }

      // 4. Prácticas Higiénicas
      if (this.formatType === 'higienicas') {
        if (!this.formData['nombre_evaluado']?.trim()) return this.presentToast('❌ Seleccione el evaluado', 'error');
        if (!this.formData['responsable_checkeo']?.trim()) return this.presentToast('❌ Seleccione el responsable', 'error');
        const sinVerificar = this.formData['items']?.filter((i: any) => !i.cumple).length || 0;
        if (sinVerificar > 0) return this.presentToast(`❌ Faltan ${sinVerificar} aspectos por verificar`, 'error');
      }

      // 5. Inspección de Residuos
      if (this.formatType === 'residuos') {
        if (!this.formData['responsable']?.trim()) return this.presentToast('❌ Seleccione el responsable', 'error');
        if (!this.formData['area_inspeccionada']?.trim()) return this.presentToast('❌ Ingrese el área', 'error');
        const sinVerificarSolidos = this.formData['items_solidos']?.filter((i: any) => !i.verificacion).length || 0;
        const sinVerificarLiquidos = this.formData['items_liquidos']?.filter((i: any) => !i.verificacion).length || 0;
        if (sinVerificarSolidos > 0 || sinVerificarLiquidos > 0) 
          return this.presentToast('❌ Faltan aspectos por verificar', 'error');
      }

      // 6. Control de Plagas
      if (this.formatType === 'plagas') {
        if (!this.formData['responsable']?.trim()) return this.presentToast('❌ Seleccione el responsable', 'error');
        if (!this.formData['area_inspeccionada']?.trim()) return this.presentToast('❌ Ingrese el área', 'error');
        if (!this.formData['jefe_calidad']?.trim()) return this.presentToast('❌ Seleccione el Jefe de Calidad', 'error');
        const sinVerificar = this.formData['items_plagas']?.filter((i: any) => !i.verificacion).length || 0;
        if (sinVerificar > 0) return this.presentToast(`❌ Faltan ${sinVerificar} aspectos por verificar`, 'error');
      }

      // 7. Seguimiento pH y Cloro
      if (this.formatType === 'ph-cloro') {
        if (!this.formData['punto_toma_de']) return this.presentToast('❌ Seleccione el punto de toma', 'error');
        if (this.formData['ph'] === '' || this.formData['ph'] === null || this.formData['ph'] === undefined) 
          return this.presentToast('❌ Ingrese el pH', 'error');
        if (this.formData['cloro'] === '' || this.formData['cloro'] === null || this.formData['cloro'] === undefined) 
          return this.presentToast('❌ Ingrese el cloro', 'error');
      }

      // 8. Devolución de Producto
      if (this.formatType === 'devolucion') {
        if (!this.formData['nombre_producto']?.trim()) return this.presentToast('❌ Ingrese el nombre del producto', 'error');
        if (!this.formData['cantidad']?.trim()) return this.presentToast('❌ Ingrese la cantidad', 'error');
        if (!this.formData['fecha_devolucion']?.trim()) return this.presentToast('❌ Ingrese la fecha de devolución', 'error');
        if (!this.formData['cliente']?.trim()) return this.presentToast('❌ Ingrese el cliente', 'error');
        if (!this.formData['causa_devolucion']) return this.presentToast('❌ Seleccione la causa', 'error');
      }

      // 9. Control de Materia Prima
      if (this.formatType === 'materia-prima') {
        if (!this.formData['operario_responsable']?.trim()) return this.presentToast('❌ Seleccione el operario responsable', 'error');
        if (!this.formData['jefe_calidad']?.trim()) return this.presentToast('❌ Seleccione el jefe de calidad', 'error');
        const itemsMP = this.formData['items_mp'] || [];
        for (let i = 0; i < itemsMP.length; i++) {
          const item = itemsMP[i];
          if (!item.proveedor?.trim()) return this.presentToast(`❌ Faltan datos en el producto ${i + 1} (Proveedor)`, 'error');
          if (!item.producto?.trim()) return this.presentToast(`❌ Faltan datos en el producto ${i + 1} (Producto)`, 'error');
          if (!item.fecha_vencimiento) return this.presentToast(`❌ Faltan datos en el producto ${i + 1} (Fecha Vencimiento)`, 'error');
          if (item.temperatura === '' || item.temperatura === null || item.temperatura === undefined) 
            return this.presentToast(`❌ Faltan datos en el producto ${i + 1} (Temperatura)`, 'error');
          if (!item.aprobado) return this.presentToast(`❌ Faltan datos en el producto ${i + 1} (Aprobado)`, 'error');
        }
      }

      // 10. Registro Temp y HR CC
      if (this.formatType === 'temp-hr') {
        if (!this.formData['jefe_calidad']?.trim()) return this.presentToast(' Seleccione el jefe de calidad', 'error');
        const itemsTempHR = this.formData['items_temp_hr'] || [];
        for (let i = 0; i < itemsTempHR.length; i++) {
          const item = itemsTempHR[i];
          if (!item.hora) return this.presentToast(`❌ Faltan datos en el registro ${i + 1} (Hora)`, 'error');
          if (item.temperatura === '' || item.temperatura === null || item.temperatura === undefined) 
            return this.presentToast(`❌ Faltan datos en el registro ${i + 1} (Temperatura)`, 'error');
          if (item.hr === '' || item.hr === null || item.hr === undefined) 
            return this.presentToast(`❌ Faltan datos en el registro ${i + 1} (Humedad Relativa)`, 'error');
        }
      }

      // ==========================================
      // 2. PROCESO DE GUARDADO
      // ==========================================
      const user = await this.supabaseService.getCurrentUser();
      if (!user) return this.presentToast('Debes iniciar sesión', 'error');

      const checklistData = {
        format_type: this.currentConfig.formatCode,
        establishment: 'Pan del Sur — Planta Principal',
        status: 'pending',
        data: { ...this.formData, date: this.selectedDate },
        created_by: user.id,
        plant_id: '00000000-0000-0000-0000-000000000001',
        updated_at: new Date().toISOString()
      };

      let result: any;
      if (this.isEditing && this.checklistData?.id) {
        result = await this.supabaseService
          .from('checklists')
          .update(checklistData)
          .eq('id', this.checklistData.id)
          .select();
      } else {
        result = await this.supabaseService
          .from('checklists')
          .insert([checklistData])
          .select();
      }

      if (result.error) throw result.error;

      await this.presentToast(
        this.isEditing ? '✅ Registro actualizado' : '✅ Registro guardado exitosamente',
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
      
    } catch (error: any) {
      console.error('Error guardando:', error);
      await this.presentToast('Error: ' + error.message, 'error');
    }
  }

  // ✅ MÉTODO PARA CREAR ALERTAS DE TEMPERATURA
  async crearAlertaTemperatura(parametro: string, valor: number) {
    try {
      const mensaje = parametro === 'horno_1' 
        ? `🚨 Horno 1: ${valor}°C está fuera de rango (120-180°C)`
        : `🚨 Horno 2: ${valor}°C está fuera de rango (120-180°C)`;
      
      console.log('📝 Creando alerta crítica:', {
        parametro,
        valor,
        severity: 'critical'
      });
      
      const { data, error } = await this.supabaseService
        .from('alerts')
        .insert({
          plant_id: '00000000-0000-0000-0000-000000000001',
          checklist_id: this.checklistData?.id || null,
          format_type: 'SGI-FT-01',
          parameter: parametro,
          value: valor,
          min_value: 120,
          max_value: 180,
          severity: 'critical',
          message: mensaje,
          acknowledged: false,
          acknowledged_by: null,
          acknowledged_at: null,
          created_at: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('❌ Error creando alerta de temperatura:', error);
        return false;
      } else {
        console.log('✅ Alerta crítica creada exitosamente:', data);
        
        // Notificar al servicio de notificaciones
        await this.notificationService.getAlerts(15);
        
        return true;
      }
    } catch (error) {
      console.error('❌ Error en crearAlertaTemperatura:', error);
      return false;
    }
  }

  async presentToast(message: string, color: 'success' | 'error' | 'warning') {
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
    
    if (this.formatType === 'higienicas' && this.currentConfig?.itemsEvaluacion) {
      this.formData['items'] = this.currentConfig.itemsEvaluacion.map(() => ({
        cumple: '',
        observaciones: ''
      }));
    }
    
    if (this.formatType === 'residuos' && this.currentConfig?.itemsEvaluacion) {
      this.formData['items_solidos'] = this.getResiduosSolidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
      this.formData['items_liquidos'] = this.getResiduosLiquidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    }
    
    if (this.formatType === 'plagas' && this.currentConfig?.itemsEvaluacion) {
      this.formData['items_plagas'] = this.getPlagasItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    }
    
    if (this.formatType === 'materia-prima') {
      this.formData['items_mp'] = [{
        fecha: this.selectedDate,
        proveedor: '',
        producto: '',
        fecha_vencimiento: '',
        temperatura: '',
        aprobado: '',
        observaciones: ''
      }];
    }
    
    if (this.formatType === 'temp-hr') {
      this.formData['items_temp_hr'] = [{
        fecha: this.selectedDate,
        hora: '',
        temperatura: '',
        hr: '',
        observaciones: ''
      }];
    }
    
    if (this.formatType === 'hornos') {
      this.formData['jornada'] = this.calcularJornada();
    }
    
    this.isEditing = false;
    this.checklistData = null;
  }

  editarRegistro(registro: any) {
    this.checklistData = registro;
    this.formData = { ...registro.data };
    this.isEditing = true;
    
    if (this.formatType === 'higienicas' && !this.formData.items) {
      this.formData.items = this.currentConfig.itemsEvaluacion.map(() => ({
        cumple: '',
        observaciones: ''
      }));
    }
    
    if (this.formatType === 'residuos') {
      if (!this.formData.items_solidos) 
        this.formData.items_solidos = this.getResiduosSolidosItems().map(() => ({
          verificacion: '',
          observaciones: ''
        }));
      if (!this.formData.items_liquidos) 
        this.formData.items_liquidos = this.getResiduosLiquidosItems().map(() => ({
          verificacion: '',
          observaciones: ''
        }));
    }
    
    if (this.formatType === 'plagas' && !this.formData.items_plagas) {
      this.formData.items_plagas = this.getPlagasItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    }
    
    if (this.formatType === 'materia-prima' && !this.formData.items_mp) {
      this.formData.items_mp = registro.data.items_mp || [{
        fecha: this.selectedDate,
        proveedor: '',
        producto: '',
        fecha_vencimiento: '',
        temperatura: '',
        aprobado: '',
        observaciones: ''
      }];
    }
    
    if (this.formatType === 'temp-hr' && !this.formData.items_temp_hr) {
      this.formData.items_temp_hr = registro.data.items_temp_hr || [{
        fecha: this.selectedDate,
        hora: '',
        temperatura: '',
        hr: '',
        observaciones: ''
      }];
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.presentToast('Editando registro', 'success');
  }

  async eliminarRegistro(id: string) {
    const confirm = await this.toastCtrl.create({
      message: '¿Estás seguro de eliminar este registro?',
      duration: 0,
      position: 'top',
      color: 'warning',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              const { error } = await this.supabaseService
                .from('checklists')
                .delete()
                .eq('id', id);

              if (error) throw error;
              await this.presentToast('Registro eliminado', 'success');
              await this.cargarDatosDelDia();
            } catch (error: any) {
              await this.presentToast('Error: ' + error.message, 'error');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  getResiduosSolidosItems(): string[] {
    return this.formatType === 'residuos' ? this.currentConfig.itemsEvaluacion.slice(0, 12) : [];
  }

  getResiduosLiquidosItems(): string[] {
    return this.formatType === 'residuos' ? this.currentConfig.itemsEvaluacion.slice(12) : [];
  }

  getResiduoValue(index: number): string {
    if (!this.formData['items_solidos']) 
      this.formData['items_solidos'] = this.getResiduosSolidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    return this.formData['items_solidos'][index]?.verificacion || '';
  }

  setResiduoValue(index: number, value: string) {
    if (!this.formData['items_solidos']) 
      this.formData['items_solidos'] = this.getResiduosSolidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    this.formData['items_solidos'][index] = {
      ...this.formData['items_solidos'][index],
      verificacion: value
    };
  }

  getResiduoLiquidoValue(index: number): string {
    if (!this.formData['items_liquidos']) 
      this.formData['items_liquidos'] = this.getResiduosLiquidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    return this.formData['items_liquidos'][index]?.verificacion || '';
  }

  setResiduoLiquidoValue(index: number, value: string) {
    if (!this.formData['items_liquidos']) 
      this.formData['items_liquidos'] = this.getResiduosLiquidosItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    this.formData['items_liquidos'][index] = {
      ...this.formData['items_liquidos'][index],
      verificacion: value
    };
  }

  getPlagasItems(): string[] {
    return this.formatType === 'plagas' ? this.currentConfig.itemsEvaluacion : [];
  }

  getPlagasValue(index: number): string {
    if (!this.formData['items_plagas']) 
      this.formData['items_plagas'] = this.getPlagasItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    return this.formData['items_plagas'][index]?.verificacion || '';
  }

  setPlagasValue(index: number, value: string) {
    if (!this.formData['items_plagas']) 
      this.formData['items_plagas'] = this.getPlagasItems().map(() => ({
        verificacion: '',
        observaciones: ''
      }));
    this.formData['items_plagas'][index] = {
      ...this.formData['items_plagas'][index],
      verificacion: value
    };
  }

  getMPItems(): any[] {
    if (!this.formData['items_mp']) {
      this.formData['items_mp'] = [{
        fecha: this.selectedDate,
        proveedor: '',
        producto: '',
        fecha_vencimiento: '',
        temperatura: '',
        aprobado: '',
        observaciones: ''
      }];
    }
    return this.formData['items_mp'];
  }

  getMPValue(index: number): string {
    if (!this.formData['items_mp']) 
      this.formData['items_mp'] = [{
        fecha: this.selectedDate,
        proveedor: '',
        producto: '',
        fecha_vencimiento: '',
        temperatura: '',
        aprobado: '',
        observaciones: ''
      }];
    return this.formData['items_mp'][index]?.aprobado || '';
  }

  setMPValue(index: number, value: string) {
    if (!this.formData['items_mp']) 
      this.formData['items_mp'] = [{
        fecha: this.selectedDate,
        proveedor: '',
        producto: '',
        fecha_vencimiento: '',
        temperatura: '',
        aprobado: '',
        observaciones: ''
      }];
    this.formData['items_mp'][index] = {
      ...this.formData['items_mp'][index],
      aprobado: value
    };
  }

  agregarItemMP() {
    if (!this.formData['items_mp']) this.formData['items_mp'] = [];
    this.formData['items_mp'].push({
      fecha: this.selectedDate,
      proveedor: '',
      producto: '',
      fecha_vencimiento: '',
      temperatura: '',
      aprobado: '',
      observaciones: ''
    });
  }

  getTempHRItems(): any[] {
    if (!this.formData['items_temp_hr']) {
      this.formData['items_temp_hr'] = [{
        fecha: this.selectedDate,
        hora: '',
        temperatura: '',
        hr: '',
        observaciones: ''
      }];
    }
    return this.formData['items_temp_hr'];
  }

  agregarItemTempHR() {
    if (!this.formData['items_temp_hr']) this.formData['items_temp_hr'] = [];
    this.formData['items_temp_hr'].push({
      fecha: this.selectedDate,
      hora: '',
      temperatura: '',
      hr: '',
      observaciones: ''
    });
  }

  async exportarRegistroIndividual(registro: any) {
    let datos: any = {};
    
    if (this.formatType === 'ph-cloro') {
      datos = {
        'Fecha': registro.data?.dia,
        'Punto': registro.data?.punto_toma_de,
        'pH': registro.data?.ph,
        'Cloro': registro.data?.cloro,
        'Observaciones': registro.data?.observaciones
      };
    } else if (this.formatType === 'devolucion') {
      datos = {
        'Fecha': registro.data?.dia,
        'Producto': registro.data?.nombre_producto,
        'Cantidad': registro.data?.cantidad,
        'Fecha Devolucion': registro.data?.fecha_devolucion,
        'Cliente': registro.data?.cliente,
        'Causa': registro.data?.causa_devolucion,
        'Observaciones': registro.data?.observaciones
      };
    } else if (this.formatType === 'materia-prima') {
      datos = {
        'Observaciones': registro.data?.observaciones_generales,
        'Operario': registro.data?.operario_responsable,
        'Jefe Calidad': registro.data?.jefe_calidad
      };
      registro.data?.items_mp?.forEach((item: any, i: number) => {
        datos[`MP ${i+1} Proveedor`] = item.proveedor;
        datos[`MP ${i+1} Producto`] = item.producto;
        datos[`MP ${i+1} Temp`] = item.temperatura;
        datos[`MP ${i+1} Aprobado`] = item.aprobado;
      });
    } else if (this.formatType === 'temp-hr') {
      datos = { 'Jefe Calidad': registro.data?.jefe_calidad };
      registro.data?.items_temp_hr?.forEach((item: any, i: number) => {
        datos[`Reg ${i+1} Hora`] = item.hora;
        datos[`Reg ${i+1} Temp`] = item.temperatura;
        datos[`Reg ${i+1} HR`] = item.hr;
      });
    } else {
      this.currentConfig.fields.forEach((f: any) => {
        datos[f.label] = registro.data?.[f.key] || '';
      });
    }

    const csv = [
      Object.keys(datos).join(','),
      Object.values(datos).map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
    ].join('\n');
    
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${this.formatType}_${registro.data?.dia}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async exportarRegistroIndividualPDF(registro: any) {
    this.presentToast('Exportación PDF en desarrollo', 'warning');
  }

  async exportarTodoExcel() {
    if (this.registrosDelDia.length === 0) {
      return this.presentToast('No hay registros para exportar', 'error');
    }

    try {
      let datos: any[] = [];
      
      if (this.formatType === 'ph-cloro') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Punto': r.data?.punto_toma_de,
          'pH': r.data?.ph,
          'Cloro': r.data?.cloro,
          'Observaciones': r.data?.observaciones
        }));
      } else if (this.formatType === 'devolucion') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Producto': r.data?.nombre_producto,
          'Cantidad': r.data?.cantidad,
          'Fecha Devolucion': r.data?.fecha_devolucion,
          'Cliente': r.data?.cliente,
          'Causa': r.data?.causa_devolucion,
          'Observaciones': r.data?.observaciones
        }));
      } else if (this.formatType === 'materia-prima') {
        datos = this.registrosDelDia.map(r => {
          const row: any = {
            'Fecha': r.data?.dia,
            'Operario': r.data?.operario_responsable,
            'Jefe Calidad': r.data?.jefe_calidad
          };
          r.data?.items_mp?.forEach((item: any, i: number) => {
            row[`MP ${i+1} Proveedor`] = item.proveedor;
            row[`MP ${i+1} Producto`] = item.producto;
            row[`MP ${i+1} Temp`] = item.temperatura;
            row[`MP ${i+1} Aprobado`] = item.aprobado;
          });
          return row;
        });
      } else if (this.formatType === 'temp-hr') {
        datos = this.registrosDelDia.map(r => {
          const row: any = { 'Jefe Calidad': r.data?.jefe_calidad };
          r.data?.items_temp_hr?.forEach((item: any, i: number) => {
            row[`Reg ${i+1} Hora`] = item.hora;
            row[`Reg ${i+1} Temp`] = item.temperatura;
            row[`Reg ${i+1} HR`] = item.hr;
          });
          return row;
        });
      } else if (this.formatType === 'hornos') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Jornada': r.data?.jornada,
          'Horno 1 (°C)': r.data?.horno_1,
          'Horno 2 (°C)': r.data?.horno_2,
          'Responsable': r.data?.responsable,
          'Observaciones': r.data?.observaciones
        }));
      } else if (this.formatType === 'limpiezaydesinfeccion') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Aspecto': r.data?.aspecto_evaluar,
          'Responsable': r.data?.responsable,
          'Actividad': r.data?.actividad,
          'Cantidad': r.data?.cantidad,
          'Concentración': r.data?.concentracion,
          'Frecuencia': r.data?.frecuencia,
          'Observaciones': r.data?.observaciones
        }));
      } else if (this.formatType === 'verificacion') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Aspecto': r.data?.aspecto_evaluar,
          'Responsable': r.data?.responsable,
          'Cumple': r.data?.cumple,
          'Procedimiento': r.data?.procedimiento,
          'Verificado': r.data?.verificado,
          'Observaciones': r.data?.observaciones
        }));
      } else if (this.formatType === 'higienicas') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Nombre Evaluado': r.data?.nombre_evaluado,
          'Responsable Checkeo': r.data?.responsable_checkeo,
          'Cargo': r.data?.cargo,
          'Recomendaciones': r.data?.recomendaciones
        }));
      } else if (this.formatType === 'residuos') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Responsable': r.data?.responsable,
          'Área': r.data?.area_inspeccionada,
          'Observaciones': r.data?.observaciones_generales
        }));
      } else if (this.formatType === 'plagas') {
        datos = this.registrosDelDia.map(r => ({
          'Fecha': r.data?.dia,
          'Responsable': r.data?.responsable,
          'Área': r.data?.area_inspeccionada,
          'Medidas Preventivas': r.data?.medidas_preventivas,
          'Medidas Correctivas': r.data?.medidas_correctivas,
          'Observaciones': r.data?.observaciones
        }));
      }

      const headers = Object.keys(datos[0]);
      const csv = [
        headers.join(','),
        ...datos.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${this.currentConfig?.title}_${this.selectedDate}.csv`;
      link.click();
      
      this.presentToast('✅ Exportado correctamente', 'success');
    } catch (error) {
      console.error('Error exportando:', error);
      this.presentToast('Error al exportar', 'error');
    }
  }

  async exportarTodoPDF() {
    if (this.registrosDelDia.length === 0) {
      return this.presentToast('No hay registros para exportar', 'error');
    }
    await this.presentToast('📄 Función PDF en desarrollo', 'warning');
  }

  getTableColumns(): string[] {
    switch (this.formatType) {
      case 'ph-cloro': return ['Fecha', 'Punto', 'pH', 'Cloro', 'Acciones'];
      case 'devolucion': return ['Fecha', 'Producto', 'Cantidad', 'Cliente', 'Causa', 'Acciones'];
      case 'materia-prima': return ['Fecha', 'Operario', 'Jefe Calidad', 'Acciones'];
      case 'temp-hr': return ['Fecha', 'Jefe Calidad', 'Registros', 'Acciones'];
      case 'hornos': return ['Día', 'Jornada', 'Horno 1', 'Horno 2', 'Acciones'];
      case 'limpiezaydesinfeccion': return ['Día', 'Aspecto', 'Responsable', 'Actividad', 'Acciones'];
      case 'verificacion': return ['Día', 'Aspecto', 'Responsable', 'Cumple', 'Acciones'];
      case 'higienicas': return ['Día', 'Nombre', 'Responsable', 'Acciones'];
      case 'residuos': return ['Día', 'Responsable', 'Área', 'Acciones'];
      case 'plagas': return ['Día', 'Responsable', 'Área', 'Acciones'];
      default: return ['Día', 'Acciones'];
    }
  }

  getCellValue(registro: any, columnName: string): any {
    const data = registro.data || {};
    
    switch (this.formatType) {
      case 'ph-cloro':
        if (columnName === 'Fecha') return data.dia;
        if (columnName === 'Punto') return data.punto_toma_de;
        if (columnName === 'pH') return data.ph;
        if (columnName === 'Cloro') return data.cloro;
        break;
      case 'devolucion':
        if (columnName === 'Fecha') return data.dia;
        if (columnName === 'Producto') return data.nombre_producto;
        if (columnName === 'Cantidad') return data.cantidad;
        if (columnName === 'Cliente') return data.cliente;
        if (columnName === 'Causa') return data.causa_devolucion;
        break;
      case 'materia-prima':
        if (columnName === 'Fecha') return data.dia;
        if (columnName === 'Operario') return data.operario_responsable;
        if (columnName === 'Jefe Calidad') return data.jefe_calidad;
        break;
      case 'temp-hr':
        if (columnName === 'Fecha') return data.dia;
        if (columnName === 'Jefe Calidad') return data.jefe_calidad;
        if (columnName === 'Registros') return data.items_temp_hr?.length || 0;
        break;
      case 'hornos':
        if (columnName === 'Día') return data.dia;
        if (columnName === 'Jornada') return data.jornada;
        if (columnName === 'Horno 1') return data.horno_1 ? `${data.horno_1}°C` : '-';
        if (columnName === 'Horno 2') return data.horno_2 ? `${data.horno_2}°C` : '-';
        break;
      case 'limpiezaydesinfeccion':
        if (columnName === 'Día') return data.dia;
        if (columnName === 'Aspecto') return data.aspecto_evaluar;
        if (columnName === 'Responsable') return data.responsable;
        if (columnName === 'Actividad') return data.actividad;
        break;
      case 'verificacion':
        if (columnName === 'Día') return data.dia;
        if (columnName === 'Aspecto') return data.aspecto_evaluar;
        if (columnName === 'Responsable') return data.responsable;
        if (columnName === 'Cumple') return data.cumple;
        break;
      case 'higienicas':
        if (columnName === 'Día') return data.dia;
        if (columnName === 'Nombre') return data.nombre_evaluado;
        if (columnName === 'Responsable') return data.responsable_checkeo;
        break;
      case 'residuos':
      case 'plagas':
        if (columnName === 'Día') return data.dia;
        if (columnName === 'Responsable') return data.responsable;
        if (columnName === 'Área') return data.area_inspeccionada;
        break;
    }
    return '-';
  }

  isBadgeValue(columnName: string): boolean {
    return ['Actividad', 'Cumple', 'Jornada'].includes(columnName);
  }

  getBadgeColor(columnName: string, value: any): string {
    if (columnName === 'Cumple' || columnName === 'Actividad') {
      return value === 'Si' || value === 'D' ? 'bg-green-100 text-green-700' : 'bg-rose-100 text-rose-700';
    }
    if (columnName === 'Jornada') {
      return value === 'AM' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700';
    }
    return 'bg-blue-100 text-blue-700';
  }
}