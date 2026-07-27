// =============================================
// SEM Brasil 2026 - App Principal (Redesign v4)
// Per-key completion model + Animated checkboxes
// =============================================

let currentUser = null;
const SCHEDULE_DAYS = ['2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26','2026-08-27'];
const DAY_LABELS = { '2026-08-21':'21','2026-08-22':'22','2026-08-23':'23','2026-08-24':'24','2026-08-25':'25','2026-08-26':'26','2026-08-27':'27' };
const DAY_NAMES = { '2026-08-21':'Fri','2026-08-22':'Sat','2026-08-23':'Sun','2026-08-24':'Mon','2026-08-25':'Tue','2026-08-26':'Wed','2026-08-27':'Thu' };
let currentDay = getDefaultScheduleDay();
let allMembers = [];
let allScheduleData = {};
let clockInterval = null;
let countdownInterval = null;
let scheduleUnsubscribes = [];
let currentFilter = 'all';
let currentTeamFilter = 'all';
let currentTaskFilter = 'all';
let activityDetailState = { activityId: null };

// =============================================
// SVG CHECKMARK BUILDER
// =============================================
function checkSvg() {
    return `<svg viewBox="0 0 14 14"><path d="M2 7.5L5.5 11L12 3"/></svg>`;
}

function makeCheckCircleHtml(checked, extraClass = '') {
    return `<div class="check-circle ${checked ? 'checked' : ''} ${extraClass}" tabindex="0" role="checkbox" aria-checked="${checked}">
        ${checkSvg()}
    </div>`;
}

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
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const d = new Date(dateStr + 'T12:00:00');
    return days[d.getDay()];
}

function getShortDayName(dateStr) { return getDayName(dateStr).substring(0, 3).toUpperCase(); }

function getBrasilTodayISO() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BRASIL_TIMEZONE,
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}

function getDefaultScheduleDay() {
    const today = getBrasilTodayISO();
    if (today <= SCHEDULE_DAYS[0]) return SCHEDULE_DAYS[0];
    if (today >= SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1]) return SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1];
    for (const day of SCHEDULE_DAYS) { if (day >= today) return day; }
    return SCHEDULE_DAYS[0];
}

function nameToId(name) {
    return name.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ñ/g, "n")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function getMemberColor(member) {
    const colors = { alpha: '#f85149', beta: '#58a6ff', gamma: '#3fb950', delta: '#d29922' };
    return colors[member.group] || '#6e7681';
}

function getMemberInitial(name) {
    return name ? name.charAt(0).toUpperCase() : '?';
}

/** Get the source badge class for a given sourceType */
function getSourceBadgeClass(sourceType) {
    const map = {
        'all': 'all', 'admins': 'admins', 'group': 'group',
        'personal': 'personal', 'subtask': 'subtask', 'assembly': 'assembly'
    };
    return map[sourceType] || '';
}

/** Get display text for a source type */
function getSourceDisplay(sourceType) {
    const map = {
        'all': 'Everyone', 'admins': 'Admins', 'group': 'Group',
        'personal': 'Personal', 'subtask': 'Sub-task', 'assembly': 'Assembly'
    };
    return map[sourceType] || sourceType;
}

// =============================================
// AUTH
// =============================================
(function checkAutoLogin() {
    const saved = localStorage.getItem('sem2026_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        document.getElementById('registerBtn').textContent = 'Switch user';
        document.getElementById('loginScreen').classList.remove('active');
        document.getElementById('appScreen').classList.add('active');
        startApp();
    }
})();

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
            document.getElementById('registerBtn').textContent = 'Switch user';
            document.getElementById('loginScreen').classList.remove('active');
            document.getElementById('appScreen').classList.add('active');
            startApp();
        } else {
            errorEl.textContent = 'Invalid username or password';
        }
    } catch (err) {
        errorEl.textContent = 'Connection error. Check console.';
        console.error(err);
    }
    loginBtn.classList.remove('loading');
});

document.getElementById('registerBtn').addEventListener('click', async () => {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('registerScreen').classList.add('active');
    await loadAvailableMembers();
});

document.getElementById('backToLoginBtn').addEventListener('click', () => {
    document.getElementById('registerScreen').classList.remove('active');
    document.getElementById('loginScreen').classList.add('active');
});

