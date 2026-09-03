import { inject, Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firebaseAuth, firestore } from './firebase';
import { AppUser } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user$ = new BehaviorSubject<AppUser | null>(null);
  readonly loading$ = new BehaviorSubject(true);
  private readonly zone = inject(NgZone);

  constructor() {
    onAuthStateChanged(firebaseAuth, async (user) => {
      const appUser = user ? await this.ensureProfile(user) : null;
      this.zone.run(() => {
        this.user$.next(appUser);
        this.loading$.next(false);
      });
    });
  }

  async loginWithGoogle(): Promise<void> {
    await signInWithPopup(firebaseAuth, new GoogleAuthProvider());
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  }

  private async ensureProfile(user: User): Promise<AppUser> {
    const ref = doc(firestore, 'users', user.uid);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      await setDoc(ref, {
        email: user.email ?? '',
        displayName: user.displayName ?? 'Paciente',
        photoURL: user.photoURL,
        role: 'patient',
        createdAt: serverTimestamp(),
      });
    }

    const profile = (await getDoc(ref)).data()!;
    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: profile['displayName'] ?? user.displayName ?? 'Paciente',
      photoURL: profile['photoURL'] ?? user.photoURL,
      role: profile['role'] === 'psychologist' ? 'psychologist' : 'patient',
    };
  }
}
