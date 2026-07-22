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
3. Ejecuta: `seedInitialData()`
4. Esto creará:
   - Admin: `admin` / `admin123`
   - 15 usuarios placeholder: `persona1`-`persona15` / `eco2026`
   - Cronograma base para los 7 días

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
| Admin | `admin` | `admin123` |
| Admin URL | `admin.html` | — |
| Miembros | `persona1`-`persona15` | `eco2026` |
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