async function loadAvailableMembers() {
    const select = document.getElementById('regMemberSelect');
    select.innerHTML = '<option value="">Loading...</option>';
    select.disabled = true;

    try {
        const snapshot = await db.collection('members').get();
        let html = '<option value="">Who are you?</option>';
        let count = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data.password) {
                html += `<option value="${doc.id}">${data.name}</option>`;
                count++;
            }
        });

        if (count === 0) html = '<option value="">Everyone is already registered</option>';

        select.innerHTML = html;
        select.disabled = false;
        document.getElementById('regCount').textContent = `${count} people available`;
    } catch (err) {
        select.innerHTML = '<option value="">Error loading</option>';
        console.error(err);
    }
}

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const memberId = document.getElementById('regMemberSelect').value;
    const password = document.getElementById('regPass').value;
    const btn = e.target.querySelector('.btn');
    const errorEl = document.getElementById('registerError');

    if (!memberId) { errorEl.textContent = 'Select who you are'; return; }
    if (!password || password.length < 3) { errorEl.textContent = 'Password must be at least 3 characters'; return; }

    btn.classList.add('loading');
    errorEl.textContent = '';

    try {
        const memberRef = db.collection('members').doc(memberId);
        const doc = await memberRef.get();

        if (!doc.exists) { errorEl.textContent = 'Not found. Run seed first.'; btn.classList.remove('loading'); return; }
        if (doc.data().password) { errorEl.textContent = 'This person already has an account.'; btn.classList.remove('loading'); return; }

        await memberRef.update({ password: password });

        const updated = await memberRef.get();
        currentUser = { id: memberId, ...updated.data() };
        localStorage.setItem('sem2026_user', JSON.stringify(currentUser));

        document.getElementById('registerBtn').textContent = 'Switch user';
        document.getElementById('registerScreen').classList.remove('active');
        document.getElementById('appScreen').classList.add('active');
        startApp();
    } catch (err) {
        errorEl.textContent = 'Error: ' + err.message;
    }
    btn.classList.remove('loading');
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('sem2026_user');
    currentUser = null;
    document.getElementById('appScreen').classList.remove('active');
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('registerBtn').textContent = 'First time? Register';
    if (clockInterval) clearInterval(clockInterval);
    if (countdownInterval) clearInterval(countdownInterval);
});

// =============================================
// APP START
// =============================================
function startApp() {
    document.getElementById('userName').textContent = currentUser.name || currentUser.id;
    currentDay = getDefaultScheduleDay();
    startClock();
    loadMembers();
    setupDayNav();
    setupBottomNav();
    setupActivityDetailModal();
    setupPersonDetailModal();
    setupFilters();
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
    const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: BRASIL_TIMEZONE,
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    });
    const dateStr = now.toLocaleDateString('en-US', {
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
    const nav = document.getElementById('dayNav');
    nav.innerHTML = SCHEDULE_DAYS.map(day => `
        <button class="day-btn ${day === currentDay ? 'active' : ''}" data-day="${day}">
            <span class="day-num">${DAY_LABELS[day]}</span>
            <span class="day-name">${DAY_NAMES[day]}</span>
        </button>
    `).join('');

    nav.querySelectorAll('.day-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            nav.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDay = btn.dataset.day;
            document.getElementById('scheduleDayTitle').textContent = `${getDayName(currentDay)}'s Schedule`;
            loadDaySchedule(currentDay);
        });
    });

    document.getElementById('scheduleDayTitle').textContent = `${getDayName(currentDay)}'s Schedule`;
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
// FILTERS
// =============================================
function setupFilters() {
    document.querySelectorAll('#filterBar .filter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#filterBar .filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderTimeline(currentDay, allScheduleData[currentDay]);
        });
    });

    document.querySelectorAll('[data-team-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('[data-team-filter]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentTeamFilter = chip.dataset.teamFilter;
            renderTeamGrid();
        });
    });

    document.querySelectorAll('[data-task-filter]').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('[data-task-filter]').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentTaskFilter = chip.dataset.taskFilter;
            loadTasksView();
        });
    });
}

// =============================================
// COMPLETION KEY HELPERS (New Model)
// =============================================

/** 
 * Get all assignment entries that apply to a specific user for a given block.
 * Returns array of { key, role, source, sourceType }
 * Keys are now individually toggle-able.
 */
function getAllAssignmentsForMember(member, block) {
    const a = block.assignments || {};
    const tasks = [];

    Object.keys(a).forEach(assignmentKey => {
        if (assignmentKey === 'all') {
            tasks.push({
                key: buildAssignmentCompletionKey(assignmentKey, member.id),
                assignmentKey,
                role: a[assignmentKey],
                source: 'Everyone',
                sourceType: 'all'
            });
        } else if (assignmentKey === 'admins' && member.isAdmin) {
            tasks.push({
                key: buildAssignmentCompletionKey(assignmentKey, member.id),
                assignmentKey,
                role: a[assignmentKey],
                source: 'Admins',
                sourceType: 'admins'
            });
        } else if (assignmentKey.startsWith('group_') && member.group === assignmentKey.replace('group_', '')) {
            const groupName = assignmentKey.replace('group_', '').toUpperCase();
            tasks.push({
                key: buildAssignmentCompletionKey(assignmentKey, member.id),
                assignmentKey,
                role: a[assignmentKey],
                source: `Group ${groupName}`,
                sourceType: 'group'
            });
        } else if (assignmentKey.startsWith('person_') && member.id === assignmentKey.replace('person_', '')) {
            tasks.push({
                key: buildAssignmentCompletionKey(assignmentKey, member.id),
                assignmentKey,
                role: a[assignmentKey],
                source: 'Personal',
                sourceType: 'personal'
            });
        }
    });
    
    // Add personal subtasks (now stored as array per person)
    const ps = block.personalSubtasks || {};
    if (ps[member.id] && Array.isArray(ps[member.id])) {
        ps[member.id].forEach((text, idx) => {
            tasks.push({
                key: `subtask_${member.id}_${idx}`,
                role: text,
                source: 'Personal',
                sourceType: 'subtask'
            });
        });
    }

    if (block.type === 'assembly' && Array.isArray(block.assemblyStages)) {
        const stages = getAssemblyStages(block);
        stages.forEach(stage => {
            if (doesMemberMatchAssignmentKey(member, stage.assignmentKey)) {
                tasks.push({
                    key: `assembly_stage_${stage.id}`,
                    role: stage.title,
                    source: 'Assembly',
                    sourceType: 'assembly',
                    stageId: stage.id,
                    locked: isAssemblyStageLockedForUser(block, member, stage.id)
                });
            }
        });
    }
    
    return tasks;
}

