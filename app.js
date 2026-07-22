// =============================================
// SEM Brasil 2026 - App Principal
// =============================================

let currentUser = null;
const SCHEDULE_DAYS = ['2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26','2026-08-27'];
let currentDay = getDefaultScheduleDay();
let allMembers = [];
let allScheduleData = {};
let clockInterval = null;
let countdownInterval = null;
let scheduleUnsubscribes = [];

// =============================================
// UTILITY FUNCTIONS
// =============================================
function parseTimeToDate(timeStr, dayStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dayStr + 'T12:00:00');
    d.setHours(h, m, 0, 0);
    return d;
}

function getDayName(dateStr) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
}

function getShortDayName(dateStr) { return getDayName(dateStr).substring(0, 3).toUpperCase(); }

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

function nameToId(name) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

// =============================================
// AUTH CON LOCALSTORAGE + FIRESTORE
// =============================================

// Auto-login
(function checkAutoLogin() {
    const saved = localStorage.getItem('sem2026_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('registerBtn').textContent = '🔑 Cambiar de usuario';
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('appScreen').classList.add('active');
        startApp();
    }
})();

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('loginUser').value.trim().toLowerCase();
    const password = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    loginBtn.classList.add('loading');
    errorEl.textContent = '';

    try {
        const doc = await db.collection('members').doc(username).get();
        if (doc.exists && doc.data().password === password) {
            currentUser = { id: username, ...doc.data() };
            localStorage.setItem('sem2026_user', JSON.stringify(currentUser));
            document.getElementById('registerBtn').textContent = '🔑 Cambiar de usuario';
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('appScreen').classList.add('active');
            startApp();
        } else {
            errorEl.textContent = '❌ Usuario o contraseña incorrectos';
        }
    } catch (err) {
        errorEl.textContent = 'Error de conexión.';
        console.error(err);
    }
    loginBtn.classList.remove('loading');
});

// Show register screen - load available members
document.getElementById('registerBtn').addEventListener('click', async () => {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.add('active');
    await loadAvailableMembers();
});

document.getElementById('backToLoginBtn').addEventListener('click', () => {
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
});

// Load members that don't have a password yet (unregistered)
async function loadAvailableMembers() {
    const select = document.getElementById('regMemberSelect');
    select.innerHTML = '<option value="">Cargando...</option>';
    select.disabled = true;

    try {
        const snapshot = await db.collection('members').get();
        let html = '<option value="">¿Quién eres?</option>';
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.password) {
                html += `<option value="${doc.id}">${data.name}</option>`;
                count++;
            }
        });

        if (count === 0) {
            html = '<option value="">🎉 Todos ya están registrados</option>';
        }

        select.innerHTML = html;
        select.disabled = false;
        document.getElementById('regCount').textContent = `${count} personas disponibles`;
    } catch (err) {
        select.innerHTML = '<option value="">Error al cargar</option>';
        console.error(err);
    }
}

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('regMemberSelect').value;
    const password = document.getElementById('regPass').value;
    const btn = e.target.querySelector('.btn');
    const errorEl = document.getElementById('registerError');

    if (!memberId) {
        errorEl.textContent = '❌ Selecciona quién eres';
        return;
    }
    if (!password || password.length < 3) {
        errorEl.textContent = '❌ La contraseña debe tener al menos 3 caracteres';
        return;
    }

    btn.classList.add('loading');
    errorEl.textContent = '';

    try {
        const memberRef = db.collection('members').doc(memberId);
        const doc = await memberRef.get();

        if (!doc.exists) {
            errorEl.textContent = '❌ No encontrado. Corre el seed primero.';
            btn.classList.remove('loading');
            return;
        }

        if (doc.data().password) {
            errorEl.textContent = '❌ Esta persona ya tiene una cuenta.';
            btn.classList.remove('loading');
            return;
        }

        // Set password to register
        await memberRef.update({ password: password });

        // Auto-login
        const updated = await memberRef.get();
        currentUser = { id: memberId, ...updated.data() };
        localStorage.setItem('sem2026_user', JSON.stringify(currentUser));

        document.getElementById('registerBtn').textContent = '🔑 Cambiar de usuario';
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('appScreen').classList.add('active');
        startApp();
    } catch (err) {
        errorEl.textContent = 'Error: ' + err.message;
    }
    btn.classList.remove('loading');
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sem2026_user');
    currentUser = null;
    document.getElementById('appScreen').classList.remove('active');
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('registerBtn').textContent = '📝 Registrarse';
    if (clockInterval) clearInterval(clockInterval);
    if (countdownInterval) clearInterval(countdownInterval);
});

