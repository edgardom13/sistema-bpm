import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';

interface Empleado {
  id: string;
  nombre: string;
  rol: string;
  firma_type?: string;
  firma_digital?: string;
  email?: string;
  plant_id?: string;
  fecha_registro: string;
}

@Component({
  selector: 'app-empleados',
  templateUrl: './empleados.page.html',
  styleUrls: ['./empleados.page.scss'],
  standalone: false
})
export class EmpleadosPage implements OnInit {
  @ViewChild('firmaCanvas') firmaCanvasRef!: ElementRef<HTMLCanvasElement>;
  
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastX = 0;
  private lastY = 0;
  hasFirmaDigital = false;
  
  empleados: Empleado[] = [];
  formData = {
    nombre: '',
    rol: '',
    firma_type: '',
    firma_digital: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  
  isEditing = false;
  editingId: string | null = null;
  loading = false;
  currentUser: any = null;
  currentPlantId: string = '';

  constructor(
    private supabaseService: SupabaseService,
    private authService: AuthService,
    public toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    await this.cargarUsuarioActual();
    await this.cargarEmpleados();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initCanvas();
    }, 100);
  }

  initCanvas() {
    const canvasElement = document.getElementById('firmaCanvas') as HTMLCanvasElement;
    if (!canvasElement) return;
    
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    
    if (this.canvas && this.ctx) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height || 160;
      
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      this.addCanvasListeners();
    }
  }

  addCanvasListeners() {
    if (!this.canvas) return;
    
    // Eventos de Mouse (Escritorio)
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
    
    // Eventos Táctiles (Móvil) - { passive: false } es CRUCIAL para prevenir el scroll
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
  }

  getCoordinates(event: any): { x: number; y: number } {
    if (!this.canvas) return { x: 0, y: 0 };
    const rect = this.canvas.getBoundingClientRect();
    
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
    }
  }

  startDrawing(event: any) {
    event.preventDefault();
    this.isDrawing = true;
    const coords = this.getCoordinates(event);
    this.lastX = coords.x;
    this.lastY = coords.y;
    
    if (this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
    }
  }

  draw(event: any) {
    if (!this.isDrawing || !this.ctx) return;
    event.preventDefault();
    
    const coords = this.getCoordinates(event);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
    
    this.lastX = coords.x;
    this.lastY = coords.y;
    this.hasFirmaDigital = true;
  }

  handleTouchStart(event: any) {
    event.preventDefault(); // ¡Evita que la página haga scroll!
    this.isDrawing = true;
    const coords = this.getCoordinates(event);
    this.lastX = coords.x;
    this.lastY = coords.y;
    
    if (this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lastX, this.lastY);
    }
  }

  handleTouchMove(event: any) {
    if (!this.isDrawing || !this.ctx) return;
    event.preventDefault(); // ¡Evita que la página haga scroll!
    
    const coords = this.getCoordinates(event);
    this.ctx.lineTo(coords.x, coords.y);
    this.ctx.stroke();
    
    this.lastX = coords.x;
    this.lastY = coords.y;
    this.hasFirmaDigital = true;
  }

  stopDrawing() {
    this.isDrawing = false;
    if (this.ctx) {
      this.ctx.closePath();
    }
  }

  clearFirmaCanvas() {
    if (this.canvas && this.ctx) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.hasFirmaDigital = false;
      this.formData.firma_digital = '';
    }
  }

  saveFirmaCanvas() {
    if (this.canvas) {
      const dataURL = this.canvas.toDataURL('image/png');
      this.formData.firma_digital = dataURL;
      this.presentToast('✅ Firma guardada', 'success');
    }
  }

  onFirmaImageSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        this.presentToast('❌ La imagen no debe superar 2MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.formData.firma_digital = e.target.result;
        this.presentToast('✅ Imagen de firma cargada', 'success');
      };
      reader.readAsDataURL(file);
    }
  }

  removeFirmaImage() {
    this.formData.firma_digital = '';
    this.hasFirmaDigital = false;
    if (this.canvas && this.ctx) {
      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  async cargarUsuarioActual() {
    try {
      this.currentUser = await this.supabaseService.getCurrentUser();
      if (this.currentUser) {
        const { data: profile } = await this.supabaseService
          .from('user_profiles')
          .select('plant_id')
          .eq('id', this.currentUser.id)
          .single();
        
        if (profile) {
          this.currentPlantId = profile.plant_id;
        }
      }
    } catch (error) {
      console.error('Error cargando usuario:', error);
    }
  }

  onRoleChange() {
    if (this.formData.rol !== 'Jefe de Calidad') {
      this.formData.firma_type = '';
      this.formData.firma_digital = '';
    }
    if (this.formData.rol !== 'Administrador' && this.formData.rol !== 'Supervisor CC') {
      this.formData.email = '';
      this.formData.password = '';
      this.formData.confirmPassword = '';
    }
  }

  setFirmaType(type: string) {
    this.formData.firma_type = type;
    if (type === 'digital') {
      setTimeout(() => {
        this.initCanvas();
      }, 100);
    }
  }

  async cargarEmpleados() {
    try {
      this.loading = true;
      let query = this.supabaseService.from('empleados').select('*');
      
      if (this.currentPlantId) {
        query = query.eq('plant_id', this.currentPlantId);
      }
      
      const { data, error } = await query.order('fecha_registro', { ascending: false });

      if (error) throw error;
      this.empleados = data || [];
    } catch (error) {
      console.error('Error cargando empleados:', error);
      this.presentToast('Error al cargar empleados', 'error');
    } finally {
      this.loading = false;
    }
  }

  editarEmpleado(empleado: Empleado) {
    this.formData = {
      nombre: empleado.nombre,
      rol: empleado.rol,
      firma_type: empleado.firma_type || '',
      firma_digital: empleado.firma_digital || '',
      email: empleado.email || '',
      password: '',
      confirmPassword: ''
    };
    this.editingId = empleado.id;
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.presentToast('Editando empleado', 'success');
  }

  async eliminarEmpleado(id: string) {
    const confirm = await this.toastCtrl.create({
      message: '¿Estás seguro de eliminar este empleado?',
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
                .from('empleados')
                .delete()
                .eq('id', id);

              if (error) throw error;
              await this.presentToast('Empleado eliminado', 'success');
              await this.cargarEmpleados();
            } catch (error: any) {
              await this.presentToast('Error: ' + error.message, 'error');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  resetForm() {
    this.formData = {
      nombre: '',
      rol: '',
      firma_type: '',
      firma_digital: '',
      email: '',
      password: '',
      confirmPassword: ''
    };
    this.isEditing = false;
    this.editingId = null;
    this.hasFirmaDigital = false;
  }

  cancelarEdicion() {
    this.resetForm();
  }

  async presentToast(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      cssClass: type,
    });
    await toast.present();
  }

  async guardarEmpleado() {
    // Validaciones básicas
    if (!this.formData.nombre.trim() || !this.formData.rol) {
      return this.presentToast('❌ Complete nombre y rol', 'error');
    }

    // Validaciones para Jefe de Calidad
    if (this.formData.rol === 'Jefe de Calidad') {
      if (!this.formData.firma_type) {
        return this.presentToast('❌ Seleccione tipo de firma', 'error');
      }
      if (!this.formData.firma_digital) {
        return this.presentToast('❌ Debe cargar o dibujar la firma', 'error');
      }
    }

    // Validaciones para Administrador/Supervisor
    if (this.formData.rol === 'Administrador' || this.formData.rol === 'Supervisor CC') {
      if (!this.formData.email.trim()) {
        return this.presentToast('❌ Ingrese el correo electrónico', 'error');
      }
      if (!this.formData.password) {
        return this.presentToast('❌ Ingrese la contraseña', 'error');
      }
      if (this.formData.password.length < 6) {
        return this.presentToast('❌ La contraseña debe tener al menos 6 caracteres', 'error');
      }
      if (this.formData.password !== this.formData.confirmPassword) {
        return this.presentToast('❌ Las contraseñas no coinciden', 'error');
      }
    }

    try {
      if (!this.currentUser) {
        return this.presentToast('Debes iniciar sesión', 'error');
      }

      // 1. Si es Admin/Supervisor, crear usuario en Auth PRIMERO
      if (this.formData.rol === 'Administrador' || this.formData.rol === 'Supervisor CC') {
        const { data: authData, error: authError } = await this.authService.signUp(
          this.formData.email,
          this.formData.password,
          this.formData.nombre,
          this.formData.rol,
          this.currentPlantId // ✅ PASAMOS EL PLANT_ID AQUÍ
        );

        if (authError || !authData?.user) {
          throw new Error(authError?.message || 'No se pudo crear el usuario en el sistema');
        }
        
        console.log('✅ Usuario Auth creado exitosamente:', authData.user.id);
      }

      // 2. Guardar en la tabla empleados
      const empleadoData: any = {
        nombre: this.formData.nombre.trim(),
        rol: this.formData.rol,
        fecha_registro: new Date().toISOString(),
        created_by: this.currentUser.id,
        plant_id: this.currentPlantId // ✅ OBLIGATORIO
      };

      // Agregar datos de firma si es Jefe de Calidad
      if (this.formData.rol === 'Jefe de Calidad') {
        empleadoData.firma_type = this.formData.firma_type;
        empleadoData.firma_digital = this.formData.firma_digital;
      }

      // Agregar email si es Admin/Supervisor
      if (this.formData.rol === 'Administrador' || this.formData.rol === 'Supervisor CC') {
        empleadoData.email = this.formData.email;
      }

      let result;
      if (this.isEditing && this.editingId) {
        result = await this.supabaseService
          .from('empleados')
          .update(empleadoData)
          .eq('id', this.editingId);
      } else {
        result = await this.supabaseService
          .from('empleados')
          .insert([empleadoData]);
      }

      if (result.error) throw result.error;

      await this.presentToast(
        this.isEditing ? '✅ Empleado actualizado' : '✅ Empleado guardado',
        'success'
      );

      this.resetForm();
      await this.cargarEmpleados();

    } catch (error: any) {
      console.error('Error guardando:', error);
      await this.presentToast('Error: ' + (error.message || 'No se pudo guardar'), 'error');
    }
  }
}