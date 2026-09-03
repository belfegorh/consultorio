# Consultorio

Aplicación web y móvil para gestionar citas de un consultorio de psicología. Los pacientes acceden con Google, consultan un calendario mensual y reservan bloques disponibles de 90 minutos. El psicólogo publica su disponibilidad desde un panel protegido por rol.

## Stack

- Ionic 9 + Angular 22
- Firebase Authentication (Google)
- Cloud Firestore
- Firebase Hosting
- Capacitor 8

## Funcionalidades del MVP

- Inicio de sesión con Google.
- Roles `patient` y `psychologist`.
- Calendario mensual de 42 celdas para mostrar meses completos.
- Disponibilidad configurable en bloques consecutivos de 90 minutos.
- Reserva atómica mediante una transacción de Firestore: un horario solo puede asignarse una vez.
- Reglas de seguridad para proteger roles, agenda e información de pacientes.
- Interfaz adaptable a móvil y escritorio.

## Configuración de Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2. En **Authentication > Sign-in method**, habilita Google.
3. Crea una base de datos de Cloud Firestore.
4. Registra una aplicación web y copia su configuración en:
   - `src/environments/environment.ts`
   - `src/environments/environment.prod.ts`
5. Copia `.firebaserc.example` como `.firebaserc` y reemplaza el ID del proyecto.
6. Instala Firebase CLI y publica reglas y aplicación:

```bash
npm install
npm run build
firebase login
firebase deploy --only firestore:rules,hosting
```

## Asignar el rol de psicólogo

El primer ingreso crea el perfil como paciente para impedir que una persona se otorgue privilegios. Después del primer ingreso del psicólogo, abre Firestore en Firebase Console, busca `users/{uid}` y cambia el campo `role` de `patient` a `psychologist`. Cierra y vuelve a iniciar sesión.

## Desarrollo

```bash
npm install
npm start
```

## Colecciones

- `users/{uid}`: perfil y rol.
- `slots/{yyyyMMdd-HHmm}`: bloque disponible o reservado.
- `appointments/{slotId}`: datos privados de la cita confirmada.

Los datos identificables del paciente se guardan en `appointments`, no en los documentos públicos de horarios.
