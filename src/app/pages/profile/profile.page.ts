import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, AlertController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: false
})
export class ProfilePage implements OnInit {
  user: any = null;
  loading = true;
  saving = false;
  changingPassword = false;
  uploadingPhoto = false;
  
  activeTab = 'perfil';
  tabs = [
    { id: 'perfil', name: 'Perfil', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>' },
    { id: 'seguridad', name: 'Seguridad', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>' },
    { id: 'preferencias', name: 'Preferencias', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg>' },
    { id: 'cuenta', name: 'Cuenta', icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>' }
  ];

  profileData = {
    name: '',
    email: '',
    phone: '',
    role: '',
    company: '',
    avatar_url: ''
  };

  passwordData = {
    newPassword: '',
    confirmPassword: ''
  };

  preferences = {
    darkMode: false,
    emailNotifications: true,
    pushNotifications: true
  };

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private authService: AuthService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController
  ) {}

  async ngOnInit() {
    await this.cargarPerfil();
    this.cargarPreferencias();
  }

  async cargarPerfil() {
    try {
      this.loading = true;
      console.log('🔍 Cargando perfil de usuario...');
      
      const user = await this.supabaseService.getCurrentUser();
      console.log('👤 Usuario obtenido:', user);
      
      if (user) {
        this.user = user;
        console.log('✅ User ID:', this.user.id);
        
        this.profileData = {
          name: user.user_metadata?.['name'] || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: user.user_metadata?.['phone'] || '',
          role: user.user_metadata?.['role'] || 'Supervisor CC',
          company: user.user_metadata?.['company'] || 'Pan del Sur',
          avatar_url: user.user_metadata?.['avatar_url'] || ''
        };
        
        console.log('📸 Avatar URL:', this.profileData.avatar_url);
      } else {
        console.error(' No se pudo obtener el usuario');
        await this.showToast('Error: No hay usuario autenticado', 'error');
      }
    } catch (error) {
      console.error('❌ Error cargando perfil:', error);
      await this.showToast('Error al cargar perfil: ' + (error as any).message, 'error');
    } finally {
      this.loading = false;
    }
  }

  cargarPreferencias() {
    this.preferences.darkMode = document.documentElement.classList.contains('dark');
    this.preferences.emailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    this.preferences.pushNotifications = localStorage.getItem('pushNotifications') !== 'false';
  }

  async onProfilePictureUpload(event: any) {
  const file = event.target.files[0];
  
  console.log('📁 Archivo seleccionado:', file);
  console.log('📏 Tamaño del archivo:', file.size, 'bytes (~', (file.size / 1024 / 1024).toFixed(2), 'MB)');
  console.log('👤 User ID actual:', this.user?.id);
  
  if (!file) {
    console.warn('⚠️ No se seleccionó ningún archivo');
    return;
  }
  
  if (!this.user?.id) {
    console.error('❌ No hay user.id disponible');
    await this.showToast('Error: Usuario no cargado. Recarga la página.', 'error');
    return;
  }

  // Aumentar límite a 5MB
  if (file.size > 5 * 1024 * 1024) {
    console.warn('⚠️ Archivo demasiado grande:', file.size);
    await this.showToast('La imagen es demasiado grande. Máximo 5MB.', 'error');
    return;
  }
  
  if (!file.type.startsWith('image/')) {
    console.warn('⚠️ Tipo de archivo inválido:', file.type);
    await this.showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
    return;
  }

  const loading = await this.loadingCtrl.create({
    message: 'Subiendo foto...',
    duration: 15000
  });
  await loading.present();

  try {
    this.uploadingPhoto = true;
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${Date.now()}.${fileExt}`;
    const filePath = `${this.user.id}/${fileName}`;

    console.log('📤 Subiendo a profiles/', filePath);
    console.log(' Supabase service:', this.supabaseService);
    console.log('️ Storage:', this.supabaseService.storage);

    // Verificar que el storage existe
    if (!this.supabaseService.storage) {
      throw new Error('El servicio de Storage no está disponible. Revisa SupabaseService.');
    }

    const { data: uploadData, error: uploadError } = await this.supabaseService.storage
      .from('profiles')
      .upload(filePath, file, { 
        upsert: true,
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Error de subida:', uploadError);
      throw uploadError;
    }

    console.log('✅ Archivo subido exitosamente:', uploadData);

    const { data: urlData } = this.supabaseService.storage
      .from('profiles')
      .getPublicUrl(filePath);

    console.log('🔗 URL pública:', urlData.publicUrl);

    this.profileData.avatar_url = urlData.publicUrl + '?t=' + Date.now();
    
    // Forzar detección de cambios
    setTimeout(() => {
      this.guardarPerfil(true).then(() => {
        console.log('✅ Perfil guardado con nueva foto');
      });
    }, 100);
    
    await this.showToast('Foto de perfil actualizada correctamente', 'success');

  } catch (error: any) {
    console.error('💥 Error completo:', error);
    console.error('Stack trace:', error.stack);
    await this.showToast('Error al subir la foto: ' + (error.message || 'Error desconocido'), 'error');
  } finally {
    this.uploadingPhoto = false;
    await loading.dismiss();
    event.target.value = '';
  }
}

  async removeProfilePicture() {
    const confirm = await this.alertCtrl.create({
      header: 'Eliminar foto',
      message: '¿Estás seguro de eliminar tu foto de perfil?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          handler: async () => {
            try {
              if (this.profileData.avatar_url && this.user?.id) {
                const urlParts = this.profileData.avatar_url.split('/storage/v1/object/public/profiles/');
                if (urlParts.length > 1) {
                  const filePath = urlParts[1].split('?')[0]; // Remover cache buster
                  console.log('🗑️ Eliminando:', filePath);
                  
                  const { error } = await this.supabaseService.storage
                    .from('profiles')
                    .remove([filePath]);
                    
                  if (error) throw error;
                }
              }
              
              this.profileData.avatar_url = '';
              await this.guardarPerfil(true);
              await this.showToast('Foto de perfil eliminada', 'success');
            } catch (error: any) {
              console.error('Error eliminando foto:', error);
              await this.showToast('Error al eliminar: ' + error.message, 'error');
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  async guardarPerfil(silent = false) {
    try {
      this.saving = true;
      console.log(' Guardando perfil...', this.profileData);
      
      const { error } = await this.supabaseService.getSupabase().auth.updateUser({
        data: {
          name: this.profileData.name,
          phone: this.profileData.phone,
          role: this.profileData.role,
          company: this.profileData.company,
          avatar_url: this.profileData.avatar_url.split('?')[0] // Remover cache buster
        }
      });

      if (error) {
        console.error(' Error guardando:', error);
        throw error;
      }

      // Actualizar localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      Object.assign(storedUser, this.profileData);
      localStorage.setItem('user', JSON.stringify(storedUser));

      if (!silent) {
        await this.showToast('Perfil actualizado correctamente', 'success');
      }
      
      // Recargar para asegurar que todo esté sincronizado
      await this.cargarPerfil();
      
    } catch (error: any) {
      console.error('Error guardando perfil:', error);
      if (!silent) {
        await this.showToast('Error al guardar: ' + error.message, 'error');
      }
    } finally {
      this.saving = false;
    }
  }

  async cambiarPassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      return this.showToast('Las contraseñas no coinciden', 'error');
    }
    if (this.passwordData.newPassword.length < 6) {
      return this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
    }

    try {
      this.changingPassword = true;
      const { error } = await this.supabaseService.getSupabase().auth.updateUser({
        password: this.passwordData.newPassword
      });

      if (error) throw error;

      await this.showToast('Contraseña actualizada correctamente', 'success');
      this.passwordData = { newPassword: '', confirmPassword: '' };
    } catch (error: any) {
      await this.showToast('Error: ' + error.message, 'error');
    } finally {
      this.changingPassword = false;
    }
  }

  toggleDarkMode() {
    this.preferences.darkMode = !this.preferences.darkMode;
    if (this.preferences.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', this.preferences.darkMode.toString());
  }

  toggleEmailNotifications() {
    this.preferences.emailNotifications = !this.preferences.emailNotifications;
    localStorage.setItem('emailNotifications', this.preferences.emailNotifications.toString());
  }

  togglePushNotifications() {
    this.preferences.pushNotifications = !this.preferences.pushNotifications;
    localStorage.setItem('pushNotifications', this.preferences.pushNotifications.toString());
  }

  async cerrarSesion() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar Sesión',
      message: '¿Estás seguro que deseas cerrar sesión?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cerrar Sesión',
          role: 'destructive',
          handler: () => this.authService.logout()
        }
      ]
    });
    await alert.present();
  }

  async eliminarCuenta() {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Eliminar Cuenta',
      message: 'Esta acción es irreversible. ¿Estás seguro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => await this.showToast('Función no disponible aún', 'error')
        }
      ]
    });
    await alert.present();
  }

  getInitials(): string {
    const name = this.profileData.name || this.profileData.email || 'U';
    const parts = name.split(' ');
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.substring(0, 2).toUpperCase();
  }

  getMemberSince(): string {
    if (!this.user?.created_at) return 'Reciente';
    return new Date(this.user.created_at).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  }

  async showToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({ message, duration: 3000, position: 'top', color });
    await toast.present();
  }
}