function buildAssignmentCompletionKey(assignmentKey, memberId) {
    return `assignment::${assignmentKey}::${memberId}`;
}

function getLegacyCompletionKeysForTaskKey(key) {
    if (!key.startsWith('assignment::')) return [];
    const parts = key.split('::');
    if (parts.length < 3) return [];
    const assignmentKey = parts[1];
    return [assignmentKey];
}

function getAssemblyStages(block) {
    if (!block || !Array.isArray(block.assemblyStages)) return [];
    return [...block.assemblyStages].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getAssemblyStageById(block, stageId) {
    if (!block || !Array.isArray(block.assemblyStages)) return null;
    return block.assemblyStages.find(stage => stage.id === stageId) || null;
}

function doesMemberMatchAssignmentKey(member, assignmentKey) {
    if (!assignmentKey || !member) return false;
    if (assignmentKey === 'all') return true;
    if (assignmentKey === 'admins') return !!member.isAdmin;
    if (assignmentKey.startsWith('group_')) return member.group === assignmentKey.replace('group_', '');
    if (assignmentKey.startsWith('person_')) return member.id === assignmentKey.replace('person_', '');
    return false;
}

function isAssemblyStageLockedForUser(block, member, stageId) {
    if (!block || block.type !== 'assembly') return false;
    const stage = getAssemblyStageById(block, stageId);
    if (!stage) return false;

    const deps = Array.isArray(stage.dependsOn) ? stage.dependsOn : [];
    if (!deps.length) return false;

    return deps.some(depStageId => {
        const depKey = `assembly_stage_${depStageId}`;
        return !isKeyCompleted(block, depKey);
    });
}

function canToggleTaskKey(block, member, key) {
    if (!block || !member || !key) return false;
    if (key.startsWith('assembly_stage_')) {
        const stageId = key.replace('assembly_stage_', '');
        return !isAssemblyStageLockedForUser(block, member, stageId);
    }
    return true;
}

/** Get just the first matching role (for display) */
function getUserAssignment(block) {
    const info = getUserAssignmentInfo(block);
    return info.role;
}

function getUserAssignmentInfo(block, user = currentUser) {
    if (!user) return { key: null, role: null };
    const tasks = getAllAssignmentsForMember(user, block);
    return tasks.length > 0 ? tasks[0] : { key: null, role: null };
}

/** Check if a specific completion key is done for a block */
function isKeyCompleted(block, key) {
    const completions = block.completions || {};
    if (completions[key] && completions[key].completed) return true;

    const legacyKeys = getLegacyCompletionKeysForTaskKey(key);
    return legacyKeys.some(legacyKey => completions[legacyKey] && completions[legacyKey].completed);
}

/** Check if any of the user's tasks is completed (legacy check) */
function isPersonTaskCompleted(block, personId) {
    const completions = block.completions || {};
    return !!(completions['task_person_' + personId] && completions['task_person_' + personId].completed);
}

/** Get group progress for an assignment key */
function getKeyGroupProgress(block, key) {
    const a = block.assignments || {};
    const completions = block.completions || {};
    const role = a[key];
    if (!role) return null;

    let members = [];
    if (key === 'all') members = allMembers;
    else if (key === 'admins') members = allMembers.filter(m => m.isAdmin);
    else if (key.startsWith('group_')) {
        const group = key.replace('group_', '');
        members = allMembers.filter(m => m.group === group);
    } else {
        return null; // personal assignments don't have group progress
    }

    const done = members.filter(m => {
        const taskKey = buildAssignmentCompletionKey(key, m.id);
        if (completions[taskKey] && completions[taskKey].completed) return true;

        // Backward compatibility with legacy key format.
        return !!(completions[key] && completions[key].completed);
    }).length;

    return { done, total: members.length, role };
}

/** Get all progress strings for a block */
function getGroupProgress(block) {
    const a = block.assignments || {};
    const progressParts = [];
    
    Object.keys(a).forEach(key => {
        const prog = getKeyGroupProgress(block, key);
        if (prog) {
            progressParts.push(`${prog.done}/${prog.total}`);
        }
    });
    
    if (progressParts.length > 0) return '👥 ' + progressParts.join(' · ');
    return null;
}

// =============================================
// SCHEDULE
// =============================================
function loadDaySchedule(day) {
    const timeline = document.getElementById('timeline');
    timeline.innerHTML = '<div class="timeline-loading">Loading schedule...</div>';

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
                completions: a.completions || {},
                assemblyStages: Array.isArray(a.assemblyStages) ? a.assemblyStages : []
            }));

            const data = { events: blocks };
            allScheduleData[day] = data;
            renderTimeline(day, data);
            updateCurrentTask();
            updateNextEvent();
            if (activityDetailState.activityId && document.getElementById('activityDetailModal').classList.contains('active')) {
                renderActivityDetail(activityDetailState.activityId);
            }
        }, (err) => {
            console.error('Schedule error:', err);
            if (err.code === 'permission-denied') {
                timeline.innerHTML = '<div class="timeline-loading">Permission denied in Firestore.</div>';
                return;
            }
            if (err.code === 'failed-precondition') {
                timeline.innerHTML = '<div class="timeline-loading">Firestore configuration incomplete.</div>';
                return;
            }
            timeline.innerHTML = '<div class="timeline-loading">Error loading schedule.</div>';
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
    const allBlocks = data ? data.events || [] : [];
    const now = new Date();

    let blocks = allBlocks;
    if (currentFilter === 'my') {
        blocks = allBlocks.filter(b => !!getUserAssignment(b));
    } else if (currentFilter === 'active') {
        blocks = allBlocks.filter(b => isBlockActive(b, day, now));
    }

    if (!blocks.length) {
        timeline.innerHTML = '<div class="timeline-loading">No activities to show for this filter.</div>';
        return;
    }

    let html = '';
    blocks.forEach((block, idx) => {
        const isActive = isBlockActive(block, day, now);
        const userTasks = getAllAssignmentsForMember(currentUser, block);
        const anyCompleted = userTasks.some(t => isKeyCompleted(block, t.key));
        const allCompleted = userTasks.length > 0 && userTasks.every(t => isKeyCompleted(block, t.key));
        const assignees = getAssigneesForBlock(block);

        html += `<div class="timeline-item ${isActive ? 'active' : ''} ${allCompleted ? 'completed' : ''}" data-activity-id="${block.id}">
            <div style="position:relative;flex-shrink:0;width:12px">
                <div class="timeline-dot"></div>
                ${idx < blocks.length - 1 ? '<div class="timeline-line"></div>' : ''}
            </div>
            <div class="timeline-card">
                <div class="timeline-card-header">
                    <span class="timeline-time">${block.start} – ${block.end}</span>
                    <span class="timeline-type" style="background:${getTypeColor(block.type)}20;color:${getTypeColor(block.type)}">${block.icon || '📋'} ${getTypeName(block.type)}</span>
                </div>
                <div class="timeline-title">${block.title}</div>
                ${block.description ? `<div class="timeline-desc">${block.description}</div>` : ''}`;

        // User's tasks with inline checkboxes
        if (userTasks.length > 0) {
            html += `<div class="timeline-subtasks">`;
            userTasks.forEach(t => {
                const completed = isKeyCompleted(block, t.key);
                const badgeClass = getSourceBadgeClass(t.sourceType);
                const isLocked = !!t.locked;
                html += `<div class="timeline-subtask-row ${completed ? 'done' : ''}" data-completion-key="${t.key}" data-activity-id="${block.id}">
                    ${makeCheckCircleHtml(completed, `small ${isLocked ? 'locked' : ''}`)}
                    <span class="timeline-subtask-text">${t.role}</span>
                    <span class="source-badge ${badgeClass}">${getSourceDisplay(t.sourceType)}</span>
                </div>`;
            });
            html += `</div>`;
        }

        // Group progress (mini bar)
        const assignmentKeys = Object.keys(block.assignments || {});
        let hasGroupProgress = false;
        assignmentKeys.forEach(key => {
            const prog = getKeyGroupProgress(block, key);
            if (prog && prog.total > 1) {
                hasGroupProgress = true;
                const pct = Math.round((prog.done / prog.total) * 100);
                html += `<div class="timeline-group-progress">
                    <span>${prog.role}:</span>
                    <div class="timeline-group-progress-bar">
                        <div class="timeline-group-progress-fill" style="width:${pct}%"></div>
                    </div>
                    <span>${prog.done}/${prog.total}</span>
                </div>`;
            }
        });

        // Assignee avatars
        html += `${assignees.length > 0 ? `
                <div class="timeline-assignees" style="margin-top:8px">
                    ${assignees.slice(0, 5).map(a => `
                        <div class="assignee-avatar" style="background:${getMemberColor(a)}" title="${a.name}">${getMemberInitial(a.name)}</div>
                    `).join('')}
                    ${assignees.length > 5 ? `<span class="assignee-more">+${assignees.length - 5}</span>` : ''}
                </div>` : ''}
            </div>
        </div>`;
    });

    timeline.innerHTML = html;

    // Click handlers for timeline cards (open detail)
    timeline.querySelectorAll('.timeline-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.closest('.check-circle')) return;
            openActivityDetail(item.dataset.activityId);
        });
    });

    // Click handlers for inline checkboxes
    timeline.querySelectorAll('.timeline-subtask-row .check-circle').forEach(check => {
        check.addEventListener('click', async (e) => {
            e.stopPropagation();
            const row = check.closest('.timeline-subtask-row');
            const activityId = row.dataset.activityId;
            const key = row.dataset.completionKey;
            const found = findActivityById(activityId);
            if (!found || !canToggleTaskKey(found.activity, currentUser, key)) return;
            const isDone = check.classList.contains('checked');
            await toggleKeyCompletion(activityId, key, !isDone);
        });
    });
}

