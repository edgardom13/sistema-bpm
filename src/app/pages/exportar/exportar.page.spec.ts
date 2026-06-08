import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExportarPage } from './exportar.page';

describe('ExportarPage', () => {
  let component: ExportarPage;
  let fixture: ComponentFixture<ExportarPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExportarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
