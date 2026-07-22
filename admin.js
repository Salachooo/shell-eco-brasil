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
let adminActivities = [];

function initAdmin() {
    setupAdminTabs();
    loadAdminMembers();
    loadAdminActivities();
    setupDashboardDaySelect();
    setupActivitiesDaySelect();
    setupActivityForm();
    setupAssignForm();
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
            if (tab.dataset.tab === 'activities') refreshActivitiesList();
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
// ACTIVITIES COLLECTION
// =============================================
function loadAdminActivities() {
    db.collection('activities').orderBy('date').orderBy('time').onSnapshot((snapshot) => {
        adminActivities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            adminActivities.push(data);
        });
        refreshActivitiesList();
        refreshDashboard();
    });
}

// =============================================
// ACTIVITIES DAY SELECT
// =============================================
function setupActivitiesDaySelect() {
    document.getElementById('activitiesDaySelect').addEventListener('change', () => {
        refreshActivitiesList();
        populateActivitySelect();
    });
}

function populateActivitySelect() {
    const day = document.getElementById('activitiesDaySelect').value;
    const select = document.getElementById('assignActivitySelect');
    const dayActivities = adminActivities.filter(a => a.date === day);

    select.innerHTML = '<option value="">Seleccionar actividad...</option>';
    dayActivities.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.time} - ${a.title}</option>`;
    });

    if (dayActivities.length > 0) {
        select.dispatchEvent(new Event('change'));
    } else {
        document.getElementById('assignFormContainer').style.display = 'none';
        document.getElementById('activityAssignmentsList').innerHTML = '';
    }
}

// =============================================
// ACTIVITY FORM
// =============================================
function setupActivityForm() {
    document.getElementById('activityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('activityDate').value;
        const time = document.getElementById('activityTime').value;
        const duration = parseInt(document.getElementById('activityDuration').value) || 120;
        const title = document.getElementById('activityTitle').value.trim();
        const type = document.getElementById('activityType').value;
        const icon = document.getElementById('activityIcon').value.trim() || '📋';
        const btn = e.target.querySelector('.btn');

        if (!date || !time || !title) { alert('Completa fecha, hora y título'); return; }
        btn.classList.add('loading');

        try {
            await db.collection('activities').add({
                date: date,
                time: time,
                duration: duration,
                title: title,
                type: type,
                icon: icon,
                assignments: {}
            });
            document.getElementById('activityForm').reset();
            document.getElementById('activityDuration').value = 120;
            // Re-set date after reset
            document.getElementById('activityDate').value = document.getElementById('activitiesDaySelect').value;
            alert('✅ Actividad creada');
        } catch (err) { alert('Error: ' + err.message); }
        btn.classList.remove('loading');
    });

    // Set default date to selected day
    const daySelect = document.getElementById('activitiesDaySelect');
    document.getElementById('activityDate').value = daySelect.value;
    daySelect.addEventListener('change', () => {
        document.getElementById('activityDate').value = daySelect.value;
    });
}

// =============================================
// ACTIVITIES LIST
// =============================================
function refreshActivitiesList() {
    const day = document.getElementById('activitiesDaySelect').value;
    const dayActivities = adminActivities.filter(a => a.date === day);
    const container = document.getElementById('activitiesListContent');

    if (!dayActivities.length) {
        container.innerHTML = '<p class="text-muted">No hay actividades para este día.</p>';
        populateActivitySelect();
        return;
    }

    let html = '';
    dayActivities.forEach(activity => {
        const typeIcons = {
            team_activity: '👥', meeting: '📋', competition: '🏁', practice: '🔧',
            meal: '🍽️', free_time: '⏸️', hotel_departure: '🏨', venue_departure: '🏁'
        };
        const assignCount = Object.keys(activity.assignments || {}).length;
        html += `<div class="activity-item" style="margin-bottom:8px;padding:10px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong style="color:var(--accent-primary)">${activity.time} (${activity.duration}min)</strong>
                    <div style="font-weight:600">${activity.icon || typeIcons[activity.type] || '📋'} ${activity.title}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${assignCount} asignaciones</div>
                </div>
                <button class="btn-icon-small" onclick="deleteActivity('${activity.id}')" title="Eliminar">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
    populateActivitySelect();
}

async function deleteActivity(id) {
    if (!confirm('¿Eliminar esta actividad?')) return;
    try {
        await db.collection('activities').doc(id).delete();
    } catch (err) { alert('Error: ' + err.message); }
}

