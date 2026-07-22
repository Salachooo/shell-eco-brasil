// =============================================
// SEM Brasil 2026 - App Principal
// =============================================

let currentUser = null;
let currentUserData = null;
let currentDay = '2026-08-24';
let allMembers = [];
let allScheduleData = {};
let clockInterval = null;
let countdownInterval = null;
let scheduleUnsubscribes = [];

// =============================================
// UTILITY FUNCTIONS
// =============================================
function getBrasilTime() {
    const now = new Date();
    const options = {
        timeZone: BRASIL_TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    return new Date(formatter.format(now));
}

function formatTime(date) {
    return date.toLocaleTimeString('es-CO', {
        timeZone: BRASIL_TIMEZONE,
        hour: '2-digit', minute: '2-digit', hour12: false
    });
}

function formatDate(date) {
    return date.toLocaleDateString('es-CO', {
        timeZone: BRASIL_TIMEZONE,
        weekday: 'long', day: 'numeric', month: 'short'
    });
}

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

function getShortDayName(dateStr) {
    return getDayName(dateStr).substring(0, 3).toUpperCase();
}

// =============================================
// AUTH
// =============================================
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim().toLowerCase();
    const pass = document.getElementById('loginPass').value;
    const loginBtn = document.getElementById('loginBtn');
    const errorEl = document.getElementById('loginError');

    loginBtn.classList.add('loading');
    errorEl.textContent = '';

    try {
        // Login with email-like identifier
        const email = user + '@sem2026.team';
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (err) {
        errorEl.textContent = 'Usuario o contraseña incorrectos';
        loginBtn.classList.remove('loading');
    }
});

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const uid = user.email.replace('@sem2026.team', '');
        await loadUserData(uid);
        showApp();
    } else {
        hideApp();
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    auth.signOut();
});

// =============================================
// USER DATA LOADING
// =============================================
async function loadUserData(uid) {
    try {
        const doc = await db.collection('members').doc(uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            currentUserData.id = uid;
            document.getElementById('userName').textContent = currentUserData.name;
            document.getElementById('greeting').textContent = 'Hola,';
        } else {
            // User not found in members - create placeholder
            currentUserData = {
                name: uid.charAt(0).toUpperCase() + uid.slice(1),
                group: 'alpha',
                role: 'Miembro',
                id: uid
            };
            document.getElementById('userName').textContent = currentUserData.name;
        }
    } catch (err) {
        console.error('Error loading user data:', err);
    }
}

// =============================================
// SCREEN MANAGEMENT
// =============================================
function showApp() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('appScreen').classList.add('active');
    startClock();
    loadMembers();
    loadDaySchedule(currentDay);
    setupDayNav();
    setupBottomNav();
}

function hideApp() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('appScreen').classList.remove('active');
    if (clockInterval) clearInterval(clockInterval);
    if (countdownInterval) clearInterval(countdownInterval);
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
            updateCurrentTask();
        });
    });

    // Highlight today if in range
    const today = new Date();
    const todayStr = today.toISOString().substring(0, 10);
    const dayBtns = document.querySelectorAll('.day-btn');
    dayBtns.forEach(btn => {
        if (btn.dataset.day === todayStr) {
            btn.classList.add('active');
            currentDay = todayStr;
        }
    });
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

            // Hide all panels
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));

            if (view === 'schedule') {
                document.getElementById('appMain').style.display = 'block';
            } else {
                document.getElementById('appMain').style.display = 'none';
                const panelId = view + 'View';
                document.getElementById(panelId).classList.add('active');
                if (view === 'team') loadTeamView();
                if (view === 'tasks') loadTasksView();
            }
        });
    });
}

// =============================================
// LOAD SCHEDULE
// =============================================
function loadDaySchedule(day) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '<div class="timeline-loading">Cargando cronograma...</div>';

    // Unsubscribe from previous listeners
    scheduleUnsubscribes.forEach(u => u());
    scheduleUnsubscribes = [];

    // Listen to schedule changes in real-time
    const unsubscribe = db.collection('schedule').doc(day)
        .onSnapshot((doc) => {
            if (doc.exists) {
                allScheduleData[day] = doc.data();
                renderTimeline(day, doc.data());
                updateCurrentTask();
                updateNextEvent();
            } else {
                // No data yet - show placeholder with default events
                const defaultData = getDefaultSchedule(day);
                allScheduleData[day] = defaultData;
                renderTimeline(day, defaultData);
                updateCurrentTask();
                updateNextEvent();
            }
        }, (err) => {
            console.error('Schedule load error:', err);
            timeline.innerHTML = '<div class="timeline-loading">Error al cargar. Verifica conexión.</div>';
        });

    scheduleUnsubscribes.push(unsubscribe);
}

