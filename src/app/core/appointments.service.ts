import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { AppUser, AppointmentSlot } from './models';

const SLOT_MINUTES = 90;

@Injectable({ providedIn: 'root' })
export class AppointmentsService {
  readonly slots$ = new BehaviorSubject<AppointmentSlot[]>([]);
  private readonly zone = inject(NgZone);

  watchMonth(month: Date): () => void {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    const slotsQuery = query(
      collection(firestore, 'slots'),
      where('start', '>=', Timestamp.fromDate(start)),
      where('start', '<', Timestamp.fromDate(end)),
    );

    return onSnapshot(slotsQuery, (snapshot) => {
      const slots = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as AppointmentSlot)
        .sort((a, b) => a.start.toMillis() - b.start.toMillis());
      this.zone.run(() => this.slots$.next(slots));
    });
  }

  async addAvailability(date: string, from: string, to: string): Promise<number> {
    const start = new Date(`${date}T${from}:00`);
    const limit = new Date(`${date}T${to}:00`);
    if (!date || !from || !to || start >= limit) {
      throw new Error('El rango de disponibilidad no es válido.');
    }

    const batch = writeBatch(firestore);
    let count = 0;
    for (let cursor = start; cursor.getTime() + SLOT_MINUTES * 60000 <= limit.getTime(); cursor = new Date(cursor.getTime() + SLOT_MINUTES * 60000)) {
      const slotEnd = new Date(cursor.getTime() + SLOT_MINUTES * 60000);
      const id = this.slotId(cursor);
      batch.set(doc(firestore, 'slots', id), {
        start: Timestamp.fromDate(cursor),
        end: Timestamp.fromDate(slotEnd),
        status: 'available',
        createdAt: serverTimestamp(),
      });
      count += 1;
    }
    if (!count) throw new Error('El rango debe contener al menos un bloque de 90 minutos.');
    await batch.commit();
    return count;
  }

  async book(slot: AppointmentSlot, patient: AppUser): Promise<void> {
    const slotRef = doc(firestore, 'slots', slot.id);
    const appointmentRef = doc(firestore, 'appointments', slot.id);
    await runTransaction(firestore, async (transaction) => {
      const current = await transaction.get(slotRef);
      if (!current.exists() || current.data()['status'] !== 'available') {
        throw new Error('Este horario acaba de ser reservado. Elige otro.');
      }
      transaction.update(slotRef, {
        status: 'booked',
        bookedAt: serverTimestamp(),
      });
      transaction.set(appointmentRef, {
        slotId: slot.id,
        patientId: patient.uid,
        patientName: patient.displayName,
        patientEmail: patient.email,
        start: current.data()['start'],
        end: current.data()['end'],
        status: 'confirmed',
        createdAt: serverTimestamp(),
      });
    });
  }

  async removeAvailableSlot(slot: AppointmentSlot): Promise<void> {
    if (slot.status !== 'available') throw new Error('No se puede eliminar un horario reservado.');
    await deleteDoc(doc(firestore, 'slots', slot.id));
  }

  async getMyAppointments(userId: string): Promise<AppointmentSlot[]> {
    const result = await getDocs(query(collection(firestore, 'appointments'), where('patientId', '==', userId)));
    return result.docs.map((item) => ({ id: item.id, ...item.data() }) as AppointmentSlot);
  }

  private slotId(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  }
}
