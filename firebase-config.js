// =============================================
// Firebase Configuration - SEM Brasil 2026
// =============================================

const firebaseConfig = {
    apiKey: "AIzaSyCzlVsBPYTzKr3c9Xwhr28DZsrJ2tbqhrE",
    authDomain: "eiaracing.firebaseapp.com",
    projectId: "eiaracing",
    storageBucket: "eiaracing.firebasestorage.app",
    messagingSenderId: "749347545",
    appId: "1:749347545:web:79b1152ed96ed7cbcc94c8",
    measurementId: "G-YBSWJ3PMGM"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// Local development: route Firestore calls to Emulator Suite.
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const forceEmulator = localStorage.getItem('sem2026_use_emulator') === 'true';

if (isLocalHost || forceEmulator) {
    try {
        db.useEmulator('127.0.0.1', 8080);
        console.log('Firestore Emulator enabled at 127.0.0.1:8080');
    } catch (err) {
        console.warn('Firestore Emulator unavailable, using cloud Firestore:', err.message);
    }
}

// Enable offline persistence
db.enablePersistence()
    .catch(function(err) {
        console.warn("Firebase persistence error:", err.code);
    });

// Brasil timezone
const BRASIL_TIMEZONE = 'America/Sao_Paulo';