function getDefaultSchedule(day) {
    const dayOfWeek = new Date(day + 'T12:00:00').getDay();
    const isCompetitionDay = day >= '2026-08-24' && day <= '2026-08-27';

    const baseEvents = [
        { time: '07:00', title: 'Despertar', icon: '⏰', type: 'team' },
        { time: '07:30', title: 'Desayuno', icon: '🍳', type: 'meal' },
        { time: '08:15', title: 'Reunión de equipo', icon: '📋', type: 'meeting' },
        { time: '08:45', title: 'Salida al venue', icon: '🚌', type: 'travel' },
    ];

    const afternoonEvents = [
        { time: '12:30', title: 'Almuerzo', icon: '🍔', type: 'meal' },
        { time: '18:30', title: 'Cena', icon: '🍽️', type: 'meal' },
        { time: '20:00', title: 'Reunión de cierre', icon: '📋', type: 'meeting' },
    ];

    const competitionBlocks = [
        { time: '09:00', title: 'Technical Inspection', icon: '🔧', type: 'competition' },
        { time: '11:00', title: 'Dynamic Events', icon: '🏁', type: 'competition' },
        { time: '14:00', title: 'Carreras', icon: '🏎️', type: 'competition' },
    ];

    const preCompetitionBlocks = [
        { time: '09:00', title: 'Ensamblaje del vehículo', icon: '🔧', type: 'team' },
        { time: '11:00', title: 'Preparación técnica', icon: '⚙️', type: 'team' },
        { time: '14:00', title: 'Pruebas y ajustes', icon: '🔩', type: 'team' },
    ];

    const events = [...baseEvents];
    
    if (isCompetitionDay) {
        events.push(...competitionBlocks);
    } else {
        events.push(...preCompetitionBlocks);
    }
    
    events.push(...afternoonEvents);
    events.sort((a, b) => a.time.localeCompare(b.time));

    const timeBlocks = events.map((e, i) => ({
        id: 'block_' + i,
        start: e.time,
        end: addHour(e.time, 1),
        title: e.title,
        icon: e.icon || '📋',
        type: e.type || 'team',
        assignments: {}
    }));

    return { events: timeBlocks, teamEvents: events };
}

function addHour(time, hours) {
    const [h, m] = time.split(':').map(Number);
    return String(h + hours).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

function renderTimeline(day, data) {
    const timeline = document.getElementById('timeline');
    const blocks = data.events || [];
    const now = new Date();

    if (!blocks.length) {
        timeline.innerHTML = '<div class="timeline-loading">No hay eventos para este día.</div>';
        return;
    }

    let html = '';
    blocks.forEach((block, index) => {
        const isActive = isBlockActive(block, day, now);
        const userAssignment = getUserAssignment(block);

        html += `
            <div class="timeline-item ${isActive ? 'active' : ''}">
                <div class="timeline-item-header">
                    <span class="timeline-item-time">${block.start} - ${block.end}</span>
                    <span class="timeline-item-icon">${block.icon || '📋'}</span>
                </div>
                <div class="timeline-item-title">${block.title}</div>
                ${block.subtitle ? `<div class="timeline-item-subtitle">${block.subtitle}</div>` : ''}
                ${userAssignment ? `<div class="timeline-item-role">${userAssignment}</div>` : ''}
            </div>
        `;
    });

    timeline.innerHTML = html;
}

function isBlockActive(block, day, now) {
    const blockStart = parseTimeToDate(block.start, day);
    const blockEnd = parseTimeToDate(block.end, day);
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const nowBrasilTime = nowBrasil.getTime();
    return nowBrasilTime >= blockStart.getTime() && nowBrasilTime < blockEnd.getTime();
}

function getUserAssignment(block) {
    if (!currentUserData) return null;
    const assignments = block.assignments || {};

    // Check individual assignment
    if (assignments['person_' + currentUserData.id]) {
        return assignments['person_' + currentUserData.id];
    }

    // Check group assignment
    const groupKey = 'group_' + currentUserData.group;
    if (assignments[groupKey]) {
        return assignments[groupKey];
    }

    // Check "all" assignment
    if (assignments['all']) {
        return assignments['all'];
    }

    return null;
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

    const blocks = data.events;
    let activeBlock = null;

    for (const block of blocks) {
        if (isBlockActive(block, currentDay, now)) {
            activeBlock = block;
            break;
        }
    }

    const taskCard = document.getElementById('currentTaskCard');
    if (activeBlock) {
        taskCard.style.display = 'block';
        document.getElementById('currentTaskTime').textContent = `${activeBlock.start} - ${activeBlock.end}`;
        document.getElementById('currentTaskIcon').textContent = activeBlock.icon || '📋';
        document.getElementById('currentTaskTitle').textContent = activeBlock.title;
        
        const assignment = getUserAssignment(activeBlock);
        document.getElementById('currentTaskRole').textContent = assignment ? `👤 ${assignment}` : '';
        document.getElementById('currentTaskBlock').textContent = '';
    } else {
        // Find next upcoming block
        let nextBlock = null;
        for (const block of blocks) {
            const blockStart = parseTimeToDate(block.start, currentDay);
            if (now < blockStart) {
                nextBlock = block;
                break;
            }
        }

        if (nextBlock) {
            taskCard.style.display = 'block';
            document.getElementById('currentTaskTime').textContent = `Próximo: ${nextBlock.start}`;
            document.getElementById('currentTaskIcon').textContent = '⏳';
            document.getElementById('currentTaskTitle').textContent = nextBlock.title;
            document.getElementById('currentTaskRole').textContent = '';
            document.getElementById('currentTaskBlock').textContent = '';
        } else {
            taskCard.style.display = 'none';
        }
    }
}

// =============================================
// NEXT EVENT COUNTDOWN
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

    const blocks = data.events;
    let nextEvent = null;

    for (const block of blocks) {
        const blockStart = parseTimeToDate(block.start, currentDay);
        if (now < blockStart) {
            nextEvent = block;
            break;
        }
    }

    const bar = document.getElementById('nextEventBar');
    const text = document.getElementById('nextEventText');
    const countdown = document.getElementById('nextEventCountdown');

    if (nextEvent) {
        bar.style.display = 'flex';
        text.textContent = `${nextEvent.icon || '📋'} ${nextEvent.title} - ${nextEvent.start}`;
        const eventTime = parseTimeToDate(nextEvent.start, currentDay);
        const diff = eventTime - now;
        if (diff > 0) {
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            countdown.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        } else {
            countdown.textContent = '00:00:00';
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
        if (document.getElementById('teamView').classList.contains('active')) {
            renderTeamGrid();
        }
    });
}