function getTypeName(type) {
    const names = {
        team_activity: 'Activity', meeting: 'Meeting', competition: 'Competition',
        practice: 'Practice', meal: 'Meal', free_time: 'Free',
        assembly: 'Assembly',
        hotel_departure: 'Departure', venue_departure: 'Departure'
    };
    return names[type] || type.replace('_', ' ');
}

function getTypeColor(type) {
    const colors = {
        team_activity: '#58a6ff', meeting: '#bc8cff', competition: '#f85149',
        practice: '#3fb950', meal: '#d29922', free_time: '#6e7681',
        assembly: '#39d2c0',
        hotel_departure: '#58a6ff', venue_departure: '#f0883e'
    };
    return colors[type] || '#8b949e';
}

function getAssigneesForBlock(block) {
    const a = block.assignments || {};
    const assigneeIds = new Set();
    const assignByKey = (key) => {
        if (key === 'all') allMembers.forEach(m => assigneeIds.add(m.id));
        else if (key === 'admins') allMembers.filter(m => m.isAdmin).forEach(m => assigneeIds.add(m.id));
        else if (key.startsWith('group_')) {
            const group = key.replace('group_', '');
            allMembers.filter(m => m.group === group).forEach(m => assigneeIds.add(m.id));
        } else if (key.startsWith('person_')) assigneeIds.add(key.replace('person_', ''));
    };

    Object.keys(a).forEach(assignByKey);

    if (block.type === 'assembly' && Array.isArray(block.assemblyStages)) {
        block.assemblyStages.forEach(stage => {
            if (stage && stage.assignmentKey) assignByKey(stage.assignmentKey);
        });
    }

    return allMembers.filter(m => assigneeIds.has(m.id));
}

