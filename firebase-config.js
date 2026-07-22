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

// Enable offline persistence
db.enablePersistence()
    .catch(function(err) {
        console.warn("Firebase persistence error:", err.code);
    });

// Brasil timezone
const BRASIL_TIMEZONE = 'America/Sao_Paulo';