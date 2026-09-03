import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AppointmentsService } from '../core/appointments.service';
import { AuthService } from '../core/auth.service';
import { AppUser, AppointmentSlot, CalendarDay } from '../core/models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit, OnDestroy {
  readonly weekdays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  currentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  selectedDate = new Date();
  days: CalendarDay[] = [];
  slots: AppointmentSlot[] = [];
  user: AppUser | null = null;
  loading = true;
  busy = false;
  availability = { date: this.dateInput(new Date()), from: '08:00', to: '17:00' };

  private readonly subscriptions = new Subscription();
  readonly auth = inject(AuthService);
  private readonly appointments = inject(AppointmentsService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private stopWatchingSlots?: () => void;

  ngOnInit(): void {
    this.subscriptions.add(this.auth.user$.subscribe((user) => (this.user = user)));
    this.subscriptions.add(this.auth.loading$.subscribe((loading) => (this.loading = loading)));
    this.subscriptions.add(this.appointments.slots$.subscribe((slots) => { this.slots = slots; this.buildCalendar(); }));
    this.watchCurrentMonth();
  }

  ngOnDestroy(): void { this.subscriptions.unsubscribe(); this.stopWatchingSlots?.(); }
  async login(): Promise<void> { try { await this.auth.loginWithGoogle(); } catch (error) { await this.showError(error); } }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.selectedDate = new Date(this.currentMonth); this.watchCurrentMonth();
  }
  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.selectedDate = new Date(this.currentMonth); this.watchCurrentMonth();
  }
  selectDay(day: CalendarDay): void {
    if (!day.inCurrentMonth) return;
    this.selectedDate = day.date; this.availability.date = this.dateInput(day.date);
  }
  slotsForSelectedDate(): AppointmentSlot[] { return this.slots.filter((slot) => this.sameDay(slot.start.toDate(), this.selectedDate)); }
  availableSlotsForSelectedDate(): AppointmentSlot[] { return this.slotsForSelectedDate().filter((slot) => slot.status === 'available'); }
  isSelected(day: CalendarDay): boolean { return this.sameDay(day.date, this.selectedDate); }

  async confirmBooking(slot: AppointmentSlot): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Confirmar cita',
      message: `${this.longDate(slot.start.toDate())}, de ${this.time(slot.start.toDate())} a ${this.time(slot.end.toDate())}.`,
      buttons: [{ text: 'Cancelar', role: 'cancel' }, { text: 'Reservar', handler: () => this.book(slot) }],
    });
    await alert.present();
  }

  async addAvailability(): Promise<void> {
    this.busy = true;
    try {
      const count = await this.appointments.addAvailability(this.availability.date, this.availability.from, this.availability.to);
      await this.toast(`${count} horario${count === 1 ? '' : 's'} publicado${count === 1 ? '' : 's'}.`);
    } catch (error) { await this.showError(error); } finally { this.busy = false; }
  }
  async removeSlot(slot: AppointmentSlot): Promise<void> {
    try { await this.appointments.removeAvailableSlot(slot); await this.toast('Horario eliminado.'); }
    catch (error) { await this.showError(error); }
  }
  monthTitle(): string {
    const value = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(this.currentMonth);
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
  shortDate(date: Date): string { return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }).format(date); }
  longDate(date: Date): string { return new Intl.DateTimeFormat('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date); }
  time(date: Date): string { return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(date); }

  private watchCurrentMonth(): void { this.stopWatchingSlots?.(); this.stopWatchingSlots = this.appointments.watchMonth(this.currentMonth); this.buildCalendar(); }
  private buildCalendar(): void {
    const year = this.currentMonth.getFullYear(); const month = this.currentMonth.getMonth();
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - firstWeekday); const today = new Date();
    this.days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
      return { date, dayNumber: date.getDate(), inCurrentMonth: date.getMonth() === month, isToday: this.sameDay(date, today), hasAvailability: this.slots.some((slot) => slot.status === 'available' && this.sameDay(slot.start.toDate(), date)) };
    });
  }
  private async book(slot: AppointmentSlot): Promise<void> {
    if (!this.user) return; this.busy = true;
    try { await this.appointments.book(slot, this.user); await this.toast('Tu cita quedó confirmada.'); }
    catch (error) { await this.showError(error); } finally { this.busy = false; }
  }
  private sameDay(a: Date, b: Date): boolean { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
  private dateInput(date: Date): string { const offset = date.getTimezoneOffset(); return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10); }
  private async toast(message: string): Promise<void> { const toast = await this.toasts.create({ message, duration: 2400, position: 'bottom', color: 'success' }); await toast.present(); }
  private async showError(error: unknown): Promise<void> { const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado.'; const alert = await this.alerts.create({ header: 'No fue posible completar la acción', message, buttons: ['Aceptar'] }); await alert.present(); }
}
