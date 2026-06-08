import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage {
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  loading = false;
  showPassword = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async register() {
    // Validaciones básicas
    if (!this.name || !this.email || !this.password) {
      await this.showToast('Por favor completa todos los campos', 'error');
      return;
    }

    if (this.password !== this.confirmPassword) {
      await this.showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (this.password.length < 6) {
      await this.showToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Creando cuenta...',
      duration: 0
    });
    await loading.present();

    try {
      this.loading = true;
      
      const { data, error } = await this.supabaseService.getSupabase().auth.signUp({
        email: this.email,
        password: this.password,
        options: {
          data: {
            name: this.name,
            role: 'Supervisor CC' // Rol por defecto
          }
        }
      });

      if (error) throw error;

      await loading.dismiss();

      // Supabase por defecto envía email de confirmación
      await this.showToast('✅ Cuenta creada. Revisa tu correo para confirmar.', 'success');
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error registro:', error);
      
      let msg = 'Error al crear cuenta';
      if (error.message.includes('User already registered')) {
        msg = 'Este correo ya está registrado';
      }
      await this.showToast(msg, 'error');
    } finally {
      this.loading = false;
    }
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