import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { FormularioDinamicoPage } from './formulario-dinamico.page';

const routes: Routes = [
  {
    path: '',
    component: FormularioDinamicoPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class FormularioDinamicoPageRoutingModule {}
