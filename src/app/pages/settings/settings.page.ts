import { Component, OnInit } from '@angular/core';
import { ConfigService, ThemeConfig } from '../../services/config.service';
import { SupabaseService } from '../../services/supabase.service';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit {
  config!: ThemeConfig;
  presets: { key: string; name: string; color: string }[] = [];
  fontFamilies = ['Inter', 'Roboto', 'Poppins', 'Open Sans', 'Montserrat', 'Lato'];
  
  activeTab = 'marca';
  tabs = [
    { 
      id: 'marca', 
      name: 'Marca e Identidad', 
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>' 
    },
    { 
      id: 'colores', 
      name: 'Colores y Temas', 
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>' 
    },
    { 
      id: 'estilo', 
      name: 'Tipografía y Estilo', 
      icon: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7"/></svg>' 
    }
  ];

  presetNames: { [key: string]: string } = {
    'azul-corporativo': 'Azul Corporativo',
    'verde-esmeralda': 'Verde Esmeralda',
    'naranja-panaderia': 'Naranja Panadería',
    'morado-elegante': 'Morado Elegante',
    'rojo-intenso': 'Rojo Intenso',
    'cyan-moderno': 'Cyan Moderno',
    'rosa-suave': 'Rosa Suave',
    'oscuro-profesional': 'Oscuro Profesional',
    'slate-oscuro': 'Slate Oscuro',
    'marron-calido': 'Marrón Cálido'
  };

  constructor(
    public configService: ConfigService,
    private supabaseService: SupabaseService,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.config = { ...this.configService.getConfig() };
    
    // Asegurar que los nuevos campos existan para evitar errores de TypeScript
    if (!this.config.brandLogo) this.config.brandLogo = '';
    if (!this.config.companyName) this.config.companyName = 'Sistema BPM';
    if (!this.config.establishmentName) this.config.establishmentName = 'Control de Calidad';
    
    const presetConfigs = this.configService.getPresets();
    this.presets = Object.keys(presetConfigs).map(key => ({
      key,
      name: this.presetNames[key] || key,
      color: presetConfigs[key].primaryColor || '#3C50E0'
    }));
  }

  onPresetSelect(presetKey: string) {
    this.configService.applyPreset(presetKey);
    this.config = { ...this.configService.getConfig() };
    this.showToast(`Tema "${this.presetNames[presetKey]}" aplicado`, 'success');
  }

  onColorChange(property: keyof ThemeConfig, value: string) {
    this.configService.updateConfig({ [property]: value } as any);
    this.config = { ...this.configService.getConfig() };
  }

  onNumberChange(property: keyof ThemeConfig, value: number) {
    this.configService.updateConfig({ [property]: value } as any);
    this.config = { ...this.configService.getConfig() };
  }

  onFontChange(fontFamily: string) {
    this.configService.updateConfig({ fontFamily });
    this.config = { ...this.configService.getConfig() };
  }

  setLightMode() {
    this.configService.updateConfig({ darkMode: false });
    this.config = { ...this.configService.getConfig() };
  }

  setDarkMode() {
    this.configService.updateConfig({ darkMode: true });
    this.config = { ...this.configService.getConfig() };
  }

  resetConfig() {
    this.configService.resetToDefault();
    this.config = { ...this.configService.getConfig() };
    this.showToast('Configuración restablecida a valores por defecto', 'success');
  }

  async onLogoUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tamaño (máximo 2MB para Storage)
    if (file.size > 2 * 1024 * 1024) {
      this.showToast('La imagen es demasiado grande. Máximo 2MB.', 'error');
      return;
    }

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      this.showToast('Por favor, selecciona un archivo de imagen válido.', 'error');
      return;
    }

    try {
      this.showToast('Subiendo logo...', 'success');

      // 1. Generar un nombre de archivo único
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      const filePath = `brand/${fileName}`; // Se guardará en la carpeta "brand"

      // 2. Subir a Supabase Storage
      const { error: uploadError } = await this.supabaseService.storage
        .from('logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // 3. Obtener la URL pública
      const { data: urlData } = this.supabaseService.storage
        .from('logos')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // 4. Guardar la URL en la configuración
      this.onColorChange('brandLogo', publicUrl);
      this.showToast('Logo subido y actualizado correctamente', 'success');

    } catch (error: any) {
      console.error('Error subiendo logo:', error);
      this.showToast('Error al subir el logo: ' + error.message, 'error');
    } finally {
      // Limpiar el input para permitir subir la misma imagen nuevamente si se desea
      event.target.value = '';
    }
  }

  async removeLogo() {
    const currentLogo = this.config.brandLogo;
    
    // Si es una URL de Supabase, intentamos borrarla del storage para no dejar archivos huérfanos
    if (currentLogo && currentLogo.includes('/storage/v1/object/public/logos/')) {
      try {
        const urlParts = currentLogo.split('/storage/v1/object/public/logos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await this.supabaseService.storage.from('logos').remove([filePath]);
        }
      } catch (error) {
        console.error('Error eliminando archivo de Supabase:', error);
      }
    }

    // Limpiar la configuración
    this.onColorChange('brandLogo', '');
    this.showToast('Logo eliminado', 'success');
  }

  async showToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      position: 'top',
      color
    });
    await toast.present();
  }
}