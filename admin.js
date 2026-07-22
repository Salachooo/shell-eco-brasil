// =============================================
// SEM Brasil 2026 - Admin Panel
// =============================================

let adminMembers = [];
let adminClockInterval = null;

// =============================================
// ADMIN LOGIN (simple: check if user is admin in Firestore)
// =============================================

(function checkAdminAutoLogin() {
    const saved = localStorage.getItem('sem2026_admin');
    if (saved === 'true') {
        document.getElementById('adminLoginScreen').classList.remove('active');
        document.getElementById('adminAppScreen').classList.add('active');
        startAdminClock();
        initAdmin();
    }
})();

document.getElementById('adminLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('adminUser').value.trim().toLowerCase();
    const pass = document.getElementById('adminPass').value;
    const loginBtn = document.getElementById('adminLoginBtn');
    const errorEl = document.getElementById('adminLoginError');

    loginBtn.classList.add('loading');
    errorEl.textContent = '';

    try {
        const doc = await db.collection('members').doc(user).get();
        if (doc.exists && doc.data().password === pass && doc.data().isAdmin === true) {
            localStorage.setItem('sem2026_admin', 'true');
            document.getElementById('adminLoginScreen').classList.remove('active');
            document.getElementById('adminAppScreen').classList.add('active');
            document.getElementById('adminName').textContent = doc.data().name || 'Admin';
            startAdminClock();
            initAdmin();
        } else {
            // Check if admin user exists at all
            errorEl.textContent = '❌ Credenciales incorrectas o no eres admin';
        }
    } catch (err) {
        errorEl.textContent = 'Error de conexión. ¿Firestore activado?';
    }
    loginBtn.classList.remove('loading');
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sem2026_admin');
    document.getElementById('adminAppScreen').classList.remove('active');
    document.getElementById('adminLoginScreen').classList.add('active');
    if (adminClockInterval) clearInterval(adminClockInterval);
});

// =============================================
// CLOCK
// =============================================
function startAdminClock() {
    if (adminClockInterval) clearInterval(adminClockInterval);
    updateAdminClock();
    adminClockInterval = setInterval(updateAdminClock, 1000);
}

function updateAdminClock() {
    const now = new Date();
    document.getElementById('adminCurrentTime').textContent = now.toLocaleTimeString('es-CO', {
        timeZone: BRASIL_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    document.getElementById('adminCurrentDate').textContent = now.toLocaleDateString('es-CO', {
        timeZone: BRASIL_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long'
    });
}

// =============================================
// INIT
// =============================================
function initAdmin() {
    setupAdminTabs();
    loadAdminMembers();
    setupDashboardDaySelect();
    setupAssignDaySelect();
    setupEventsDaySelect();
    setupAssignForm();
    setupEventForm();
    setupMemberForm();
}

function setupAdminTabs() {
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'dashboard') refreshDashboard();
            if (tab.dataset.tab === 'assignments') refreshAssignments();
            if (tab.dataset.tab === 'events') refreshEventsList();
            if (tab.dataset.tab === 'members') refreshMembersList();
        });
    });
}

// =============================================
// MEMBERS
// =============================================
function loadAdminMembers() {
    db.collection('members').onSnapshot((snapshot) => {
        adminMembers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            // Hide password from display
            adminMembers.push(data);
        });
        refreshMembersList();
        populateAssignPersonSelect();
        refreshDashboard();
    });
}

