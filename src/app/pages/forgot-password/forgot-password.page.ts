import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage {
  email = '';
  loading = false;
  emailSent = false;

  constructor(
    private router: Router,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  async resetPassword() {
    if (!this.email) {
      await this.showToast('Por favor ingresa tu correo', 'error');
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Enviando enlace...',
      duration: 0
    });
    await loading.present();

    try {
      this.loading = true;
      
      const { error } = await this.supabaseService.getSupabase().auth.resetPasswordForEmail(this.email, {
        redirectTo: window.location.origin + '/login' // O la ruta que prefieras
      });

      if (error) throw error;

      await loading.dismiss();
      this.emailSent = true;

    } catch (error: any) {
      await loading.dismiss();
      console.error('Error reset:', error);
      await this.showToast('Error al enviar el enlace', 'error');
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