function isBlockActive(block, day, now) {
    const start = parseTimeToDate(block.start, day);
    const end = parseTimeToDate(block.end, day);
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const t = nowBrasil.getTime();
    return t >= start.getTime() && t < end.getTime();
}

// =============================================
// CURRENT TASK (Now Playing)
// =============================================
function updateCurrentTask() {
    const now = new Date();
    const data = allScheduleData[currentDay];
    if (!data || !data.events) {
        document.getElementById('currentTaskCard').style.display = 'none';
        return;
    }

    const allVisible = data.events.filter(b => !!getUserAssignment(b));
    if (!allVisible.length) {
        document.getElementById('currentTaskCard').style.display = 'none';
        return;
    }

    let activeBlock = null;
    for (const block of allVisible) {
        if (isBlockActive(block, currentDay, now)) { activeBlock = block; break; }
    }

    const card = document.getElementById('currentTaskCard');
    if (activeBlock) {
        card.style.display = 'block';
        document.getElementById('currentTaskTime').textContent = `${activeBlock.start} – ${activeBlock.end}`;
        document.getElementById('currentTaskIcon').textContent = activeBlock.icon || '📋';
        document.getElementById('currentTaskTitle').textContent = activeBlock.title;
        document.getElementById('currentTaskRole').textContent = getUserAssignment(activeBlock) || '';

        const start = parseTimeToDate(activeBlock.start, currentDay);
        const end = parseTimeToDate(activeBlock.end, currentDay);
        const total = end.getTime() - start.getTime();
        const elapsed = now.getTime() - start.getTime();
        const pct = Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
        document.getElementById('currentTaskProgressFill').style.width = pct + '%';
        document.getElementById('currentTaskProgressText').textContent = pct + '%';

        const assignees = getAssigneesForBlock(activeBlock);
        document.getElementById('currentTaskPeople').textContent = `👥 ${assignees.length} people assigned`;
        document.getElementById('currentTaskStatus').textContent = '● Active';
        document.getElementById('currentTaskStatus').style.color = 'var(--accent-green)';

        card.onclick = () => openActivityDetail(activeBlock.id);
    } else {
        let next = null;
        for (const block of allVisible) {
            if (now < parseTimeToDate(block.start, currentDay)) { next = block; break; }
        }
        if (next) {
            card.style.display = 'block';
            document.getElementById('currentTaskTime').textContent = `Next: ${next.start}`;
            document.getElementById('currentTaskIcon').textContent = '⏳';
            document.getElementById('currentTaskTitle').textContent = next.title;
            document.getElementById('currentTaskRole').textContent = '';
            document.getElementById('currentTaskProgressFill').style.width = '0%';
            document.getElementById('currentTaskProgressText').textContent = 'Waiting';
            document.getElementById('currentTaskPeople').textContent = '';
            document.getElementById('currentTaskStatus').textContent = '● Upcoming';
            document.getElementById('currentTaskStatus').style.color = 'var(--accent-primary)';
            card.onclick = () => openActivityDetail(next.id);
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

    const visibleEvents = data.events.filter(b => !!getUserAssignment(b));
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
        document.getElementById('nextEventText').textContent = `${next.icon || '📋'} ${next.title} · ${next.start}`;
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
        document.getElementById('teamCount').textContent = allMembers.length + ' members';
        if (document.getElementById('teamView').classList.contains('active')) renderTeamGrid();
    });
}

function renderTeamGrid() {
    const grid = document.getElementById('teamGrid');
    const blocks = allScheduleData[currentDay] ? allScheduleData[currentDay].events : [];

    let filtered = allMembers;
    if (currentTeamFilter !== 'all') {
        filtered = allMembers.filter(m => m.group === currentTeamFilter);
    }

    if (!filtered.length) {
        grid.innerHTML = '<div class="team-loading">No members found.</div>';
        return;
    }

    let html = '';
    filtered.forEach(member => {
        const task = getMemberCurrentTask(member, blocks);
        const initial = getMemberInitial(member.name);
        const color = getMemberColor(member);
        const badge = member.isAdmin ? '⭐' : '';
        const hasAccount = !!member.password;
        const status = hasAccount ? 'online' : 'offline';

        html += `<div class="team-member-card" data-member-id="${member.id}">
            <div class="team-member-avatar" style="background:${color}">${initial}</div>
            <div class="team-member-info">
                <div class="team-member-name">${member.name || member.id} ${badge}</div>
                <div class="team-member-task">${task || (hasAccount ? 'No current task' : 'Not registered')}</div>
            </div>
            <div class="team-member-group group-${member.group}">${member.group}</div>
            <div class="team-member-status ${status}"></div>
        </div>`;
    });
    grid.innerHTML = html;

    grid.querySelectorAll('.team-member-card').forEach(card => {
        card.addEventListener('click', () => {
            const memberId = card.dataset.memberId;
            const member = allMembers.find(m => m.id === memberId);
            if (member) openPersonDetail(member);
        });
    });
}

