// =============================================
// SEM Brasil 2026 - Seed Team Members
// Run ONCE from browser console to populate Firestore:
//   seedTeamMembers()
// =============================================

const TEAM_MEMBERS = [
    // Admins (5)
    { name: "Samuel Salazar",    group: "alpha", isAdmin: true },
    { name: "Martin Melguizo",   group: "alpha", isAdmin: true },
    { name: "Sebastian Álvarez", group: "alpha", isAdmin: true },
    { name: "Jeronimo Valencia", group: "alpha", isAdmin: true },
    { name: "Miguel Calle",      group: "alpha", isAdmin: true },
    // Team (10)
    { name: "Mariana Zapata",    group: "alpha", isAdmin: false },
    { name: "Jerioth Restrepo",  group: "beta",  isAdmin: false },
    { name: "Nicolás Gómez",     group: "beta",  isAdmin: false },
    { name: "Isaac Hurtado",     group: "beta",  isAdmin: false },
    { name: "Kevin Acevedo",     group: "beta",  isAdmin: false },
    { name: "Cristian Ramírez",  group: "gamma", isAdmin: false },
    { name: "Felipe Vásquez",    group: "gamma", isAdmin: false },
    { name: "Jorge Duque",       group: "gamma", isAdmin: false },
    { name: "Tomás Herrera",     group: "gamma", isAdmin: false },
    { name: "Juan Manuel Marín", group: "delta", isAdmin: false },
];