function refreshMembersList() {
    const container = document.getElementById('membersListContent');
    if (!adminMembers.length) {
        container.innerHTML = '<p class="text-muted">No hay miembros registrados.</p>';
        return;
    }

    let html = '';
    adminMembers.forEach(m => {
        const isAdmin = m.isAdmin ? '⭐ Admin' : '';
        const registered = m.password ? '✅' : '⏳';
        html += `<div class="member-item">
            <div class="member-item-info">
                <strong>${m.name || m.id} ${isAdmin}</strong>
                <div style="font-size:12px;color:var(--text-muted)">@${m.id} | ${m.role || 'Sin rol'} | ${registered}</div>
            </div>
            <div class="member-item-actions" style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                <select onchange="changeGroup('${m.id}', this.value)" style="width:auto;padding:4px 20px 4px 6px;font-size:11px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">
                    <option value="alpha" ${m.group === 'alpha' ? 'selected' : ''}>Alpha</option>
                    <option value="beta" ${m.group === 'beta' ? 'selected' : ''}>Beta</option>
                    <option value="gamma" ${m.group === 'gamma' ? 'selected' : ''}>Gamma</option>
                    <option value="delta" ${m.group === 'delta' ? 'selected' : ''}>Delta</option>
                </select>
                <button class="btn-icon-small" onclick="toggleAdmin('${m.id}')" title="Admin">⭐</button>
                <button class="btn-icon-small" onclick="deleteMember('${m.id}')" title="Eliminar">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function populateAssignPersonSelect() {
    const select = document.getElementById('assignPerson');
    select.innerHTML = '<option value="">Seleccionar persona...</option>';
    adminMembers.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.name || m.id}</option>`;
    });
}

async function toggleAdmin(id) {
    const doc = await db.collection('members').doc(id).get();
    if (doc.exists) {
        const current = doc.data().isAdmin || false;
        await db.collection('members').doc(id).update({ isAdmin: !current });
    }
}