function getMemberCurrentTask(member, blocks) {
    if (!blocks) return null;
    const now = new Date();
    for (const block of blocks) {
        if (isBlockActive(block, currentDay, now)) {
            const tasks = getAllAssignmentsForMember(member, block);
            if (tasks.length > 0) return tasks[0].role;
        }
    }
    return null;
}

// =============================================
// TASKS VIEW (with source badges + animated checkboxes)
// =============================================
function loadTasksView() {
    const list = document.getElementById('tasksList');
    const days = SCHEDULE_DAYS;
    let allTasks = [];

    days.forEach(day => {
        const data = allScheduleData[day];
        if (!data || !data.events) return;
        data.events.forEach(block => {
            const tasks = getAllAssignmentsForMember(currentUser, block);
            tasks.forEach(t => {
                const completed = isKeyCompleted(block, t.key);
                allTasks.push({
                    day, block, role: t.role, source: t.source, sourceType: t.sourceType,
                    key: t.key, completed, activityId: block.id
                });
            });
        });
    });

    if (currentTaskFilter === 'pending') allTasks = allTasks.filter(t => !t.completed);
    if (currentTaskFilter === 'completed') allTasks = allTasks.filter(t => t.completed);

    document.getElementById('tasksCount').textContent = allTasks.length + ' tasks';

    if (!allTasks.length) {
        list.innerHTML = '<div class="tasks-loading">No tasks found.</div>';
        return;
    }

    let html = '';
    allTasks.forEach(task => {
        const badgeClass = getSourceBadgeClass(task.sourceType);

        html += `<div class="task-card ${task.completed ? 'done' : ''}" data-activity-id="${task.activityId}" data-completion-key="${task.key}">
            <div class="task-card-header">
                <span class="task-card-day">${getShortDayName(task.day)} ${task.day.substring(8)}</span>
                <span class="task-card-time">${task.block.start}</span>
            </div>
            <div class="task-card-body">
                ${makeCheckCircleHtml(task.completed, '')}
                <div class="task-card-content">
                    <div class="task-card-title">${task.block.icon || '📋'} ${task.block.title}</div>
                    <div class="task-card-role">${task.role}</div>
                    <div class="task-card-bottom">
                        <span class="source-badge ${badgeClass}">${getSourceDisplay(task.sourceType)}</span>
                        <span style="font-size:11px;color:${task.completed ? 'var(--accent-green)' : 'var(--text-muted)'}">
                            ${task.completed ? 'Completed' : 'Pending'}
                        </span>
                    </div>
                </div>
            </div>
        </div>`;
    });
    list.innerHTML = html;

    list.querySelectorAll('.task-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.check-circle')) return;
            openActivityDetail(card.dataset.activityId);
        });
    });

    list.querySelectorAll('.task-card .check-circle').forEach(check => {
        check.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = check.closest('.task-card');
            const activityId = card.dataset.activityId;
            const completionKey = card.dataset.completionKey;
            if (!completionKey) return;
            const found = findActivityById(activityId);
            if (!found || !canToggleTaskKey(found.activity, currentUser, completionKey)) return;
            const isDone = check.classList.contains('checked');
            await toggleKeyCompletion(activityId, completionKey, !isDone);
        });
    });
}

// =============================================
// ACTIVITY DETAIL MODAL (with per-key sub-tasks)
// =============================================
function setupActivityDetailModal() {
    const closeBtn = document.getElementById('activityDetailClose');
    const backdrop = document.getElementById('activityDetailModal');
    if (closeBtn) closeBtn.addEventListener('click', closeActivityDetail);
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target.id === 'activityDetailModal') closeActivityDetail();
        });
    }

    const subtasksEl = document.getElementById('activityDetailSubtasks');
    if (subtasksEl && subtasksEl.dataset.bound !== 'true') {
        subtasksEl.dataset.bound = 'true';
        subtasksEl.addEventListener('click', async (e) => {
            const check = e.target.closest('.check-circle');
            if (!check) return;

            const row = check.closest('.subtask-row');
            if (!row) return;

            const activityId = activityDetailState.activityId;
            const completionKey = row.dataset.completionKey;
            if (!activityId || !completionKey) return;

            const found = findActivityById(activityId);
            if (!found || !canToggleTaskKey(found.activity, currentUser, completionKey)) return;

            const isDone = check.classList.contains('checked');
            await toggleKeyCompletion(activityId, completionKey, !isDone);
        });
    }
}

function closeActivityDetail() {
    document.getElementById('activityDetailModal').classList.remove('active');
    activityDetailState.activityId = null;
}

function findActivityById(activityId) {
    for (const day of SCHEDULE_DAYS) {
        const data = allScheduleData[day];
        if (data && data.events) {
            const activity = data.events.find(e => e.id === activityId);
            if (activity) return { activity, day };
        }
    }
    return null;
}

