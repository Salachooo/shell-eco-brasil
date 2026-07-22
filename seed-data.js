// =============================================
// SEM Brasil 2026 - Seed Data Script
// =============================================
// Run this in the browser console ONCE after
// setting up Firebase to populate initial data.
// =============================================

async function seedInitialData() {
    console.log('🌱 Seeding initial data...');
    
    // 1. Create admin user
    try {
        await auth.createUserWithEmailAndPassword('admin@admin.sem2026', 'admin123');
        console.log('✅ Admin user created: admin / admin123');
    } catch (e) {
        if (e.code === 'auth/email-already-in-use') {
            console.log('ℹ️ Admin user already exists');
        } else {
            console.error('❌ Admin error:', e.message);
        }
    }

    // 2. Create placeholder members
    const placeholderMembers = [
        { id: 'persona1', name: 'Persona 1', group: 'alpha', role: 'Mecánico' },
        { id: 'persona2', name: 'Persona 2', group: 'alpha', role: 'Electrónico' },
        { id: 'persona3', name: 'Persona 3', group: 'alpha', role: 'Mecánico' },
        { id: 'persona4', name: 'Persona 4', group: 'alpha', role: 'Electrónico' },
        { id: 'persona5', name: 'Persona 5', group: 'beta', role: 'Mecánico' },
        { id: 'persona6', name: 'Persona 6', group: 'beta', role: 'Electrónico' },
        { id: 'persona7', name: 'Persona 7', group: 'beta', role: 'Mecánico' },
        { id: 'persona8', name: 'Persona 8', group: 'beta', role: 'Electrónico' },
        { id: 'persona9', name: 'Persona 9', group: 'gamma', role: 'Mecánico' },
        { id: 'persona10', name: 'Persona 10', group: 'gamma', role: 'Electrónico' },
        { id: 'persona11', name: 'Persona 11', group: 'gamma', role: 'Mecánico' },
        { id: 'persona12', name: 'Persona 12', group: 'gamma', role: 'Electrónico' },
        { id: 'persona13', name: 'Persona 13', group: 'delta', role: 'Mecánico' },
        { id: 'persona14', name: 'Persona 14', group: 'delta', role: 'Electrónico' },
        { id: 'persona15', name: 'Persona 15', group: 'delta', role: 'Mecánico' },
    ];

    for (const member of placeholderMembers) {
        try {
            await auth.createUserWithEmailAndPassword(member.id + '@sem2026.team', 'eco2026');
            console.log(`✅ User created: ${member.id} / eco2026`);
        } catch (e) {
            if (e.code !== 'auth/email-already-in-use') {
                console.error(`❌ User error ${member.id}:`, e.message);
            }
        }

        await db.collection('members').doc(member.id).set({
            name: member.name,
            group: member.group,
            role: member.role
        });
        console.log(`✅ Member saved: ${member.name} (${member.group})`);
    }

    // 3. Create schedule for competition days
    const days = [
        '2026-08-21', '2026-08-22', '2026-08-23',
        '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27'
    ];

    for (const day of days) {
        const isComp = day >= '2026-08-24' && day <= '2026-08-27';
        
        const events = isComp ? [
            { id: 'b0', start: '06:30', end: '07:00', title: 'Despertar', icon: '⏰', type: 'team', assignments: { all: 'Prepararse para el día' } },
            { id: 'b1', start: '07:00', end: '07:30', title: 'Desayuno', icon: '🍳', type: 'meal', assignments: { all: 'Desayunar' } },
            { id: 'b2', start: '07:30', end: '08:15', title: 'Reunión de equipo', icon: '📋', type: 'meeting', assignments: { all: 'Asistir a reunión' } },
            { id: 'b3', start: '08:15', end: '08:45', title: 'Salida al venue', icon: '🚌', type: 'travel', assignments: { all: 'Abordar transporte' } },
            { id: 'b4', start: '09:00', end: '11:00', title: 'Technical Inspection', icon: '🔧', type: 'competition' },
            { id: 'b5', start: '11:00', end: '12:30', title: 'Dynamic Events', icon: '🏁', type: 'competition' },
            { id: 'b6', start: '12:30', end: '13:30', title: 'Almuerzo', icon: '🍔', type: 'meal', assignments: { all: 'Almorzar' } },
            { id: 'b7', start: '14:00', end: '17:00', title: 'Carreras', icon: '🏎️', type: 'competition' },
            { id: 'b8', start: '17:00', end: '18:30', title: 'Tiempo libre', icon: '☕', type: 'team' },
            { id: 'b9', start: '18:30', end: '19:30', title: 'Cena', icon: '🍽️', type: 'meal', assignments: { all: 'Cenar' } },
            { id: 'b10', start: '20:00', end: '21:00', title: 'Reunión de cierre', icon: '📋', type: 'meeting', assignments: { all: 'Asistir a reunión' } },
        ] : [
            { id: 'b0', start: '06:30', end: '07:00', title: 'Despertar', icon: '⏰', type: 'team', assignments: { all: 'Prepararse para el día' } },
            { id: 'b1', start: '07:00', end: '07:30', title: 'Desayuno', icon: '🍳', type: 'meal', assignments: { all: 'Desayunar' } },
            { id: 'b2', start: '07:30', end: '08:15', title: 'Reunión de equipo', icon: '📋', type: 'meeting', assignments: { all: 'Asistir a reunión' } },
            { id: 'b3', start: '08:15', end: '08:45', title: 'Salida al venue', icon: '🚌', type: 'travel', assignments: { all: 'Abordar transporte' } },
            { id: 'b4', start: '09:00', end: '11:00', title: 'Ensamblaje del vehículo', icon: '🔧', type: 'team' },
            { id: 'b5', start: '11:00', end: '12:30', title: 'Preparación técnica', icon: '⚙️', type: 'team' },
            { id: 'b6', start: '12:30', end: '13:30', title: 'Almuerzo', icon: '🍔', type: 'meal', assignments: { all: 'Almorzar' } },
            { id: 'b7', start: '14:00', end: '17:00', title: 'Pruebas y ajustes', icon: '🔩', type: 'team' },
            { id: 'b8', start: '17:00', end: '18:30', title: 'Tiempo libre', icon: '☕', type: 'team' },
            { id: 'b9', start: '18:30', end: '19:30', title: 'Cena', icon: '🍽️', type: 'meal', assignments: { all: 'Cenar' } },
            { id: 'b10', start: '20:00', end: '21:00', title: 'Reunión de cierre', icon: '📋', type: 'meeting', assignments: { all: 'Asistir a reunión' } },
        ];

        await db.collection('schedule').doc(day).set({ events });
        console.log(`✅ Schedule saved for ${day}`);
    }

    console.log('🎉 Seed data complete!');
    console.log('Admin: admin / admin123');
    console.log('Users: persona1-15 / eco2026');
}

// =============================================
// setupFirstTime() - Called from the login button
// =============================================
async function setupFirstTime() {
    const btn = document.querySelector('[onclick="setupFirstTime()"]');
    if (btn) {
        btn.textContent = '⏳ Creando datos...';
        btn.disabled = true;
    }
    
    try {
        await seedInitialData();
        if (btn) {
            btn.textContent = '✅ ¡Listo! Ahora inicia sesión';
            btn.style.borderColor = '#2ecc71';
            btn.style.color = '#2ecc71';
        }
        alert('🎉 ¡Datos creados exitosamente!\n\nAdmin: admin / admin123\nUsuarios: persona1 a persona15 / eco2026\n\nYa puedes iniciar sesión.');
    } catch (err) {
        console.error('Error:', err);
        if (btn) {
            btn.textContent = '❌ Error - Intenta de nuevo';
        }
        alert('Error: ' + err.message + '\n\nRevisa la consola (F12) para más detalles.');
    }
}

// Make functions global
window.seedInitialData = seedInitialData;
window.setupFirstTime = setupFirstTime;