async function changeGroup(id, group) {
    try {
        await db.collection('members').doc(id).update({ group: group });
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function deleteMember(id) {
    if (!confirm('¿Eliminar este miembro?')) return;
    try {
        await db.collection('members').doc(id).delete();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// =============================================
// MEMBER FORM
// =============================================
document.getElementById('memberForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('memberName').value.trim();
    const user = document.getElementById('memberUser').value.trim().toLowerCase();
    const group = document.getElementById('memberGroup').value;
    const role = document.getElementById('memberRole').value.trim() || 'Miembro';
    const btn = e.target.querySelector('.btn');

    btn.classList.add('loading');

    try {
        const existing = await db.collection('members').doc(user).get();
        if (existing.exists) {
            alert('Ese usuario ya existe');
            btn.classList.remove('loading');
            return;
        }

        await db.collection('members').doc(user).set({
            name: name,
            password: 'eco2026',
            group: group,
            role: role,
            isAdmin: false,
            createdAt: new Date().toISOString()
        });

        document.getElementById('memberForm').reset();
        alert('✅ Miembro creado. Usuario: ' + user + ' / Contraseña: eco2026');
    } catch (err) {
        alert('Error: ' + err.message);
    }
    btn.classList.remove('loading');
});

// =============================================
// DASHBOARD
// =============================================
function setupDashboardDaySelect() {
    document.getElementById('dashboardDaySelect').addEventListener('change', refreshDashboard);
}

function refreshDashboard() {
    const day = document.getElementById('dashboardDaySelect').value;
    const tbody = document.getElementById('dashboardBody');

    if (!adminMembers.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No hay miembros.</td></tr>';
        return;
    }

    db.collection('schedule').doc(day).get().then((doc) => {
        const data = doc.exists ? doc.data() : null;
        const blocks = data ? data.events : [];
        const now = new Date();

        let html = '';
        adminMembers.forEach(member => {
            let currentTask = 'Sin tarea';
            let currentBlock = '—';
            const groupColors = { alpha: '#e74c3c', beta: '#3498db', gamma: '#2ecc71', delta: '#f39c12' };

            for (const block of blocks) {
                if (isBlockActiveNow(block, day, now)) {
                    const a = block.assignments || {};
                    if (a['person_' + member.id]) { currentTask = a['person_' + member.id]; currentBlock = block.title; break; }
                    if (a['group_' + member.group]) { currentTask = a['group_' + member.group]; currentBlock = block.title; break; }
                    if (a['all']) { currentTask = a['all']; currentBlock = block.title; break; }
                }
            }

            const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${groupColors[member.group] || '#666'};margin-right:6px"></span>`;
            html += `<tr>
                <td>${dot}${member.name || member.id} ${member.isAdmin ? '⭐' : ''}</td>
                <td><span style="text-transform:uppercase;font-size:12px;font-weight:600;color:${groupColors[member.group]}">${member.group}</span></td>
                <td>${currentTask}</td>
                <td style="font-size:12px;color:var(--text-muted)">${currentBlock}</td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }).catch(() => {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">Error al cargar.</td></tr>';
    });
}

function isBlockActiveNow(block, day, now) {
    const [h1, m1] = (block.start || '00:00').split(':').map(Number);
    const [h2, m2] = (block.end || '23:59').split(':').map(Number);
    const start = new Date(day + 'T12:00:00'); start.setHours(h1, m1, 0, 0);
    const end = new Date(day + 'T12:00:00'); end.setHours(h2, m2, 0, 0);
    return now.getTime() >= start.getTime() && now.getTime() < end.getTime();
}

// =============================================
// ASSIGNMENTS
// =============================================
function setupAssignDaySelect() {
    document.getElementById('assignDaySelect').addEventListener('change', () => {
        refreshAssignments();
        populateBlockSelect();
    });
}

function populateBlockSelect() {
    const day = document.getElementById('assignDaySelect').value;
    const select = document.getElementById('assignBlock');

    db.collection('schedule').doc(day).get().then((doc) => {
        const blocks = doc.exists ? doc.data().events : getDefaultBlocks(day);
        select.innerHTML = '<option value="">Seleccionar bloque...</option>';
        blocks.forEach(b => {
            select.innerHTML += `<option value="${b.id}">${b.start} - ${b.end} | ${b.title}</option>`;
        });
    });
}

function getDefaultBlocks(day) {
    const isComp = day >= '2026-08-24' && day <= '2026-08-27';
    const titles = isComp ? [
        ['06:30','07:00','Despertar'], ['07:00','07:30','Desayuno'], ['07:30','08:15','Reunión'],
        ['08:15','08:45','Salida'], ['09:00','11:00','Technical Inspection'], ['11:00','12:30','Dynamic Events'],
        ['12:30','13:30','Almuerzo'], ['14:00','17:00','Carreras'], ['17:00','18:30','Tiempo libre'],
        ['18:30','19:30','Cena'], ['20:00','21:00','Reunión']
    ] : [
        ['06:30','07:00','Despertar'], ['07:00','07:30','Desayuno'], ['07:30','08:15','Reunión'],
        ['08:15','08:45','Salida'], ['09:00','11:00','Ensamblaje'], ['11:00','12:30','Preparación técnica'],
        ['12:30','13:30','Almuerzo'], ['14:00','17:00','Pruebas'], ['17:00','18:30','Tiempo libre'],
        ['18:30','19:30','Cena'], ['20:00','21:00','Reunión']
    ];
    return titles.map((t, i) => ({ id: 'block_' + i, start: t[0], end: t[1], title: t[2], icon: '📋', type: 'team', assignments: {} }));
}

function refreshAssignments() {
    const day = document.getElementById('assignDaySelect').value;
    populateBlockSelect();

    db.collection('schedule').doc(day).get().then((doc) => {
        const blocks = doc.exists ? doc.data().events : [];
        const container = document.getElementById('assignListContent');
        if (!blocks.length) { container.innerHTML = '<p class="text-muted">No hay bloques.</p>'; return; }

        let html = '';
        blocks.forEach(block => {
            const entries = Object.entries(block.assignments || {});
            if (!entries.length) return;
            html += `<div style="margin-bottom:8px;padding:8px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)">
                <strong style="font-size:13px;color:var(--accent-primary)">${block.start} - ${block.end}: ${block.title}</strong>`;
            entries.forEach(([key, value]) => {
                let target = key.replace('person_', '👤 ').replace('group_', '👥 Grupo ').replace('all', '👥 Todos');
                html += `<div style="font-size:13px;padding:2px 0">${target}: ${value}</div>`;
            });
            html += `</div>`;
        });
        container.innerHTML = html || '<p class="text-muted">Sin asignaciones.</p>';
    });
}

// =============================================
// ASSIGN FORM
// =============================================
function setupAssignForm() {
    document.getElementById('assignTarget').addEventListener('change', () => {
        document.getElementById('assignPersonGroup').style.display =
            document.getElementById('assignTarget').value === 'individual' ? 'block' : 'none';
    });

    document.getElementById('assignForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const day = document.getElementById('assignDaySelect').value;
        const blockId = document.getElementById('assignBlock').value;
        const target = document.getElementById('assignTarget').value;
        const person = document.getElementById('assignPerson').value;
        const role = document.getElementById('assignRole').value.trim();
        const btn = e.target.querySelector('.btn');

        if (!blockId || !target || !role) { alert('Completa todos los campos'); return; }
        btn.classList.add('loading');

        try {
            const docRef = db.collection('schedule').doc(day);
            const doc = await docRef.get();
            const events = doc.exists ? [...doc.data().events] : getDefaultBlocks(day);
            const idx = events.findIndex(b => b.id === blockId);
            if (idx === -1) { alert('Bloque no encontrado'); btn.classList.remove('loading'); return; }

            const block = { ...events[idx] };
            if (!block.assignments) block.assignments = {};

            let key = target === 'all' ? 'all' : target.startsWith('group_') ? target : 'person_' + person;
            if (target === 'individual' && !person) { alert('Selecciona una persona'); btn.classList.remove('loading'); return; }

            block.assignments[key] = role;
            events[idx] = block;
            await docRef.set({ events }, { merge: true });
            document.getElementById('assignForm').reset();
            document.getElementById('assignPersonGroup').style.display = 'none';
            refreshAssignments();
            alert('✅ Asignación guardada');
        } catch (err) { alert('Error: ' + err.message); }
        btn.classList.remove('loading');
    });
}

// =============================================
// EVENTS
// =============================================
function setupEventsDaySelect() {
    document.getElementById('eventsDaySelect').addEventListener('change', refreshEventsList);
}

function refreshEventsList() {
    const day = document.getElementById('eventsDaySelect').value;
    db.collection('schedule').doc(day).get().then((doc) => {
        const blocks = doc.exists ? doc.data().events : [];
        const container = document.getElementById('eventsListContent');
        if (!blocks.length) { container.innerHTML = '<p class="text-muted">No hay eventos.</p>'; return; }

        let html = '';
        blocks.forEach((block, i) => {
            html += `<div class="event-item">
                <div class="event-item-info">
                    <div><span class="event-item-time">${block.start} - ${block.end}</span> <span>${block.icon || '📋'}</span></div>
                    <div style="font-weight:600">${block.title}</div>
                </div>
                <div class="event-item-actions">
                    <button class="btn-icon-small" onclick="deleteEvent('${day}', ${i})" title="Eliminar">🗑️</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;
    });
}

async function deleteEvent(day, index) {
    if (!confirm('¿Eliminar este evento?')) return;
    const docRef = db.collection('schedule').doc(day);
    const doc = await docRef.get();
    if (doc.exists) {
        const data = doc.data();
        data.events.splice(index, 1);
        await docRef.set(data);
    }
}

document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const day = document.getElementById('eventsDaySelect').value;
    const time = document.getElementById('eventTime').value;
    const title = document.getElementById('eventTitle').value.trim();
    const icon = document.getElementById('eventIcon').value.trim() || '📋';
    const type = document.getElementById('eventType').value;
    const btn = e.target.querySelector('.btn');

    if (!time || !title) { alert('Completa hora y título'); return; }
    btn.classList.add('loading');

    try {
        const docRef = db.collection('schedule').doc(day);
        const doc = await docRef.get();
        const events = doc.exists ? [...doc.data().events] : [];
        const endHour = parseInt(time.split(':')[0]) + 1;
        events.push({ id: 'block_' + Date.now(), start: time, end: String(endHour).padStart(2,'0') + ':' + time.split(':')[1], title, icon, type, assignments: {} });
        events.sort((a, b) => a.start.localeCompare(b.start));
        await docRef.set({ events }, { merge: true });
        document.getElementById('eventForm').reset();
        refreshEventsList();
        alert('✅ Evento agregado');
    } catch (err) { alert('Error: ' + err.message); }
    btn.classList.remove('loading');
});

console.log('SEM Brasil 2026 - Admin Panel loaded');