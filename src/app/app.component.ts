import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuController } from '@ionic/angular';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from './services/auth.service';
import { SupabaseService } from './services/supabase.service';
import { NotificationService, Alert } from './services/notification.service';

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
  currentDate = '';
  
  // Alertas
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
    public notificationService: NotificationService
  ) {
    this.setupMenuAutoClose();
    this.actualizarFecha();
    
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.verificarAutenticacion();
      });
  }

  async ngOnInit() {
    this.cargarTemaInicial();
    this.verificarAutenticacion();
    await this.cargarInfoUsuario();
  }

  ngOnDestroy() {
    this.limpiarSuscripciones();
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
        
        const nameParts = this.userName.split(' ');
        if (nameParts.length >= 2) {
          this.userInitials = (nameParts[0][0] + nameParts[1][0]).toUpperCase();
        } else {
          this.userInitials = this.userName.substring(0, 2).toUpperCase();
        }

        // Cargar alertas y suscribirse en tiempo real
        await this.cargarAlertas();
        this.suscribirseAlertasTiempoReal();
      }
    } catch (error) {
      console.error('Error cargando info usuario:', error);
    }
  }

  async cargarAlertas() {
    try {
      this.alerts = await this.notificationService.getAlerts(10);
      this.unreadCount = this.alerts.filter(a => !a.acknowledged).length;
    } catch (error) {
      console.error('Error cargando alertas:', error);
      this.alerts = [];
      this.unreadCount = 0;
    }
  }

  private suscribirseAlertasTiempoReal() {
    // Suscribirse a cambios en el BehaviorSubject
    this.alertsSubscription = this.notificationService.alerts$.subscribe(alerts => {
      this.alerts = alerts;
      this.unreadCount = alerts.filter(a => !a.acknowledged).length;
    });

    // Suscribirse a realtime de Supabase
    this.realtimeChannel = this.notificationService.subscribeToAlerts();
  }

  async alertaClic(alert: Alert) {
    // Marcar como reconocida
    if (!alert.acknowledged && this.currentUser) {
      await this.notificationService.acknowledgeAlert(alert.id, this.currentUser.id);
    }

    this.showAlerts = false;

    // Redirigir según el tipo de alerta
    this.redirigirSegunFormato(alert);
  }

  getCurrentDateForUrl(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private redirigirSegunFormato(alert: Alert) {
  const rutas: { [key: string]: string } = {
    'limpiezaydesinfeccion': '/pages/limpiezaydesinfeccion',
    'verificacion': '/pages/verificacion',
    'hornos': '/pages/hornos',
    'higienicas': '/pages/higienicas',
    'residuos': '/pages/residuos',
    'plagas': '/pages/plagas',
    'ph-cloro': '/pages/ph-cloro',
    'devolucion': '/pages/devolucion',
    'materia-prima': '/pages/materia-prima',
    'temp-hr': '/pages/temp-hr'
  };

  const ruta = alert.format_type ? rutas[alert.format_type] : null;
  
  if (ruta) {
    this.router.navigate([ruta]);
  } else if (alert.checklist_id) {
    this.router.navigate(['/pages/limpiezaydesinfeccion']);
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
    
    // Rutas públicas que no requieren autenticación
    const rutasPublicas = ['/login', '/register', '/forgot-password'];
    const esRutaPublica = rutasPublicas.some(ruta => this.router.url.includes(ruta));
    
    if (!this.isLoggedIn && !esRutaPublica) {
      this.router.navigate(['/login']);
    }
    
    // Si está logueado y está en una ruta pública, redirigir al dashboard
    if (this.isLoggedIn && esRutaPublica) {
      this.cargarInfoUsuario();
      this.router.navigate(['/pages/dashboard']);
    }
  }

  cargarTemaInicial() {
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === null) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('darkMode', 'true');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('darkMode', 'false');
      }
    } else {
      if (darkMode === 'true') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }

  toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }

  async logout() {
    try {
      this.limpiarSuscripciones();
      await this.authService.logout();
      this.isLoggedIn = false;
      this.userName = 'Usuario';
      this.userEmail = '';
      this.userInitials = 'U';
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
}