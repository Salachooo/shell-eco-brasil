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

// Make it callable from console
window.seedTeamMembers = seedTeamMembers;