import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular/lazy';
import { BehaviorSubject } from 'rxjs';

import { HomePage } from './home.page';
import { AuthService } from '../core/auth.service';
import { AppointmentsService } from '../core/appointments.service';

class AuthStub {
  user$ = new BehaviorSubject(null);
  loading$ = new BehaviorSubject(false);
  loginWithGoogle = vi.fn();
  logout = vi.fn();
}

class AppointmentsStub {
  slots$ = new BehaviorSubject([]);
  watchMonth = vi.fn(() => () => undefined);
}

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useClass: AuthStub },
        { provide: AppointmentsService, useClass: AppointmentsStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
