import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService, AppConfig } from '../../services/config.service';
import { ToastController, AlertController } from '@ionic/angular';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false
})
export class SettingsPage implements OnInit, OnDestroy {
  config!: AppConfig;
  private configSubscription?: Subscription;
  
  activeSection = 'appearance';
  saving = false;

  // Opciones
  colorPresets = [
    { name: 'Azul', value: '#3C50E0' },
    { name: 'Verde', value: '#10B981' },
    { name: 'Púrpura', value: '#8B5CF6' },
    { name: 'Naranja', value: '#F59E0B' },
    { name: 'Rojo', value: '#EF4444' },
    { name: 'Rosa', value: '#EC4899' }
  ];

  fontFamilies = [
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'System', value: 'system-ui' }
  ];

  timezones = [
    { name: 'Ciudad de México', value: 'America/Mexico_City' },
    { name: 'Bogotá', value: 'America/Bogota' },
    { name: 'Buenos Aires', value: 'America/Argentina/Buenos_Aires' },
    { name: 'Santiago', value: 'America/Santiago' },
    { name: 'Lima', value: 'America/Lima' }
  ];

  constructor(
    private configService: ConfigService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.configSubscription = this.configService.config$.subscribe(config => {
      this.config = config;
    });
  }

  ngOnDestroy() {
    this.configSubscription?.unsubscribe();
  }

  async updateConfig(partial: Partial<AppConfig>) {
    await this.configService.updateConfig(partial);
  }

  async resetToDefaults() {
    const alert = await this.alertCtrl.create({
      header: 'Restablecer Configuración',
      message: '¿Estás seguro? Se perderán todas tus personalizaciones.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Restablecer',
          role: 'destructive',
          handler: async () => {
            await this.configService.saveConfig(this.configService.getDefaultConfig());
            await this.showToast('Configuración restablecida', 'success');
          }
        }
      ]
    });
    await alert.present();
  }

  async exportConfig() {
    const configJson = JSON.stringify(this.config, null, 2);
    const blob = new Blob([configJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configuracion_bpm_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    await this.showToast('Configuración exportada', 'success');
  }

  async importConfig(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const config = JSON.parse(text);
      await this.configService.saveConfig(config);
      await this.showToast('Configuración importada', 'success');
    } catch (error) {
      await this.showToast('Error al importar configuración', 'error');
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