// =============================================
// APP START
// =============================================
function startApp() {
    document.getElementById('userName').textContent = currentUser.name;
    currentDay = getDefaultScheduleDay();
    startClock();
    loadMembers();
    setupDayNav();
    setupBottomNav();
    setupActivityDetailModal();
    loadDaySchedule(currentDay);
}

// =============================================
// CLOCK
// =============================================
function startClock() {
    if (clockInterval) clearInterval(clockInterval);
    updateClock();
    clockInterval = setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', {
        timeZone: BRASIL_TIMEZONE,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const dateStr = now.toLocaleDateString('es-CO', {
        timeZone: BRASIL_TIMEZONE,
        weekday: 'long', day: 'numeric', month: 'long'
    });
    document.getElementById('currentTime').textContent = timeStr;
    document.getElementById('currentDate').textContent = dateStr;
}

// =============================================
// DAY NAVIGATION
// =============================================
function setupDayNav() {
    document.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDay = btn.dataset.day;
            loadDaySchedule(currentDay);
        });
    });

    const todayStr = getDefaultScheduleDay();
    let selected = false;
    document.querySelectorAll('.day-btn').forEach(btn => {
        if (btn.dataset.day === todayStr) {
            selected = true;
            btn.click();
        }
    });

    if (!selected) {
        const first = document.querySelector('.day-btn');
        if (first) first.click();
    }
}

// =============================================
// BOTTOM NAV
// =============================================
function setupBottomNav() {
    document.querySelectorAll('.bottom-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bottom-nav-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

            if (view === 'schedule') {
                document.getElementById('appMain').style.display = 'block';
            } else {
                document.getElementById('appMain').style.display = 'none';
                const panelId = view + 'View';
                document.getElementById(panelId).classList.add('active');
                if (view === 'team') renderTeamGrid();
                if (view === 'tasks') loadTasksView();
            }
        });
    });
}

// =============================================
// SCHEDULE
// =============================================
function loadDaySchedule(day) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '<div class="timeline-loading">Cargando cronograma...</div>';

    scheduleUnsubscribes.forEach(u => u());
    scheduleUnsubscribes = [];

    const unsubscribe = db.collection('activities')
        .where('date', '==', day)
        .onSnapshot((snapshot) => {
            const activities = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data || !data.time || !data.title) return;
                data.id = doc.id;
                activities.push(data);
            });

            activities.sort((a, b) => a.time.localeCompare(b.time));

            // Convert activities to blocks format
            const blocks = activities.map(a => ({
                id: a.id,
                start: a.time,
                end: addMinutesToTime(a.time, a.duration || 120),
                title: a.title,
                icon: a.icon || '📋',
                type: a.type || 'team',
                description: a.description || '',
                assignments: a.assignments || {},
                personalSubtasks: a.personalSubtasks || {},
                completions: a.completions || {}
            }));

            const data = { events: blocks };
            allScheduleData[day] = data;
            renderTimeline(day, data);
            updateCurrentTask();
            updateNextEvent();
        }, (err) => {
            console.error('Schedule error:', err);
            if (err.code === 'permission-denied') {
                timeline.innerHTML = '<div class="timeline-loading">Permiso denegado en Firestore.</div>';
                return;
            }
            if (err.code === 'failed-precondition') {
                timeline.innerHTML = '<div class="timeline-loading">Configuración incompleta de Firestore.</div>';
                return;
            }
            timeline.innerHTML = '<div class="timeline-loading">Error al cargar cronograma.</div>';
        });

    scheduleUnsubscribes.push(unsubscribe);
}

function addMinutesToTime(timeStr, minutes) {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    return String(newH).padStart(2, '0') + ':' + String(newM).padStart(2, '0');
}