function isActivityWindowClosed(activity, day) {
    const nowBrasil = new Date(new Date().toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const end = parseTimeToDate(activity.end, day);
    return nowBrasil.getTime() >= end.getTime();
}

function renderActivityDetail(activityId) {
    const found = findActivityById(activityId);
    if (!found) {
        closeActivityDetail();
        return;
    }
    const activity = found.activity;
    const activityDay = found.day;

    document.getElementById('activityDetailTitle').textContent = `${activity.icon || '📋'} ${activity.title}`;
    document.getElementById('activityDetailTime').textContent = `${activity.start} – ${activity.end}`;
    document.getElementById('activityDetailGeneral').textContent = activity.description || 'No description.';

    // Get ALL tasks for the current user
    const userTasks = getAllAssignmentsForMember(currentUser, activity);
    const mainRole = getUserAssignment(activity);
    document.getElementById('activityDetailRole').textContent = mainRole || 'No specific task';

    // Show group progress
    const groupProgress = getGroupProgress(activity);
    const progressEl = document.getElementById('activityDetailGroupProgress');
    const progressSection = document.getElementById('activityDetailGroupProgressSection');
    if (groupProgress && progressEl && progressSection) {
        progressEl.textContent = groupProgress;
        progressSection.style.display = 'block';
    } else if (progressSection) {
        progressSection.style.display = 'none';
    }

    // Show all sub-tasks with per-key toggles
    const subtasksSection = document.getElementById('activityDetailSubtasksSection');
    const subtasksEl = document.getElementById('activityDetailSubtasks');
    
    if (subtasksEl && userTasks.length > 0) {
        subtasksEl.innerHTML = userTasks.map(t => {
            const completed = isKeyCompleted(activity, t.key);
            const badgeClass = getSourceBadgeClass(t.sourceType);
            const isLocked = !!t.locked;
            return `
                <div class="subtask-row ${completed ? 'done' : ''} ${isLocked ? 'locked' : ''}" data-completion-key="${t.key}">
                    ${makeCheckCircleHtml(completed, isLocked ? 'locked' : '')}
                    <div class="subtask-row-info">
                        <span class="subtask-row-text">${t.role}</span>
                        <div class="subtask-row-meta">
                            <span class="source-badge ${badgeClass}">${getSourceDisplay(t.sourceType)}</span>
                            <span class="subtask-row-status">${completed ? 'Completed' : (isLocked ? 'Locked' : 'Pending')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        subtasksSection.style.display = 'block';
    } else if (subtasksSection) {
        subtasksSection.style.display = 'none';
    }

    // Assigned people
    const assignees = getAssigneesForBlock(activity);
    const assigneesEl = document.getElementById('activityDetailAssignees');
    if (assignees.length > 0) {
        assigneesEl.innerHTML = assignees.map(a => `
            <div class="modal-person">
                <div class="modal-person-avatar" style="background:${getMemberColor(a)}">${getMemberInitial(a.name)}</div>
                <span>${a.name}</span>
            </div>
        `).join('');
    } else {
        assigneesEl.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">No specific assignments</span>';
    }

    // "Mark all done" button
    const toggleBtn = document.getElementById('activityDetailTaskToggleBtn');
    const allDone = userTasks.length > 0 && userTasks.every(t => isKeyCompleted(activity, t.key));
    const toggleableTasks = userTasks.filter(t => canToggleTaskKey(activity, currentUser, t.key));
    toggleBtn.style.display = 'inline-flex';
    
    if (toggleableTasks.length > 1) {
        toggleBtn.textContent = allDone ? '✓ All tasks done' : 'Mark all my tasks done';
        toggleBtn.className = allDone ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small';
        toggleBtn.disabled = false;
        toggleBtn.onclick = async () => {
            const newState = !allDone;
            await Promise.all(toggleableTasks.map(t => toggleKeyCompletion(activity.id, t.key, newState)));
        };
    } else if (toggleableTasks.length === 1) {
        const t = toggleableTasks[0];
        const completed = isKeyCompleted(activity, t.key);
        toggleBtn.textContent = completed ? '✓ Completed' : 'Mark as done';
        toggleBtn.className = completed ? 'btn btn-primary btn-small' : 'btn btn-outline btn-small';
        toggleBtn.disabled = false;
        toggleBtn.onclick = () => toggleKeyCompletion(activity.id, t.key, !completed);
    } else if (userTasks.length > 0) {
        toggleBtn.textContent = 'Tasks are locked by sequence';
        toggleBtn.className = 'btn btn-outline btn-small';
        toggleBtn.disabled = true;
        toggleBtn.onclick = null;
    } else {
        toggleBtn.style.display = 'none';
        toggleBtn.onclick = null;
    }

    // Admin group complete button
    const groupBtn = document.getElementById('activityDetailGroupCompleteBtn');
    const canForceComplete = currentUser.isAdmin && assignees.length > 0 && isActivityWindowClosed(activity, activityDay);
    if (canForceComplete) {
        groupBtn.style.display = 'inline-flex';
        groupBtn.textContent = '✓ Complete for all';
        groupBtn.disabled = false;
        groupBtn.onclick = async () => {
            const fresh = findActivityById(activity.id);
            if (!fresh) return;
            const updates = [];
            getAssigneesForBlock(fresh.activity).forEach(member => {
                getAllAssignmentsForMember(member, fresh.activity).forEach(task => {
                    updates.push(toggleKeyCompletion(fresh.activity.id, task.key, true));
                });
            });
            await Promise.all(updates);
        };
    } else {
        groupBtn.style.display = 'none';
        groupBtn.disabled = true;
        groupBtn.onclick = null;
    }

    const groupHint = document.getElementById('activityDetailGroupHint');
    if (groupHint) {
        const showHint = currentUser.isAdmin && assignees.length > 0 && !isActivityWindowClosed(activity, activityDay);
        groupHint.style.display = showHint ? 'block' : 'none';
        if (showHint) {
            groupHint.textContent = 'Admin bulk complete unlocks when this activity time window ends.';
        }
    }

    if (activity.type === 'assembly') {
        document.getElementById('activityDetailRole').textContent = mainRole || 'Sequential assembly activity';
    }
}

function openActivityDetail(activityId) {
    activityDetailState.activityId = activityId;
    renderActivityDetail(activityId);

    document.getElementById('activityDetailModal').classList.add('active');
}

// =============================================
// FIREBASE TOGGLE (per-key)
// =============================================
async function toggleKeyCompletion(activityId, completionKey, completed) {
    try {
        const ref = db.collection('activities').doc(activityId);
        const doc = await ref.get();
        if (!doc.exists) return;

        const data = doc.data();
        const completions = data.completions || {};
        
        if (completed) {
            completions[completionKey] = {
                completed: true,
                completedAt: new Date().toISOString(),
                completedBy: currentUser.id
            };
        } else {
            // Remove the completion entry entirely for clean uncheck
            delete completions[completionKey];
        }
        
        await ref.update({ completions: completions });
    } catch (err) {
        alert('Could not update: ' + err.message);
    }
}

/** Legacy: toggle task_person_<id> key (kept for backwards compat) */
async function toggleCompletionForCurrentUser(activityId, completionKey, completed) {
    await toggleKeyCompletion(activityId, completionKey, completed);
}

// =============================================
// PERSON DETAIL MODAL
// =============================================
function setupPersonDetailModal() {
    const closeBtn = document.getElementById('personDetailClose');
    const backdrop = document.getElementById('personDetailModal');
    if (closeBtn) closeBtn.addEventListener('click', () => {
        document.getElementById('personDetailModal').classList.remove('active');
    });
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            if (e.target.id === 'personDetailModal') document.getElementById('personDetailModal').classList.remove('active');
        });
    }
}

function openPersonDetail(member) {
    const content = document.getElementById('personDetailContent');
    const color = getMemberColor(member);
    const initial = getMemberInitial(member.name);
    const hasAccount = !!member.password;

    let totalTasks = 0;
    let completedTasks = 0;
    SCHEDULE_DAYS.forEach(day => {
        const data = allScheduleData[day];
        if (!data || !data.events) return;
        data.events.forEach(block => {
            const tasks = getAllAssignmentsForMember(member, block);
            if (tasks.length > 0) {
                totalTasks++;
                if (tasks.some(t => isKeyCompleted(block, t.key))) completedTasks++;
            }
        });
    });

    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    content.innerHTML = `
        <div class="person-detail">
            <div class="person-detail-header">
                <div class="person-detail-avatar" style="background:${color}">${initial}</div>
                <div>
                    <div class="person-detail-name">${member.name || member.id} ${member.isAdmin ? '⭐' : ''}</div>
                    <div class="person-detail-group">${member.group ? member.group.toUpperCase() : 'No group'} · ${hasAccount ? 'Registered' : 'Not registered'}</div>
                </div>
            </div>
            <div class="person-detail-stats">
                <div class="stat-item"><span class="stat-value">${totalTasks}</span><span class="stat-label">Tasks</span></div>
                <div class="stat-item"><span class="stat-value">${completedTasks}</span><span class="stat-label">Done</span></div>
                <div class="stat-item"><span class="stat-value">${pct}%</span><span class="stat-label">Complete</span></div>
            </div>
            <div class="progress-bar" style="margin:12px 0"><div class="progress-bar-fill" style="width:${pct}%;background:var(--accent-green)"></div></div>
            <hr style="border:none;border-top:1px solid var(--border-color);margin:12px 0">
            <h4 style="font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Weekly Schedule</h4>
            ${SCHEDULE_DAYS.map(day => {
                const data = allScheduleData[day];
                const dayBlocks = data ? data.events || [] : [];
                const memberBlocks = dayBlocks.filter(b => getAllAssignmentsForMember(member, b).length > 0);
                return `
                    <div class="weekly-day-block">
                        <h4>${getShortDayName(day)} ${day.substring(8)}</h4>
                        ${memberBlocks.length > 0 ? memberBlocks.map(b => `
                            <div class="weekly-row">
                                <strong>${b.start}</strong> — ${b.title}
                                <div class="weekly-meta">${getAllAssignmentsForMember(member, b).map(t => t.role).join(', ')}</div>
                            </div>
                        `).join('') : '<div class="weekly-row empty">No tasks</div>'}
                    </div>
                `;
            }).join('')}
        </div>
    `;

    document.getElementById('personDetailModal').classList.add('active');
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

console.log('SEM Brasil 2026 - Redesign v4 loaded (per-key completions + animated checkboxes)');