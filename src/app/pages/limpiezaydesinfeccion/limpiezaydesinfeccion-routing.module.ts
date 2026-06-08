import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LimpiezaydesinfeccionPage } from './limpiezaydesinfeccion.page';

const routes: Routes = [
  {
    path: '',
    component: LimpiezaydesinfeccionPage
  },  {
    path: 'formulario',
    loadChildren: () => import('./formulario/formulario.module').then( m => m.FormularioPageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LimpiezaydesinfeccionPageRoutingModule {}