function renderTimeline(day, data) {
    const timeline = document.getElementById('timeline');
    const blocks = getVisibleBlocksForCurrentUser(data.events || []);
    const now = new Date();

    if (!blocks.length) {
        timeline.innerHTML = '<div class="timeline-loading">No tienes tareas asignadas para este día.</div>';
        return;
    }

    let html = '';
    blocks.forEach(block => {
        const isActive = isBlockActive(block, day, now);
        const assignmentInfo = getUserAssignmentInfo(block);
        const assignment = assignmentInfo.role;
        const isCompleted = isTaskCompleted(block, assignmentInfo.key, currentUser.id);

        html += `<div class="timeline-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}" data-activity-id="${block.id}">
            <div class="timeline-item-header">
                <span class="timeline-item-time">${block.start} - ${block.end}</span>
                <span class="timeline-item-icon">${block.icon || '📋'}</span>
            </div>
            <div class="timeline-item-title">${block.title}</div>
            ${assignment ? `<div class="timeline-item-role">${assignment}</div>` : ''}
            <div class="timeline-item-subtitle">${isCompleted ? '✅ Completada' : '⏳ Pendiente'}</div>
        </div>`;
    });

    timeline.innerHTML = html;
    timeline.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', () => {
            openActivityDetail(item.dataset.activityId);
        });
    });
}

function isBlockActive(block, day, now) {
    const start = parseTimeToDate(block.start, day);
    const end = parseTimeToDate(block.end, day);
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const t = nowBrasil.getTime();
    return t >= start.getTime() && t < end.getTime();
}

function getUserAssignment(block) {
    const info = getUserAssignmentInfo(block);
    return info.role;
}

function getUserAssignmentInfo(block, user = currentUser) {
    if (!user) return { key: null, role: null };
    const a = block.assignments || {};
    if (a['person_' + user.id]) return { key: 'person_' + user.id, role: a['person_' + user.id] };
    if (a['group_' + user.group]) return { key: 'group_' + user.group, role: a['group_' + user.group] };
    if (a['admins'] && user.isAdmin) return { key: 'admins', role: a['admins'] };
    if (a['all']) return { key: 'all', role: a['all'] };

    const personalSubtask = block.personalSubtasks && block.personalSubtasks[user.id];
    if (personalSubtask) return { key: 'person_' + user.id, role: personalSubtask };

    return { key: null, role: null };
}

function getVisibleBlocksForCurrentUser(blocks) {
    return blocks.filter(block => {
        const info = getUserAssignmentInfo(block);
        return !!info.role;
    });
}

function isTaskCompleted(block, assignmentKey, userId) {
    const completions = block.completions || {};
    if (completions['task_person_' + userId] && completions['task_person_' + userId].completed) return true;
    if (assignmentKey && completions[assignmentKey] && completions[assignmentKey].completed) return true;
    return false;
}

// =============================================
// CURRENT TASK
// =============================================
function updateCurrentTask() {
    const now = new Date();
    const data = allScheduleData[currentDay];
    if (!data || !data.events) {
        document.getElementById('currentTaskCard').style.display = 'none';
        return;
    }

    const visibleEvents = getVisibleBlocksForCurrentUser(data.events);
    if (!visibleEvents.length) {
        document.getElementById('currentTaskCard').style.display = 'none';
        return;
    }

    let activeBlock = null;
    for (const block of visibleEvents) {
        if (isBlockActive(block, currentDay, now)) { activeBlock = block; break; }
    }

    const card = document.getElementById('currentTaskCard');
    if (activeBlock) {
        card.style.display = 'block';
        document.getElementById('currentTaskTime').textContent = `${activeBlock.start} - ${activeBlock.end}`;
        document.getElementById('currentTaskIcon').textContent = activeBlock.icon || '📋';
        document.getElementById('currentTaskTitle').textContent = activeBlock.title;
        document.getElementById('currentTaskRole').textContent = getUserAssignment(activeBlock) ? `👤 ${getUserAssignment(activeBlock)}` : '';
    } else {
        let next = null;
        for (const block of visibleEvents) {
            if (now < parseTimeToDate(block.start, currentDay)) { next = block; break; }
        }
        if (next) {
            card.style.display = 'block';
            document.getElementById('currentTaskTime').textContent = `Próximo: ${next.start}`;
            document.getElementById('currentTaskIcon').textContent = '⏳';
            document.getElementById('currentTaskTitle').textContent = next.title;
            document.getElementById('currentTaskRole').textContent = '';
        } else {
            card.style.display = 'none';
        }
    }
}

// =============================================
// NEXT EVENT
// =============================================
function updateNextEvent() {
    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
}

