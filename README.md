# 🏎️ Shell Eco-marathon Brasil 2026 - Team Schedule App

Aplicación web progresiva (PWA) para gestionar el itinerario y las tareas del equipo durante la Shell Eco-marathon Brasil 2026.

## 🚀 Características

- **Reloj en vivo** con hora de Brasil (BRT)
- **Cronograma por día** del 21 al 27 de agosto
- **Tarea actual** en tiempo real según el bloque horario
- **Countdown** al próximo evento
- **Vista del equipo** con la tarea de cada miembro
- **Panel Admin** para asignar tareas a personas o grupos (Alpha, Beta, Gamma, Delta)
- **Editor de eventos** para personalizar horarios
- **Offline support** (PWA con Service Worker)
- **Modo oscuro/claro**
- **Tiempo real** gracias a Firebase Firestore

## 🛠️ Stack Tecnológico

- **Frontend:** HTML + CSS + JavaScript vanilla (mobile-first)
- **Backend/Database:** Firebase Firestore
- **Auth:** Firebase Authentication
- **Hosting:** GitHub Pages
- **PWA:** Service Worker + Manifest

## 🧪 Rama Experimental Local (con emulador)

Esta guía permite iterar cambios en la rama `experimental` con backend local simulado y luego mergear a `main` sin romper producción.

### 1. Cambiar a rama experimental

```bash
git fetch --all --prune
git switch experimental
git pull
```

### 2. Instalar dependencias de desarrollo

```bash
npm install
```

### 3. Iniciar backend local simulado

```bash
npm run emulators
```

Servicios locales:
- App local: `http://127.0.0.1:5000`
- Firestore Emulator: `127.0.0.1:8081`
- Emulator UI: `http://127.0.0.1:4000`

### 4. Cargar datos semilla

1. Abre `http://127.0.0.1:5000`
2. Abre consola del navegador (F12)
3. Ejecuta `seedAllData()`

### 5. Inicio plug-and-play (Windows, 1 click)

Se incluye un lanzador en el Escritorio:

- `C:\Users\Samuel Salazar\Desktop\SEM-Brasil-Local.bat`

Qué hace:
- Ajusta `PATH` para Node.js en la sesión.
- Configura memoria Node (`NODE_OPTIONS=--max-old-space-size=4096`) para evitar OOM.
- Entra al repo local.
- Corre `npm install` si faltan dependencias.
- Si detecta puertos 5000/8081 ocupados, asume emuladores ya activos y abre la app sin reiniciar servicios.
- Inicia emuladores con `npm run emulators`.
- Abre `http://127.0.0.1:5000` en el navegador.

### 6. Persistir datos del emulador entre sesiones (opcional)

```bash
npm run emulators:persist
```

Esto guarda datos en `.emulator-data/` al cerrar.

### 6. Confirmar modo local vs producción

- En localhost la app conecta a emulador automáticamente.
- En GitHub Pages la app sigue conectando a Firestore cloud.

El switch está implementado en `firebase-config.js` por detección de host local.

### 7. Flujo seguro para merge a main

```bash
git switch experimental
git pull
# desarrollar y commitear
git push

git switch main
git pull
git merge experimental
git push
```

Checklist antes del merge:
- Probar login/app/admin en localhost con emulador.
- Revisar que no haya credenciales nuevas ni cambios peligrosos de producción.
- Verificar que `firebase-config.js` conserva fallback a cloud fuera de localhost.

## 📋 Setup Instructions

### 1. Firebase Setup

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
2. Crea un proyecto nuevo (plan Spark gratuito)
3. Activa **Firestore Database** → Crear base de datos → Modo prueba
4. Activa **Authentication** → Sign-in method → **Email/Password** → Habilitar
5. Ve a Project Settings → General → Tus apps → **Agregar app web**
6. Copia las credenciales y pégalas en `firebase-config.js`

### 2. Configurar firebase-config.js

Edita `firebase-config.js` con tus credenciales de Firebase:

```javascript
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};
```

### 3. Poblar datos iniciales

1. Abre `index.html` en el navegador
2. Abre la consola (F12)
3. Ejecuta: `seedAllData()`
4. Esto creará:
    - Miembros reales del equipo (admins y no admins)
    - Actividades base del 21 al 27 de agosto
    - Estructura lista para asignaciones por persona, grupo, todos o admins

Comandos opcionales:
- `seedTeamMembers()` solo miembros
- `seedActivities()` solo actividades

### 4. Deploy a GitHub Pages

```bash
git init
git add .
git commit -m "Initial commit: SEM Brasil 2026 Team Schedule"
git remote add origin https://github.com/TU_USUARIO/shell-eco-brasil.git
git push -u origin main
```

Luego en GitHub:
1. Ve a Settings → Pages
2. Source: Deploy from branch → main → /root → Save
3. Espera 2 minutos y tu app estará en: `https://TU_USUARIO.github.io/shell-eco-brasil/`

### 5. Accesos

| Rol | Usuario | Contraseña |
|---|---|---|
| Admin | Usuario del miembro con `isAdmin=true` | Se define al registrarse |
| Admin URL | `admin.html` | — |
| Miembros | Usuario generado del nombre (ej: `samuel-salazar`) | Se define al registrarse |
| Miembros URL | `index.html` | — |

## 📱 Uso

### Usuarios (index.html)
- Inician sesión con su usuario y contraseña
- Ven su tarea actual en la tarjeta superior
- Navegan entre días (21-27 ago)
- Ven el cronograma con su rol asignado
- Pueden ver qué hace cada miembro del equipo

### Admin (admin.html)
- Dashboard en vivo con tabla de todo el equipo
- Asignar tareas a individuos o grupos
- Crear/eliminar eventos por día
- Gestionar miembros del equipo

## 📁 Estructura del Proyecto

```
/
├── index.html              # App principal (usuarios)
├── admin.html              # Panel de administración
├── style.css               # Estilos globales
├── app.js                  # Lógica de la app principal
├── admin.js                # Lógica del panel admin
├── firebase-config.js      # Configuración de Firebase
├── manifest.json           # PWA manifest
├── service-worker.js       # Service Worker (offline)
├── seed-data.js            # Script para poblar datos
├── icons/
│   ├── icon-192.png
│   └── icon-512.png
└── README.md
```

## 👥 Grupos de Trabajo

| Grupo | Color | Descripción |
|---|---|---|
| Alpha | 🔴 Rojo | (4 personas) |
| Beta | 🔵 Azul | (4 personas) |
| Gamma | 🟢 Verde | (4 personas) |
| Delta | 🟡 Naranja | (3 personas) |

## 📅 Cronograma

- **21 Ago** - Llegada a Brasil / Recepción del carro
- **22-23 Ago** - Preparación y ensamblaje
- **24-27 Ago** - Competencia
- **28 Ago** - Regreso