function loadTeamView() {
    renderTeamGrid();
}

function renderTeamGrid() {
    const grid = document.getElementById('teamGrid');
    const data = allScheduleData[currentDay];
    const blocks = data ? data.events : [];

    if (!allMembers.length) {
        grid.innerHTML = '<div class="team-loading">No hay miembros cargados.</div>';
        return;
    }

    let html = '';
    allMembers.forEach(member => {
        const currentTask = getMemberCurrentTask(member, blocks);
        const initial = member.name ? member.name.charAt(0).toUpperCase() : '?';
        const colors = {
            alpha: '#e74c3c', beta: '#3498db', gamma: '#2ecc71', delta: '#f39c12'
        };
        const color = colors[member.group] || '#666';

        html += `
            <div class="team-member-card">
                <div class="team-member-avatar" style="background:${color}">${initial}</div>
                <div class="team-member-info">
                    <div class="team-member-name">${member.name || member.id}</div>
                    <div class="team-member-task">${currentTask || 'Sin tarea asignada'}</div>
                </div>
                <div class="team-member-group group-${member.group}">${member.group}</div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

function getMemberCurrentTask(member, blocks) {
    if (!blocks || !blocks.length) return null;
    const now = new Date();

    for (const block of blocks) {
        if (isBlockActive(block, currentDay, now)) {
            const assignments = block.assignments || {};
            if (assignments['person_' + member.id]) return assignments['person_' + member.id];
            if (assignments['group_' + member.group]) return assignments['group_' + member.group] + ' (' + block.title + ')';
            if (assignments['all']) return assignments['all'] + ' (' + block.title + ')';
        }
    }

    return null;
}

// =============================================
// TASKS VIEW
// =============================================
function loadTasksView() {
    const list = document.getElementById('tasksList');
    const days = ['2026-08-21', '2026-08-22', '2026-08-23', '2026-08-24', '2026-08-25', '2026-08-26', '2026-08-27'];
    let html = '';

    days.forEach(day => {
        const data = allScheduleData[day];
        if (!data || !data.events) return;

        data.events.forEach(block => {
            const assignment = getUserAssignment(block);
            if (assignment) {
                html += `
                    <div class="task-card">
                        <div class="task-card-header">
                            <span class="task-card-day">${getShortDayName(day)} ${day.substring(8)}</span>
                            <span class="task-card-time">${block.start}</span>
                        </div>
                        <div class="task-card-title">${block.icon || '📋'} ${block.title}</div>
                        <div class="task-card-role">${assignment}</div>
                    </div>
                `;
            }
        });
    });

    list.innerHTML = html || '<div class="tasks-loading">No tienes tareas asignadas aún.</div>';
}

// =============================================
// THEME TOGGLE
// =============================================
document.getElementById('themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light-theme');
    const btn = document.getElementById('themeToggle');
    btn.textContent = document.body.classList.contains('light-theme') ? '🌙' : '🌙';
    localStorage.setItem('theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
});

// Load theme preference
if (localStorage.getItem('theme') === 'light') {
    document.body.classList.add('light-theme');
}

// =============================================
// SYNC STATUS
// =============================================
document.getElementById('syncBtn').addEventListener('click', () => {
    const icon = document.getElementById('syncIcon');
    icon.textContent = '🔄';
    setTimeout(() => {
        icon.textContent = navigator.onLine ? '📡' : '📡';
    }, 1000);
});

window.addEventListener('online', () => {
    document.getElementById('syncIcon').textContent = '📡';
});
window.addEventListener('offline', () => {
    document.getElementById('syncIcon').textContent = '📡';
});

// =============================================
// INIT
// =============================================
console.log('SEM Brasil 2026 - Team Schedule App loaded');
