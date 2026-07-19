import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SupabaseService } from './services/supabase.service';
import { NotificationService, Alert } from './services/notification.service';
import { ConfigService } from './services/config.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn = false;
  userName = 'Usuario';
  userEmail = '';
  userRole = 'Supervisor CC';
  userInitials = 'U';
  userAvatarUrl = '';
  currentDate = '';
  showFormatosControl = false;
  
  brandLogo = '';
  
  alerts: Alert[] = [];
  unreadCount = 0;
  showAlerts = false;
  private currentUser: any = null;
  private alertsSubscription?: Subscription;
  private realtimeChannel: any = null;

  constructor(
    private menuCtrl: MenuController,
    private router: Router,
    private authService: AuthService,
    private supabaseService: SupabaseService,
    public notificationService: NotificationService,
    public configService: ConfigService
  ) {
    this.setupMenuAutoClose();
    this.actualizarFecha();

    this.configService.config$.subscribe((config) => {
      this.brandLogo = config.brandLogo || '';
      setTimeout(() => this.forceSidebarUpdate(), 50);
    });
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.verificarAutenticacion();
      });
  }

  async ngOnInit() {
    this.verificarAutenticacion();
    await this.cargarInfoUsuario();
    // ✅ Iniciar polling SIEMPRE (funciona en Vercel)
  this.notificationService.startPolling();
  
  // ✅ Y también suscribirse a realtime (funciona en localhost)
  this.suscribirseAlertasTiempoReal();
  }

  toggleFormatosControl() {
    this.showFormatosControl = !this.showFormatosControl;
  }

  ngOnDestroy() {
    this.limpiarSuscripciones();
    this.notificationService.stopPolling(); // ✅ Detener polling al salir
  }

  toggleDarkMode() {
    const current = this.configService.getConfig();
    this.configService.updateConfig({ darkMode: !current.darkMode });
  }

  private limpiarSuscripciones() {
    if (this.alertsSubscription) {
      this.alertsSubscription.unsubscribe();
    }
    this.notificationService.unsubscribeFromAlerts();
  }

  async cargarInfoUsuario() {
  try {
    const user = await this.supabaseService.getCurrentUser();
    if (user) {
      this.currentUser = user;
      this.userName = user.user_metadata?.['name'] || user.email?.split('@')[0] || 'Usuario';
      this.userEmail = user.email || '';
      this.userRole = user.user_metadata?.['role'] || 'Supervisor CC';
      this.userAvatarUrl = user.user_metadata?.['avatar_url'] || '';
      
      const nameParts = this.userName.split(' ');
      if (nameParts.length >= 2) {
        this.userInitials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
      } else {
        this.userInitials = this.userName.substring(0, 2).toUpperCase();
      }

      const config = this.configService.getConfig();
      this.brandLogo = config.brandLogo || '';

      await this.cargarAlertas();
      this.suscribirseAlertasTiempoReal();

      // ✅ VERIFICAR FORMULARIOS FALTANTES DEL DÍA
      const hoy = new Date().toISOString().split('T')[0];
      const plantId = '00000000-0000-0000-0000-000000000001';
      
      console.log('🔍 Verificando formularios faltantes para:', hoy);
      await this.notificationService.checkMissingDailyForms(plantId, hoy);
      
      // Recargar alertas después de verificar faltantes
      console.log('🔄 Recargando alertas...');
      await this.cargarAlertas();
    }
  } catch (error) {
    console.error('Error cargando info usuario:', error);
  }
}

  async cargarAlertas() {
    try {
      this.alerts = await this.notificationService.getAlerts(15);
      this.unreadCount = this.alerts.filter(a => !a.acknowledged).length;
    } catch (error) {
      console.error('Error cargando alertas:', error);
      this.alerts = [];
      this.unreadCount = 0;
    }
  }

  private suscribirseAlertasTiempoReal() {
  console.log('🔔 Suscribiéndose a alertas en tiempo real...');
  
  this.alertsSubscription = this.notificationService.alerts$.subscribe(alerts => {
    console.log('📩 Nuevas alertas recibidas:', alerts.length);
    this.alerts = alerts;
    this.unreadCount = alerts.filter(a => !a.acknowledged).length;
    console.log('🔴 Alertas no leídas:', this.unreadCount);
  });
  
  this.realtimeChannel = this.notificationService.subscribeToAlerts();
  console.log('✅ Canal de realtime creado');
}

  // ✅ Al hacer clic en el cuerpo de la alerta: Reconoce y Redirige
  async alertaClic(alert: Alert) {
    if (!alert.acknowledged && this.currentUser) {
      await this.notificationService.acknowledgeAlert(alert.id, this.currentUser.id);
    }
    this.showAlerts = false;
    this.redirigirSegunFormato(alert);
  }

  // ✅ Al hacer clic en la "X": Solo reconoce (cierra) sin redirigir
  async cerrarAlertaSinRedirigir(event: Event, alert: Alert) {
    event.stopPropagation(); // Evita que se dispare alertaClic
    if (!alert.acknowledged && this.currentUser) {
      await this.notificationService.acknowledgeAlert(alert.id, this.currentUser.id);
    }
  }

  getCurrentDateForUrl(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private redirigirSegunFormato(alert: Alert) {
    const routeSlug = this.notificationService.getFormatRoute(alert.format_type);
    
    if (routeSlug) {
      // Redirige al formulario con la fecha de hoy
      this.router.navigate([`/pages/${routeSlug}`], { queryParams: { date: this.getCurrentDateForUrl() } });
    } else {
      this.router.navigate(['/pages/dashboard']);
    }
  }

  async reconocerTodas() {
    if (this.currentUser) {
      await this.notificationService.acknowledgeAllAlerts(this.currentUser.id);
      await this.cargarAlertas();
    }
  }

  toggleAlertas() {
    this.showAlerts = !this.showAlerts;
  }

  actualizarFecha() {
    const hoy = new Date();
    const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' } as const;
    this.currentDate = hoy.toLocaleDateString('es-ES', opciones);
    this.currentDate = this.currentDate.charAt(0).toUpperCase() + this.currentDate.slice(1);
  }

  verificarAutenticacion() {
    const auth = localStorage.getItem('auth');
    this.isLoggedIn = auth === 'true';
    
    const rutasPublicas = ['/login', '/register', '/forgot-password'];
    const esRutaPublica = rutasPublicas.some(ruta => this.router.url.includes(ruta));
    
    if (!this.isLoggedIn && !esRutaPublica) {
      this.router.navigate(['/login']);
    }
    
    if (this.isLoggedIn && esRutaPublica) {
      this.cargarInfoUsuario();
      this.router.navigate(['/pages/home']);
    }
  }

  async logout() {
    try {
      this.limpiarSuscripciones();
      await this.authService.logout();
      this.isLoggedIn = false;
      this.userName = 'Usuario';
      this.userEmail = '';
      this.userInitials = 'U';
      this.userAvatarUrl = '';
      this.brandLogo = '';
      this.alerts = [];
      this.unreadCount = 0;
      this.currentUser = null;
      this.showAlerts = false;
      this.router.navigate(['/login']);
      console.log('✅ Sesión cerrada correctamente');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      localStorage.removeItem('auth');
      localStorage.removeItem('user');
      this.isLoggedIn = false;
      this.router.navigate(['/login']);
    }
  }

  setupMenuAutoClose() {
    document.addEventListener('click', (event: any) => {
      if (event.target.closest('ion-menu nav a') || event.target.closest('ion-menu .px-2 a')) {
        this.menuCtrl.close();
      }
    });
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    return date.toLocaleDateString('es-ES');
  }

  // ✅ MÉTODOS DE HOVER
  onMenuHover(event: MouseEvent, isEnter: boolean) {
    const element = event.currentTarget as HTMLElement;
    if (isEnter) {
      element.style.backgroundColor = 'var(--sidebar-hover)';
      element.style.color = 'var(--color-primary)';
    } else {
      if (!element.classList.contains('active-menu-item')) {
        element.style.backgroundColor = '';
        element.style.color = 'var(--sidebar-text)';
      }
    }
  }

  onHoverColor(event: Event, color: string) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.color = color;
    }
  }

  onLeaveColor(event: Event, defaultColor: string) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.color = defaultColor;
    }
  }

  onHoverBorder(event: Event, color: string) {
    const el = event.currentTarget as HTMLElement;
    if (el) el.style.borderColor = color;
  }

  onLeaveBorder(event: Event, defaultColor: string) {
    const el = event.currentTarget as HTMLElement;
    if (el) el.style.borderColor = defaultColor;
  }

  onHoverBg(event: Event, color: string) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.backgroundColor = color;
    }
  }

  onLeaveBg(event: Event) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.backgroundColor = '';
    }
  }

  onMenuEnter(event: Event) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.backgroundColor = 'var(--sidebar-hover)';
      el.style.color = 'var(--color-primary)';
    }
  }

  onMenuLeave(event: Event) {
    const el = event.currentTarget as HTMLElement;
    if (el && !el.classList.contains('active-menu-item')) {
      el.style.backgroundColor = '';
      el.style.color = 'var(--sidebar-text)';
    }
  }

  forceSidebarUpdate() {
    const menuItems = document.querySelectorAll('nav a[routerLink]');
    menuItems.forEach(link => {
      const el = link as HTMLElement;
      el.style.backgroundColor = '';
      el.style.color = '';
      void el.offsetWidth;
    });
  }
}