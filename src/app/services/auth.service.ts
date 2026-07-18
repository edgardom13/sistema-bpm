import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
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
        name: data.user.user_metadata?.['name'] || 'User',
        role: data.user.user_metadata?.['role'] || 'Supervisor CC'
      }));
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // ✅ CORREGIDO: Ahora acepta plantId para crear el perfil correctamente desde el inicio
  async signUp(email: string, password: string, name: string, role: string, plantId?: string) {
    try {
      console.log('📝 Creando usuario:', { email, name, role, plantId });
      
      const { data: authData, error: authError } = await this.supabaseService.getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
            role: role
          }
        }
      });
      
      if (authError) {
        console.error('❌ Error en Auth:', authError);
        throw authError;
      }
      
      if (!authData.user) {
        throw new Error('No se pudo crear el usuario en Auth');
      }
      
      console.log('✅ Usuario Auth creado:', authData.user.id);
      
      // Verificar si el perfil ya fue creado por un trigger de la base de datos
      const { data: existingProfile } = await this.supabaseService
        .from('user_profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      // Si no existe, crearlo manualmente con el plant_id correcto
      if (!existingProfile) {
        console.log('📝 Creando perfil en user_profiles...');
        const { error: profileError } = await this.supabaseService
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            full_name: name,
            role: role,
            plant_id: plantId || null, // ✅ Aquí usamos el plantId que pasamos
            active: true
          });
        
        if (profileError) {
          console.error('❌ Error creando perfil:', profileError);
          throw profileError; // Lanzamos el error para que EmpleadosPage lo capture
        } else {
          console.log('✅ Perfil creado correctamente');
        }
      }
      
      return { data: authData, error: null };
    } catch (error: any) {
      console.error('❌ Error completo en signUp:', error);
      return { data: null, error };
    }
  }

  async register(email: string, password: string, name?: string) {
    try {
      const { data, error } = await this.supabaseService.getSupabase().auth.signUp({
        email,
        password,
        options: { data: { name } }
      });
      
      if (error) throw error;
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