function updateCountdown() {
    const now = new Date();
    const data = allScheduleData[currentDay];
    if (!data || !data.events) return;

    const visibleEvents = getVisibleBlocksForCurrentUser(data.events);
    if (!visibleEvents.length) {
        document.getElementById('nextEventBar').style.display = 'none';
        return;
    }

    let next = null;
    for (const block of visibleEvents) {
        if (now < parseTimeToDate(block.start, currentDay)) { next = block; break; }
    }

    const bar = document.getElementById('nextEventBar');
    if (next) {
        bar.style.display = 'flex';
        document.getElementById('nextEventText').textContent = `${next.icon || '📋'} ${next.title} - ${next.start}`;
        const diff = parseTimeToDate(next.start, currentDay) - now;
        if (diff > 0) {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            document.getElementById('nextEventCountdown').textContent =
                `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
    } else {
        bar.style.display = 'none';
    }
}

// =============================================
// TEAM VIEW
// =============================================
function loadMembers() {
    db.collection('members').onSnapshot((snapshot) => {
        allMembers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            allMembers.push(data);
        });
        document.getElementById('teamCount').textContent = allMembers.length + ' miembros';
        if (document.getElementById('teamView').classList.contains('active')) renderTeamGrid();
    });
}

function renderTeamGrid() {
    const grid = document.getElementById('teamGrid');
    const blocks = allScheduleData[currentDay] ? allScheduleData[currentDay].events : [];

    if (!allMembers.length) {
        grid.innerHTML = '<div class="team-loading">No hay miembros.</div>';
        return;
    }

    let html = '';
    allMembers.forEach(member => {
        const task = getMemberCurrentTask(member, blocks);
        const initial = member.name ? member.name.charAt(0).toUpperCase() : '?';
        const colors = { alpha: '#e74c3c', beta: '#3498db', gamma: '#2ecc71', delta: '#f39c12' };
        const badge = member.isAdmin ? '⭐' : '';

        html += `<div class="team-member-card">
            <div class="team-member-avatar" style="background:${colors[member.group] || '#666'}">${initial}</div>
            <div class="team-member-info">
                <div class="team-member-name">${member.name || member.id} ${badge}</div>
                <div class="team-member-task">${task || (member.password ? 'Sin tarea' : '⏳ No registrado')}</div>
            </div>
            <div class="team-member-group group-${member.group}">${member.group}</div>
        </div>`;
    });
    grid.innerHTML = html;
}

function getMemberCurrentTask(member, blocks) {
    if (!blocks) return null;
    const now = new Date();
    for (const block of blocks) {
        if (isBlockActive(block, currentDay, now)) {
            const a = block.assignments || {};
            if (a['person_' + member.id]) return a['person_' + member.id];
            if (a['group_' + member.group]) return a['group_' + member.group] + ' (' + block.title + ')';
            if (a['admins'] && member.isAdmin) return a['admins'] + ' (' + block.title + ')';
            if (a['all']) return a['all'] + ' (' + block.title + ')';
        }
    }
    return null;
}

// =============================================
// TASKS VIEW
// =============================================
function loadTasksView() {
    const list = document.getElementById('tasksList');
    const days = SCHEDULE_DAYS;
    let html = '';

    days.forEach(day => {
        const data = allScheduleData[day];
        if (!data || !data.events) return;
        data.events.forEach(block => {
            const a = getUserAssignment(block);
            if (a) {
                html += `<div class="task-card">
                    <div class="task-card-header">
                        <span class="task-card-day">${getShortDayName(day)} ${day.substring(8)}</span>
                        <span class="task-card-time">${block.start}</span>
                    </div>
                    <div class="task-card-title">${block.icon || '📋'} ${block.title}</div>
                    <div class="task-card-role">${a}</div>
                </div>`;
            }
        });
    });
    list.innerHTML = html || '<div class="tasks-loading">No tienes tareas asignadas aún.</div>';
}

function setupActivityDetailModal() {
    const closeBtn = document.getElementById('activityDetailClose');
    const backdrop = document.getElementById('activityDetailModal');
    if (closeBtn) closeBtn.addEventListener('click', closeActivityDetail);
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target.id === 'activityDetailModal') closeActivityDetail();
        });
    }
}

function closeActivityDetail() {
    document.getElementById('activityDetailModal').classList.remove('active');
}

function openActivityDetail(activityId) {
    const data = allScheduleData[currentDay];
    if (!data || !data.events) return;

    const activity = data.events.find(e => e.id === activityId);
    if (!activity) return;

    const info = getUserAssignmentInfo(activity);
    if (!info.role) return;

    const generalDescription = activity.description || 'Sin descripción general.';
    const personalDescription = activity.personalSubtasks && activity.personalSubtasks[currentUser.id]
        ? activity.personalSubtasks[currentUser.id]
        : null;

    document.getElementById('activityDetailTitle').textContent = `${activity.icon || '📋'} ${activity.title}`;
    document.getElementById('activityDetailTime').textContent = `${activity.start} - ${activity.end}`;
    document.getElementById('activityDetailGeneral').textContent = generalDescription;
    document.getElementById('activityDetailRole').textContent = info.role || 'Sin tarea específica';
    document.getElementById('activityDetailPersonal').textContent = personalDescription || 'Sin subtarea personal';

    const taskKey = 'task_person_' + currentUser.id;
    const subtaskKey = 'subtask_person_' + currentUser.id;
    const completions = activity.completions || {};

    const taskCheck = document.getElementById('activityDetailTaskCheck');
    const taskToggleBtn = document.getElementById('activityDetailTaskToggleBtn');
    const subtaskCheckWrap = document.getElementById('activityDetailSubtaskWrap');
    const subtaskCheck = document.getElementById('activityDetailSubtaskCheck');
    const subtaskToggleBtn = document.getElementById('activityDetailSubtaskToggleBtn');
    const groupCompleteBtn = document.getElementById('activityDetailGroupCompleteBtn');

    taskCheck.checked = !!(completions[taskKey] && completions[taskKey].completed);
    taskToggleBtn.onclick = () => toggleCompletionForCurrentUser(activity.id, taskKey, !taskCheck.checked);

    if (personalDescription) {
        subtaskCheckWrap.style.display = 'block';
        subtaskCheck.checked = !!(completions[subtaskKey] && completions[subtaskKey].completed);
        subtaskToggleBtn.onclick = () => toggleCompletionForCurrentUser(activity.id, subtaskKey, !subtaskCheck.checked);
    } else {
        subtaskCheckWrap.style.display = 'none';
        subtaskToggleBtn.onclick = null;
    }

    if (currentUser.isAdmin && info.key && (info.key.startsWith('group_') || info.key === 'all' || info.key === 'admins')) {
        groupCompleteBtn.style.display = 'inline-flex';
        groupCompleteBtn.onclick = () => completeGroupTaskAsAdmin(activity.id, info.key);
    } else {
        groupCompleteBtn.style.display = 'none';
        groupCompleteBtn.onclick = null;
    }

    document.getElementById('activityDetailModal').classList.add('active');
}

async function toggleCompletionForCurrentUser(activityId, completionKey, completed) {
    try {
        const ref = db.collection('activities').doc(activityId);
        const doc = await ref.get();
        if (!doc.exists) return;

        const data = doc.data();
        const completions = data.completions || {};
        completions[completionKey] = {
            completed: completed,
            completedAt: completed ? new Date().toISOString() : null,
            completedBy: currentUser.id
        };
        await ref.update({ completions: completions });
    } catch (err) {
        alert('No se pudo actualizar el check: ' + err.message);
    }
}

async function completeGroupTaskAsAdmin(activityId, assignmentKey) {
    try {
        const ref = db.collection('activities').doc(activityId);
        const doc = await ref.get();
        if (!doc.exists) return;

        const data = doc.data();
        const completions = data.completions || {};
        const recipients = getRecipientsForAssignmentKey(assignmentKey);

        completions[assignmentKey] = {
            completed: true,
            completedAt: new Date().toISOString(),
            completedBy: currentUser.id
        };

        recipients.forEach(memberId => {
            completions['task_person_' + memberId] = {
                completed: true,
                completedAt: new Date().toISOString(),
                completedBy: currentUser.id
            };
        });

        await ref.update({ completions: completions });
        alert('✅ Tarea grupal marcada como completada.');
    } catch (err) {
        alert('No se pudo completar tarea grupal: ' + err.message);
    }
}

function getRecipientsForAssignmentKey(assignmentKey) {
    if (assignmentKey === 'all') return allMembers.map(m => m.id);
    if (assignmentKey === 'admins') return allMembers.filter(m => m.isAdmin).map(m => m.id);
    if (assignmentKey.startsWith('group_')) {
        const group = assignmentKey.replace('group_', '');
        return allMembers.filter(m => m.group === group).map(m => m.id);
    }
    if (assignmentKey.startsWith('person_')) return [assignmentKey.replace('person_', '')];
    return [];
}

// =============================================
// THEME TOGGLE
// =============================================
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});

if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

// =============================================
// SYNC
// =============================================
window.addEventListener('online', () => { const el = document.getElementById('syncIcon'); if (el) el.textContent = '📡'; });
window.addEventListener('offline', () => { const el = document.getElementById('syncIcon'); if (el) el.textContent = '📡'; });

console.log('SEM Brasil 2026 - App loaded');