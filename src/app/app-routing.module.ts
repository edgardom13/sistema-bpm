import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then(m => m.LoginPageModule)
  },
  {
    path: 'pages/dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardPageModule)
  },
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
  {
    path: 'exportar',
    loadChildren: () => import('./pages/exportar/exportar.module').then( m => m.ExportarPageModule)
  },
  {
  path: 'pages/exportar',
  loadChildren: () => import('./pages/exportar/exportar.module').then(m => m.ExportarPageModule)
  },
  {
    path: 'profile',
    loadChildren: () => import('./pages/profile/profile.module').then( m => m.ProfilePageModule)
  },
  {
  path: 'pages/profile',
  loadChildren: () => import('./pages/profile/profile.module').then(m => m.ProfilePageModule)
  },
  {
    path: 'register',
    loadChildren: () => import('./pages/register/register.module').then( m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then( m => m.ForgotPasswordPageModule)
  },
  {
    path: 'register',  // ✅ Esta ruta debe existir
    loadChildren: () => import('./pages/register/register.module').then(m => m.RegisterPageModule)
  },
  {
    path: 'forgot-password',  // ✅ Esta ruta debe existir
    loadChildren: () => import('./pages/forgot-password/forgot-password.module').then(m => m.ForgotPasswordPageModule)
  },
  {
    path: 'pages/settings',
    loadChildren: () => import('./pages/settings/settings.module').then(m => m.SettingsPageModule)
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}