const BASE_ACTIVITIES = [
    { date: '2026-08-21', time: '08:00', duration: 90, title: 'Salida Hotel', type: 'hotel_departure', icon: '🏨' },
    { date: '2026-08-21', time: '10:00', duration: 180, title: 'Recepción del carro', type: 'team_activity', icon: '📦' },
    { date: '2026-08-21', time: '13:00', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-21', time: '15:00', duration: 180, title: 'Inspección inicial y descarga', type: 'practice', icon: '🔧' },
    { date: '2026-08-21', time: '19:00', duration: 60, title: 'Reunión interna del día', type: 'meeting', icon: '📋' },

    { date: '2026-08-22', time: '07:30', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-22', time: '08:30', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-22', time: '09:30', duration: 180, title: 'Ensamblaje mecánico', type: 'practice', icon: '🔩' },
    { date: '2026-08-22', time: '13:00', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-22', time: '14:30', duration: 210, title: 'Cableado y validaciones', type: 'practice', icon: '🔌' },
    { date: '2026-08-22', time: '19:00', duration: 45, title: 'Debrief de preparación', type: 'meeting', icon: '🧠' },

    { date: '2026-08-23', time: '07:30', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-23', time: '08:30', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-23', time: '09:30', duration: 180, title: 'Prácticas de pista', type: 'practice', icon: '🛞' },
    { date: '2026-08-23', time: '13:00', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-23', time: '14:30', duration: 150, title: 'Technical Inspection', type: 'competition', icon: '✅' },
    { date: '2026-08-23', time: '18:00', duration: 60, title: 'Reunión estrategia D1', type: 'meeting', icon: '📋' },

    { date: '2026-08-24', time: '07:00', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-24', time: '08:00', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-24', time: '09:00', duration: 150, title: 'Competencia - Stint 1', type: 'competition', icon: '🏎️' },
    { date: '2026-08-24', time: '12:30', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-24', time: '14:00', duration: 150, title: 'Competencia - Stint 2', type: 'competition', icon: '🏁' },
    { date: '2026-08-24', time: '18:00', duration: 60, title: 'Debrief Día 1', type: 'meeting', icon: '📋' },

    { date: '2026-08-25', time: '07:00', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-25', time: '08:00', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-25', time: '09:00', duration: 180, title: 'Competencia - Stint 3', type: 'competition', icon: '🏎️' },
    { date: '2026-08-25', time: '13:00', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-25', time: '14:30', duration: 150, title: 'Ajustes y revisión', type: 'practice', icon: '🔧' },
    { date: '2026-08-25', time: '18:00', duration: 60, title: 'Reunión estrategia D3', type: 'meeting', icon: '🧠' },

    { date: '2026-08-26', time: '07:00', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-26', time: '08:00', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-26', time: '09:00', duration: 150, title: 'Competencia - Stint 4', type: 'competition', icon: '🏎️' },
    { date: '2026-08-26', time: '12:30', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-26', time: '14:00', duration: 180, title: 'Prácticas y calentamiento', type: 'practice', icon: '🛞' },
    { date: '2026-08-26', time: '18:00', duration: 60, title: 'Debrief Día 3', type: 'meeting', icon: '📋' },

    { date: '2026-08-27', time: '07:00', duration: 45, title: 'Desayuno', type: 'meal', icon: '🍽️' },
    { date: '2026-08-27', time: '08:00', duration: 30, title: 'Salida al venue', type: 'venue_departure', icon: '🏁' },
    { date: '2026-08-27', time: '09:00', duration: 180, title: 'Competencia - Final', type: 'competition', icon: '🏁' },
    { date: '2026-08-27', time: '13:00', duration: 60, title: 'Almuerzo', type: 'meal', icon: '🍽️' },
    { date: '2026-08-27', time: '15:00', duration: 120, title: 'Cierre y desmontaje', type: 'team_activity', icon: '📦' },
    { date: '2026-08-27', time: '18:00', duration: 90, title: 'Reunión final del equipo', type: 'meeting', icon: '🎉' }
];

function nameToId(name) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

async function seedTeamMembers() {
    console.log("🌱 Seeding team members...");
    let count = 0;

    for (const member of TEAM_MEMBERS) {
        const id = nameToId(member.name);
        const data = {
            name: member.name,
            group: member.group,
            isAdmin: member.isAdmin,
            role: member.isAdmin ? "Administrador" : "Miembro"
        };

        // Check if already exists
        const existing = await db.collection("members").doc(id).get();
        if (!existing.exists) {
            await db.collection("members").doc(id).set(data);
            console.log(`✅ Created: ${member.name} (${id})`);
            count++;
        } else {
            // Update admin status just in case
            await db.collection("members").doc(id).update({ isAdmin: member.isAdmin });
            console.log(`ℹ️ Already exists: ${member.name}`);
        }
    }

    console.log(`🎉 Done! ${count} new members created. Total: ${TEAM_MEMBERS.length}`);
    console.log("📝 Members can now register at: https://salachooo.github.io/shell-eco-brasil/");
    console.log("👑 Admins can login at: https://salachooo.github.io/shell-eco-brasil/admin.html");
}

function activityToId(activity) {
    const slug = activity.title
        .toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return `${activity.date}_${activity.time}_${slug}`;
}

async function seedActivities() {
    console.log("🌱 Seeding baseline activities...");
    let created = 0;
    let skipped = 0;

    for (const activity of BASE_ACTIVITIES) {
        const docId = activityToId(activity);
        const ref = db.collection("activities").doc(docId);
        const existing = await ref.get();

        if (existing.exists) {
            skipped++;
            continue;
        }

        await ref.set({
            date: activity.date,
            time: activity.time,
            duration: activity.duration,
            title: activity.title,
            description: `Actividad general: ${activity.title}`,
            type: activity.type,
            icon: activity.icon,
            assignments: {},
            personalSubtasks: {},
            completions: {}
        });
        created++;
    }

    console.log(`✅ Activities created: ${created}`);
    console.log(`ℹ️ Activities skipped (already existed): ${skipped}`);
}

async function seedAllData() {
    await seedTeamMembers();
    await seedActivities();
    console.log("🎯 Seed completo finalizado.");
}

// Make it callable from console
window.seedTeamMembers = seedTeamMembers;
window.seedActivities = seedActivities;
window.seedAllData = seedAllData;