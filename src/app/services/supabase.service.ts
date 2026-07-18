import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient; // ✅ Solo UNA vez

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.key
    );
  }

  // Getter para exponer el Storage
  get storage() {
    return this.supabase.storage;
  }

  getSupabase(): SupabaseClient {
    return this.supabase;
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({
      email,
      password
    });
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({
      email,
      password
    });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }

  async getCurrentUser() {
    const { data: { user } } = await this.supabase.auth.getUser();
    return user;
  }

  from(table: string) {
    return this.supabase.from(table);
  }

  async insert(table: string, data: any) {
    return await this.supabase.from(table).insert(data);
  }

  async select(table: string, columns = '*') {
    return await this.supabase.from(table).select(columns);
  }

  async update(table: string, data: any, filterColumn: string, filterValue: any) {
    return await this.supabase.from(table).update(data).eq(filterColumn, filterValue);
  }

  async delete(table: string, filterColumn: string, filterValue: any) {
    return await this.supabase.from(table).delete().eq(filterColumn, filterValue);
  }
}