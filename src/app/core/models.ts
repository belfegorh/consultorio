import { Timestamp } from 'firebase/firestore';

export type UserRole = 'patient' | 'psychologist';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: UserRole;
}

export interface AppointmentSlot {
  id: string;
  start: Timestamp;
  end: Timestamp;
  status: 'available' | 'booked';
  patientId?: string;
  patientName?: string;
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasAvailability: boolean;
}
