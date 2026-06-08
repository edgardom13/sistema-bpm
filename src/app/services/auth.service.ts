import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service'; // ← Esta línea
import { User } from '@supabase/supabase-js';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private user: User | null = null;

  constructor(
    private supabaseService: SupabaseService,
    private router: Router
  ) {
    this.checkSession();
  }

  private async checkSession() {
    const { data: { session } } = await this.supabaseService.getSupabase().auth.getSession();
    this.user = session?.user ?? null;
  }

  async login(email: string, password: string) {
    try {
      const { data, error } = await this.supabaseService.signIn(email, password);
      
      if (error) throw error;
      
      this.user = data.user;
      localStorage.setItem('auth', 'true');
      localStorage.setItem('user', JSON.stringify({
        email: data.user.email,
        // ✅ DESPUÉS (correcto)
name: data.user.user_metadata?.['name'] || 'User',
role: data.user.user_metadata?.['role'] || 'Supervisor CC'
      }));
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async register(email: string, password: string, name?: string) {
    try {
      const { data, error } = await this.supabaseService.signUp(email, password);
      
      if (error) throw error;
      
      // Si se proporciona un nombre, actualizar metadata
      if (name && data.user) {
        await this.supabaseService.getSupabase().auth.updateUser({
          data: { name }
        });
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async logout() {
    await this.supabaseService.signOut();
    localStorage.removeItem('auth');
    localStorage.removeItem('user');
    this.user = null;
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    return localStorage.getItem('auth') === 'true';
  }

  getCurrentUser(): User | null {
    return this.user;
  }
}