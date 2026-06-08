import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController, AlertController } from '@ionic/angular';
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
  
  // Datos editables
  profileData = {
    name: '',
    email: '',
    phone: '',
    role: '',
    company: ''
  };

  // Cambio de contraseña
  passwordData = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  // Preferencias
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
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargarPerfil();
    this.cargarPreferencias();
  }

  async cargarPerfil() {
    try {
      this.loading = true;
      const user = await this.supabaseService.getCurrentUser();
      
      if (user) {
        this.user = user;
        this.profileData = {
          name: user.user_metadata?.['name'] || user.email?.split('@')[0] || '',
          email: user.email || '',
          phone: user.user_metadata?.['phone'] || '',
          role: user.user_metadata?.['role'] || 'Supervisor CC',
          company: user.user_metadata?.['company'] || 'Pan del Sur'
        };
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      await this.showToast('Error al cargar perfil', 'error');
    } finally {
      this.loading = false;
    }
  }

  cargarPreferencias() {
    this.preferences.darkMode = document.documentElement.classList.contains('dark');
    const emailNotif = localStorage.getItem('emailNotifications');
    const pushNotif = localStorage.getItem('pushNotifications');
    this.preferences.emailNotifications = emailNotif !== 'false';
    this.preferences.pushNotifications = pushNotif !== 'false';
  }

  async guardarPerfil() {
    try {
      this.saving = true;
      
      // Actualizar metadata del usuario
      const { error } = await this.supabaseService.getSupabase().auth.updateUser({
        data: {
          name: this.profileData.name,
          phone: this.profileData.phone,
          role: this.profileData.role,
          company: this.profileData.company
        }
      });

      if (error) throw error;

      // Actualizar localStorage
      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      storedUser.name = this.profileData.name;
      storedUser.role = this.profileData.role;
      localStorage.setItem('user', JSON.stringify(storedUser));

      await this.showToast('Perfil actualizado correctamente', 'success');
    } catch (error) {
      console.error('Error guardando perfil:', error);
      await this.showToast('Error al guardar: ' + (error as any).message, 'error');
    } finally {
      this.saving = false;
    }
  }

  async cambiarPassword() {
    if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      await this.showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (this.passwordData.newPassword.length < 6) {
      await this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    try {
      this.changingPassword = true;
      
      const { error } = await this.supabaseService.getSupabase().auth.updateUser({
        password: this.passwordData.newPassword
      });

      if (error) throw error;

      await this.showToast('Contraseña actualizada correctamente', 'success');
      this.passwordData = { currentPassword: '', newPassword: '', confirmPassword: '' };
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      await this.showToast('Error: ' + (error as any).message, 'error');
    } finally {
      this.changingPassword = false;
    }
  }

  toggleDarkMode() {
    this.preferences.darkMode = !this.preferences.darkMode;
    const isDark = this.preferences.darkMode;
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
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
          handler: () => {
            this.authService.logout();
          }
        }
      ]
    });
    await alert.present();
  }

  async eliminarCuenta() {
    const alert = await this.alertCtrl.create({
      header: '⚠️ Eliminar Cuenta',
      message: 'Esta acción es irreversible. Todos tus datos serán eliminados permanentemente. ¿Estás seguro?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            await this.showToast('Función no disponible aún', 'error');
          }
        }
      ]
    });
    await alert.present();
  }

  getInitials(): string {
    const name = this.profileData.name || this.profileData.email || 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getMemberSince(): string {
    if (!this.user?.created_at) return 'Reciente';
    return new Date(this.user.created_at).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long'
    });
  }

  async showToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      position: 'top',
      color
    });
    await toast.present();
  }
}