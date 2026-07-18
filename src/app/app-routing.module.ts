import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  // ✅ Ruta por defecto: Redirige al Login
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  
  // ✅ Autenticación
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  
  // ✅ Rutas Principales del Sistema
  {
    path: 'pages/home',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'pages/empleados',
    loadChildren: () => import('./pages/empleados/empleados.module').then(m => m.EmpleadosPageModule)
  },
  {
    path: 'pages/dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule)
  },
  
  // ✅ Formularios Dinámicos (Todos apuntan al mismo módulo)
  {
    path: 'pages/limpiezaydesinfeccion',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/hornos',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/verificacion',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/higienicas',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/residuos',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/plagas',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/ph-cloro',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/devolucion',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/materia-prima',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  {
    path: 'pages/temp-hr',
    loadChildren: () => import('./pages/formulario-dinamico/formulario-dinamico.module').then(m => m.FormularioDinamicoPageModule)
  },
  
  // ✅ Utilidades y Configuración
  {
    path: 'pages/exportar',
    loadChildren: () => import('./pages/exportar/exportar.module').then(m => m.ExportarPageModule)
  },
  {
    path: 'pages/profile',
    loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'pages/settings',
    loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsPageModule)
  },
  
  // ✅ Ruta comodín: Si la URL no existe, redirige al login
  {
    path: '**',
    redirectTo: 'login'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}