// =============================================
// ASSIGN TO ACTIVITY
// =============================================
function setupAssignForm() {
    const select = document.getElementById('assignActivitySelect');
    select.addEventListener('change', () => {
        const activityId = select.value;
        if (activityId) {
            document.getElementById('assignFormContainer').style.display = 'block';
            renderActivityAssignments(activityId);
        } else {
            document.getElementById('assignFormContainer').style.display = 'none';
        }
    });

    document.getElementById('assignTarget').addEventListener('change', () => {
        document.getElementById('assignPersonGroup').style.display =
            document.getElementById('assignTarget').value === 'individual' ? 'block' : 'none';
    });

    document.getElementById('assignForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const activityId = document.getElementById('assignActivitySelect').value;
        const target = document.getElementById('assignTarget').value;
        const person = document.getElementById('assignPerson').value;
        const role = document.getElementById('assignRole').value.trim();
        const btn = e.target.querySelector('.btn');

        if (!activityId || !target || !role) { alert('Completa todos los campos'); return; }
        btn.classList.add('loading');

        try {
            const docRef = db.collection('activities').doc(activityId);
            const doc = await docRef.get();
            if (!doc.exists) { alert('Actividad no encontrada'); return; }

            const data = doc.data();
            if (!data.assignments) data.assignments = {};

            let key;
            if (target === 'all') key = 'all';
            else if (target === 'admins') key = 'admins';
            else if (target.startsWith('group_')) key = target;
            else if (target === 'individual') {
                if (!person) { alert('Selecciona una persona'); return; }
                key = 'person_' + person;
            }

            data.assignments[key] = role;
            await docRef.update({ assignments: data.assignments });
            document.getElementById('assignForm').reset();
            document.getElementById('assignPersonGroup').style.display = 'none';
            renderActivityAssignments(activityId);
            alert('✅ Asignación guardada');
        } catch (err) { alert('Error: ' + err.message); }
        btn.classList.remove('loading');
    });
}

function renderActivityAssignments(activityId) {
    const activity = adminActivities.find(a => a.id === activityId);
    const container = document.getElementById('activityAssignmentsList');
    if (!activity || !activity.assignments) {
        container.innerHTML = '<p class="text-muted">Sin asignaciones.</p>';
        return;
    }

    const entries = Object.entries(activity.assignments);
    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">Sin asignaciones.</p>';
        return;
    }

    let html = '<div style="display:flex;flex-wrap:gap;gap:6px;flex-direction:column">';
    entries.forEach(([key, value]) => {
        let target = key === 'all' ? '👥 Todos' :
                     key === 'admins' ? '⭐ Admins' :
                     key.startsWith('group_') ? '🅰️ ' + key.replace('group_', '').charAt(0).toUpperCase() + key.replace('group_', '').slice(1) :
                     key.startsWith('person_') ? '👤 ' + key.replace('person_', '') : key;
        html += `<div style="font-size:13px;padding:4px 8px;background:var(--bg-secondary);border-radius:6px">
            <strong>${target}</strong>: ${value}
            <button class="btn-icon-small" onclick="removeAssignment('${activityId}','${key}')" style="float:right;font-size:10px">✖</button>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
}

async function removeAssignment(activityId, key) {
    try {
        const docRef = db.collection('activities').doc(activityId);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            if (data.assignments) {
                delete data.assignments[key];
                await docRef.update({ assignments: data.assignments });
            }
        }
    } catch (err) { alert('Error: ' + err.message); }
}

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

    const dayActivities = adminActivities.filter(a => a.date === day);
    const now = new Date();
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));

    let html = '';
    adminMembers.forEach(member => {
        let currentTask = 'Sin tarea';
        let currentActivity = '—';
        const groupColors = { alpha: '#e74c3c', beta: '#3498db', gamma: '#2ecc71', delta: '#f39c12' };

        for (const activity of dayActivities) {
            const activityStart = parseActivityTime(activity.time, day);
            const activityEnd = new Date(activityStart.getTime() + (activity.duration || 120) * 60000);
            if (nowBrasil.getTime() >= activityStart.getTime() && nowBrasil.getTime() < activityEnd.getTime()) {
                const a = activity.assignments || {};
                if (a['person_' + member.id]) { currentTask = a['person_' + member.id]; currentActivity = activity.title; break; }
                if (a['group_' + member.group]) { currentTask = a['group_' + member.group]; currentActivity = activity.title; break; }
                if (a['all']) { currentTask = a['all']; currentActivity = activity.title; break; }
                if (a['admins'] && member.isAdmin) { currentTask = a['admins']; currentActivity = activity.title; break; }
            }
        }

        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${groupColors[member.group] || '#666'};margin-right:6px"></span>`;
        html += `<tr>
            <td>${dot}${member.name || member.id} ${member.isAdmin ? '⭐' : ''}</td>
            <td><span style="text-transform:uppercase;font-size:12px;font-weight:600;color:${groupColors[member.group]}">${member.group}</span></td>
            <td>${currentTask}</td>
            <td style="font-size:12px;color:var(--text-muted)">${currentActivity}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function parseActivityTime(timeStr, dayStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dayStr + 'T12:00:00');
    d.setHours(h, m, 0, 0);
    return d;
}


console.log('SEM Brasil 2026 - Admin Panel loaded');
