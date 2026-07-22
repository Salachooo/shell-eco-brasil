// =============================================
// SEM Brasil 2026 - Admin Panel
// =============================================

let adminMembers = [];
let adminClockInterval = null;
const SCHEDULE_DAYS = ['2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26','2026-08-27'];
let selectedPersonId = null;

function getBrasilTodayISO() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BRASIL_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function getDefaultScheduleDay() {
    const today = getBrasilTodayISO();
    if (today <= SCHEDULE_DAYS[0]) return SCHEDULE_DAYS[0];
    if (today >= SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1]) return SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1];
    for (const day of SCHEDULE_DAYS) {
        if (day >= today) return day;
    }
    return SCHEDULE_DAYS[0];
}

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
    setupSubtaskForm();
    setupMemberForm();

    const defaultDay = getDefaultScheduleDay();
    document.getElementById('dashboardDaySelect').value = defaultDay;
    document.getElementById('activitiesDaySelect').value = defaultDay;
    document.getElementById('activityDate').value = defaultDay;
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
            if (tab.dataset.tab === 'people') renderPeopleSelector();
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
        renderPeopleSelector();
        refreshDashboard();
    });
}

function refreshMembersList() {
    const container = document.getElementById('membersListContent');
    if (!adminMembers.length) {
        container.innerHTML = '<p class="text-muted">No hay miembros registrados.</p>';
        return;
    }

    const groups = ['alpha', 'beta', 'gamma', 'delta'];
    const labels = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma', delta: 'Delta' };
    const day = document.getElementById('dashboardDaySelect').value;
    const groupedMembers = {
        alpha: adminMembers.filter(m => m.group === 'alpha'),
        beta: adminMembers.filter(m => m.group === 'beta'),
        gamma: adminMembers.filter(m => m.group === 'gamma'),
        delta: adminMembers.filter(m => m.group === 'delta')
    };

    let html = '';
    groups.forEach(group => {
        html += `<div style="margin:12px 0 8px;font-weight:700;color:var(--text-secondary)">🧩 ${labels[group]} (${groupedMembers[group].length})</div>`;

        if (!groupedMembers[group].length) {
            html += '<p class="text-muted" style="margin-bottom:10px">Sin miembros en este grupo.</p>';
            return;
        }

        groupedMembers[group].forEach(m => {
            const isAdmin = m.isAdmin ? '⭐ Admin' : '';
            const registered = m.password ? '✅' : '⏳';
            const taskText = getMemberTaskForDay(m, day);
            html += `<div class="member-item">
                <div class="member-item-info">
                    <strong>${m.name || m.id} ${isAdmin}</strong>
                    <div style="font-size:12px;color:var(--text-muted)">@${m.id} | ${m.role || 'Sin rol'} | ${registered}</div>
                    <div style="font-size:12px;color:var(--accent-primary);margin-top:2px">Ahora: ${taskText}</div>
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
    });

    container.innerHTML = html;
}

function getMemberTaskForDay(member, day) {
    const now = new Date();
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const dayActivities = adminActivities.filter(a => a.date === day);

    for (const activity of dayActivities) {
        const start = parseActivityTime(activity.time, day);
        const end = new Date(start.getTime() + (activity.duration || 120) * 60000);
        if (nowBrasil.getTime() < start.getTime() || nowBrasil.getTime() >= end.getTime()) continue;

        const a = activity.assignments || {};
        if (a['person_' + member.id]) return `${a['person_' + member.id]} (${activity.title})`;
        if (a['group_' + member.group]) return `${a['group_' + member.group]} (${activity.title})`;
        if (a['admins'] && member.isAdmin) return `${a['admins']} (${activity.title})`;
        if (a['all']) return `${a['all']} (${activity.title})`;
    }

    return 'Sin tarea activa';
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
function setupMemberForm() {
    const form = document.getElementById('memberForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    form.addEventListener('submit', async (e) => {
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
}

// =============================================
// ACTIVITIES COLLECTION
// =============================================
function loadAdminActivities() {
    db.collection('activities').onSnapshot((snapshot) => {
        adminActivities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data || !data.date || !data.time || !data.title) return;
            data.id = doc.id;
            if (!data.assignments || typeof data.assignments !== 'object') data.assignments = {};
            adminActivities.push(data);
        });

        adminActivities.sort((a, b) => {
            const da = `${a.date} ${a.time}`;
            const dbs = `${b.date} ${b.time}`;
            return da.localeCompare(dbs);
        });

        refreshActivitiesList();
        refreshDashboard();
        refreshMembersList();
        if (selectedPersonId) renderPersonWeeklyDetail(selectedPersonId);
    }, (err) => {
        console.error('Error loading activities:', err);
        document.getElementById('activitiesListContent').innerHTML =
            '<p class="text-muted">Error al cargar actividades. Revisa Firestore y recarga.</p>';
        document.getElementById('assignActivitySelect').innerHTML =
            '<option value="">Error al cargar actividades</option>';
        document.getElementById('dashboardBody').innerHTML =
            '<tr><td colspan="4" class="loading-row">Error al cargar actividades.</td></tr>';
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
    const subtaskSelect = document.getElementById('subtaskActivitySelect');
    const dayActivities = adminActivities.filter(a => a.date === day);

    select.innerHTML = '<option value="">Seleccionar actividad...</option>';
    if (subtaskSelect) subtaskSelect.innerHTML = '<option value="">Seleccionar actividad...</option>';
    dayActivities.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.time} - ${a.title}</option>`;
        if (subtaskSelect) subtaskSelect.innerHTML += `<option value="${a.id}">${a.time} - ${a.title}</option>`;
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
        const description = document.getElementById('activityDescription').value.trim();
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
                description: description,
                type: type,
                icon: icon,
                assignments: {},
                personalSubtasks: {},
                completions: {}
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
    const selectedSubtaskActivity = document.getElementById('subtaskActivitySelect').value;
    if (selectedSubtaskActivity) {
        populateSubtaskPersonSelect();
        renderSubtasksList(selectedSubtaskActivity);
    }
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
            document.getElementById('subtaskActivitySelect').value = activityId;
            populateSubtaskPersonSelect();
            renderSubtasksList(activityId);
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

function setupSubtaskForm() {
    const form = document.getElementById('subtaskForm');
    if (!form || form.dataset.bound === 'true') return;
    form.dataset.bound = 'true';

    const activitySelect = document.getElementById('subtaskActivitySelect');
    activitySelect.addEventListener('change', () => {
        populateSubtaskPersonSelect();
        renderSubtasksList(activitySelect.value);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const activityId = document.getElementById('subtaskActivitySelect').value;
        const personId = document.getElementById('subtaskPersonSelect').value;
        const text = document.getElementById('subtaskText').value.trim();

        if (!activityId || !personId || !text) {
            alert('Completa actividad, persona y subtarea.');
            return;
        }

        try {
            const ref = db.collection('activities').doc(activityId);
            const doc = await ref.get();
            if (!doc.exists) return;

            const data = doc.data();
            if (!data.personalSubtasks || typeof data.personalSubtasks !== 'object') data.personalSubtasks = {};

            if (data.personalSubtasks[personId]) {
                alert('Esta persona ya tiene subtarea en la actividad seleccionada.');
                return;
            }

            data.personalSubtasks[personId] = text;
            await ref.update({ personalSubtasks: data.personalSubtasks });
            document.getElementById('subtaskText').value = '';
            populateSubtaskPersonSelect();
            renderSubtasksList(activityId);
        } catch (err) {
            alert('Error guardando subtarea: ' + err.message);
        }
    });
}

function populateSubtaskPersonSelect() {
    const activityId = document.getElementById('subtaskActivitySelect').value;
    const select = document.getElementById('subtaskPersonSelect');
    select.innerHTML = '<option value="">Seleccionar persona...</option>';

    if (!activityId) return;
    const activity = adminActivities.find(a => a.id === activityId);
    if (!activity) return;

    const used = new Set(Object.keys(activity.personalSubtasks || {}));
    const preferredGroup = getPreferredGroupForActivity(activity);

    const primary = adminMembers.filter(m => m.group === preferredGroup && !used.has(m.id));
    const rest = adminMembers.filter(m => m.group !== preferredGroup && !used.has(m.id));

    if (primary.length) {
        const optPrimary = document.createElement('optgroup');
        optPrimary.label = `Grupo ${preferredGroup ? preferredGroup.toUpperCase() : 'principal'}`;
        primary.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name || m.id} (${m.group.toUpperCase()})`;
            optPrimary.appendChild(opt);
        });
        select.appendChild(optPrimary);
    }

    if (primary.length && rest.length) {
        const sep = document.createElement('optgroup');
        sep.label = '-------';
        select.appendChild(sep);
    }

    if (rest.length) {
        const optRest = document.createElement('optgroup');
        optRest.label = 'Otros miembros';
        rest.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name || m.id} (${m.group.toUpperCase()})`;
            optRest.appendChild(opt);
        });
        select.appendChild(optRest);
    }
}

function getPreferredGroupForActivity(activity) {
    const assignments = activity.assignments || {};
    const groupKey = Object.keys(assignments).find(k => k.startsWith('group_'));
    if (!groupKey) return null;
    return groupKey.replace('group_', '');
}

function renderSubtasksList(activityId) {
    const container = document.getElementById('subtasksList');
    if (!activityId) {
        container.innerHTML = '<p class="text-muted">Selecciona una actividad para ver subtareas.</p>';
        return;
    }

    const activity = adminActivities.find(a => a.id === activityId);
    const subtasks = activity && activity.personalSubtasks ? activity.personalSubtasks : {};
    const entries = Object.entries(subtasks);

    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">Sin subtareas personales.</p>';
        return;
    }

    let html = '';
    entries.forEach(([memberId, text]) => {
        const member = adminMembers.find(m => m.id === memberId);
        const name = member ? member.name : memberId;
        html += `<div class="assign-item">
            <div class="assign-item-info">
                <strong>👤 ${name}</strong>
                <div style="font-size:12px;color:var(--text-secondary)">${text}</div>
            </div>
            <button class="btn-icon-small" onclick="removeSubtask('${activityId}','${memberId}')" title="Eliminar subtarea">🗑️</button>
        </div>`;
    });
    container.innerHTML = html;
}

async function removeSubtask(activityId, memberId) {
    try {
        const ref = db.collection('activities').doc(activityId);
        const doc = await ref.get();
        if (!doc.exists) return;

        const data = doc.data();
        const map = data.personalSubtasks || {};
        delete map[memberId];
        await ref.update({ personalSubtasks: map });
        populateSubtaskPersonSelect();
        renderSubtasksList(activityId);
    } catch (err) {
        alert('Error eliminando subtarea: ' + err.message);
    }
}

// =============================================
// DASHBOARD
// =============================================
function setupDashboardDaySelect() {
    document.getElementById('dashboardDaySelect').addEventListener('change', () => {
        refreshDashboard();
        refreshMembersList();
    });
}

function refreshDashboard() {
    const day = document.getElementById('dashboardDaySelect').value;
    const tbody = document.getElementById('dashboardBody');
    const summaryCards = document.getElementById('dashboardSummaryCards');

    if (!adminMembers.length) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading-row">No hay miembros.</td></tr>';
        if (summaryCards) summaryCards.innerHTML = '';
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

    if (summaryCards) {
        const stats = calculateDayCompletionStats(day);
        summaryCards.innerHTML = `
            <div class="summary-card"><span class="summary-label">Personas</span><strong>${adminMembers.length}</strong></div>
            <div class="summary-card"><span class="summary-label">Actividades</span><strong>${dayActivities.length}</strong></div>
            <div class="summary-card"><span class="summary-label">Cumplimiento</span><strong>${stats.percent}%</strong><small>${stats.completed}/${stats.total}</small></div>
        `;
    }
}

function renderPeopleSelector() {
    const container = document.getElementById('peopleSelector');
    if (!container) return;

    if (!adminMembers.length) {
        container.innerHTML = '<p class="text-muted">No hay miembros para mostrar.</p>';
        return;
    }

    let html = '';
    adminMembers.forEach(member => {
        const activeClass = selectedPersonId === member.id ? 'active' : '';
        html += `<button class="person-chip ${activeClass}" onclick="renderPersonWeeklyDetail('${member.id}')">${member.name || member.id}</button>`;
    });
    container.innerHTML = html;

    if (!selectedPersonId && adminMembers[0]) {
        renderPersonWeeklyDetail(adminMembers[0].id);
    }
}

function renderPersonWeeklyDetail(memberId) {
    selectedPersonId = memberId;
    renderPeopleSelector();

    const detail = document.getElementById('personWeeklyDetail');
    const member = adminMembers.find(m => m.id === memberId);
    if (!detail || !member) return;

    const weekly = calculateWeeklyProgress(member);
    let activitiesHtml = '';

    SCHEDULE_DAYS.forEach(day => {
        const dayActivities = adminActivities.filter(a => a.date === day);
        let rows = '';
        dayActivities.forEach(activity => {
            const assignment = getMemberAssignmentForActivity(member, activity);
            const personalSubtask = activity.personalSubtasks && activity.personalSubtasks[member.id];
            if (!assignment && !personalSubtask) return;

            const comp = activity.completions || {};
            const taskDone = !!(comp['task_person_' + member.id] && comp['task_person_' + member.id].completed);
            const subtaskDone = !!(comp['subtask_person_' + member.id] && comp['subtask_person_' + member.id].completed);
            rows += `<div class="weekly-row">
                <div><strong>${activity.time}</strong> - ${activity.title}</div>
                <div class="weekly-meta">${assignment ? 'Task: ' + assignment : ''}${personalSubtask ? ' | Subtask: ' + personalSubtask : ''}</div>
                <div class="weekly-meta">${taskDone ? '✅ task' : '⏳ task'}${personalSubtask ? (subtaskDone ? ' • ✅ subtask' : ' • ⏳ subtask') : ''}</div>
            </div>`;
        });

        if (!rows) rows = '<div class="weekly-row empty">Sin tareas asignadas.</div>';
        activitiesHtml += `<div class="weekly-day-block"><h4>${day}</h4>${rows}</div>`;
    });

    detail.innerHTML = `
        <div class="person-summary-head">
            <h3>${member.name || member.id}</h3>
            <div class="weekly-meta">Grupo ${member.group.toUpperCase()} ${member.isAdmin ? '• Admin' : ''}</div>
            <div class="progress-bar"><span style="width:${weekly.percent}%"></span></div>
            <div class="weekly-meta">Cumplimiento semanal: ${weekly.percent}% (${weekly.completed}/${weekly.total})</div>
        </div>
        <div class="weekly-activities">${activitiesHtml}</div>
    `;
}

function calculateWeeklyProgress(member) {
    let total = 0;
    let completed = 0;

    adminActivities.forEach(activity => {
        const assignment = getMemberAssignmentForActivity(member, activity);
        const personalSubtask = activity.personalSubtasks && activity.personalSubtasks[member.id];
        const comp = activity.completions || {};

        if (assignment) {
            total++;
            if (comp['task_person_' + member.id] && comp['task_person_' + member.id].completed) completed++;
        }
        if (personalSubtask) {
            total++;
            if (comp['subtask_person_' + member.id] && comp['subtask_person_' + member.id].completed) completed++;
        }
    });

    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

function getMemberAssignmentForActivity(member, activity) {
    const a = activity.assignments || {};
    if (a['person_' + member.id]) return a['person_' + member.id];
    if (a['group_' + member.group]) return a['group_' + member.group];
    if (a['admins'] && member.isAdmin) return a['admins'];
    if (a['all']) return a['all'];
    return null;
}

function calculateDayCompletionStats(day) {
    const dayActivities = adminActivities.filter(a => a.date === day);
    let total = 0;
    let completed = 0;

    dayActivities.forEach(activity => {
        const assignments = activity.assignments || {};
        const personalSubtasks = activity.personalSubtasks || {};
        const completions = activity.completions || {};

        Object.keys(assignments).forEach(key => {
            if (key === 'all') {
                adminMembers.forEach(member => {
                    total++;
                    if (completions['task_person_' + member.id] && completions['task_person_' + member.id].completed) completed++;
                });
                return;
            }
            if (key === 'admins') {
                adminMembers.filter(m => m.isAdmin).forEach(member => {
                    total++;
                    if (completions['task_person_' + member.id] && completions['task_person_' + member.id].completed) completed++;
                });
                return;
            }
            if (key.startsWith('group_')) {
                const group = key.replace('group_', '');
                adminMembers.filter(m => m.group === group).forEach(member => {
                    total++;
                    if (completions['task_person_' + member.id] && completions['task_person_' + member.id].completed) completed++;
                });
                return;
            }
            if (key.startsWith('person_')) {
                const memberId = key.replace('person_', '');
                total++;
                if (completions['task_person_' + memberId] && completions['task_person_' + memberId].completed) completed++;
            }
        });

        Object.keys(personalSubtasks).forEach(memberId => {
            total++;
            if (completions['subtask_person_' + memberId] && completions['subtask_person_' + memberId].completed) completed++;
        });
    });

    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

function parseActivityTime(timeStr, dayStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dayStr + 'T12:00:00');
    d.setHours(h, m, 0, 0);
    return d;
}


console.log('SEM Brasil 2026 - Admin Panel loaded');
