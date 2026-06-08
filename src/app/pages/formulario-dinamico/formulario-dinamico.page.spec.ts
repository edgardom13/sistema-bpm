import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormularioDinamicoPage } from './formulario-dinamico.page';

describe('FormularioDinamicoPage', () => {
  let component: FormularioDinamicoPage;
  let fixture: ComponentFixture<FormularioDinamicoPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FormularioDinamicoPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
