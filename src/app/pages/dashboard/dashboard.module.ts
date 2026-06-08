import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DashboardPageRoutingModule } from './dashboard-routing.module';
import { ExportPanelComponent } from '../../components/export-panel/export-panel.component';
import { DashboardPage } from './dashboard.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DashboardPageRoutingModule,
    ExportPanelComponent  // ✅ Agregar aquí como import (no declaration)
  ],
  declarations: [DashboardPage]
})
export class DashboardPageModule {}

