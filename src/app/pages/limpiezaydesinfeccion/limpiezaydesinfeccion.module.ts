import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { LimpiezaydesinfeccionPage } from './limpiezaydesinfeccion.page';
import { RouterModule } from '@angular/router';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FormsModule, 
    RouterModule.forChild([
      {
        path: '',
        component: LimpiezaydesinfeccionPage
      }
    ])
  ],
  declarations: [LimpiezaydesinfeccionPage]
})
export class LimpiezaydesinfeccionPageModule {}

