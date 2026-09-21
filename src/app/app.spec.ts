import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTestI18n } from '../testing/i18n-testing';
import { App } from './app';

describe('App', () => {
  it('creates the root component with the page frame', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTestI18n(),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('header')).not.toBeNull();
    expect(root.querySelector('main#main')).not.toBeNull();
    expect(root.querySelector('footer')).not.toBeNull();
  });
});
