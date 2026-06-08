import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { FormularioDinamicoPageRoutingModule } from './formulario-dinamico-routing.module';

import { FormularioDinamicoPage } from './formulario-dinamico.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormularioDinamicoPageRoutingModule
  ],
  declarations: [FormularioDinamicoPage]
})
export class FormularioDinamicoPageModule {}
