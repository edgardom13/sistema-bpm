import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController, LoadingController } from '@ionic/angular';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage implements OnInit {
  loginForm!: FormGroup;
  loading = false;
  showPassword = false;
  errorMessage = '';
  rememberMe = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController
  ) {}

  ngOnInit() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Cargar email guardado si existe
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      this.loginForm.patchValue({ email: savedEmail });
      this.rememberMe = true;
    }
  }

  get f() {
    return this.loginForm.controls;
  }

  async onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    try {
      const { email, password } = this.loginForm.value;
      
      const { data, error } = await this.supabaseService
        .getSupabase()
        .auth
        .signInWithPassword({ email, password });

      if (error) throw error;

      // Guardar sesión
      localStorage.setItem('auth', 'true');
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Manejar "rememberMe"
      if (this.rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      await this.showToast('Bienvenido', 'success');
      this.router.navigate(['/pages/dashboard']);

    } catch (error: any) {
      console.error('Error login:', error);
      
      // Mensajes de error personalizados
      if (error.message?.includes('Invalid login credentials')) {
        this.errorMessage = 'Correo o contraseña incorrectos';
      } else if (error.message?.includes('Email not confirmed')) {
        this.errorMessage = 'Por favor confirma tu correo electrónico';
      } else if (error.message?.includes('Too many requests')) {
        this.errorMessage = 'Demasiados intentos. Espera un momento';
      } else {
        this.errorMessage = error.message || 'Error al iniciar sesión';
      }

      // Solo mostrar toast para errores críticos
      if (error.message?.includes('Too many requests')) {
        await this.showToast(this.errorMessage, 'error');
      }
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

  // Método para limpiar el formulario
  clearForm() {
    this.loginForm.reset();
    this.errorMessage = '';
    this.rememberMe = false;
  }
}