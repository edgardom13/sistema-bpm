import { Component, OnInit } from '@angular/core';
import { ConfigService, ThemeConfig } from '../../services/config.service';
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
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.config = { ...this.configService.getConfig() };
    
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
    this.showToast('Configuración restablecida', 'success');
  }

  async showToast(message: string, color: 'success' | 'error') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }
}