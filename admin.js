// =============================================
// SEM Brasil 2026 - Admin Panel (Redesign v3)
// Segmented assignment + Array-based sub-tasks
// =============================================

let adminMembers = [];
let adminClockInterval = null;
const SCHEDULE_DAYS = ['2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26','2026-08-27'];
let adminActivities = [];

function getBrasilTodayISO() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: BRASIL_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}

function getDefaultScheduleDay() {
    const today = getBrasilTodayISO();
    if (today <= SCHEDULE_DAYS[0]) return SCHEDULE_DAYS[0];
    if (today >= SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1]) return SCHEDULE_DAYS[SCHEDULE_DAYS.length - 1];
    for (const day of SCHEDULE_DAYS) { if (day >= today) return day; }
    return SCHEDULE_DAYS[0];
}

function parseActivityTime(timeStr, dayStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const d = new Date(dayStr + 'T12:00:00');
    d.setHours(h, m, 0, 0);
    return d;
}

// =============================================
// AUTH
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
            errorEl.textContent = 'Invalid credentials or not an admin';
        }
    } catch (err) {
        errorEl.textContent = 'Connection error. Is Firestore enabled?';
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
    document.getElementById('adminCurrentTime').textContent = now.toLocaleTimeString('en-US', {
        timeZone: BRASIL_TIMEZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
    document.getElementById('adminCurrentDate').textContent = now.toLocaleDateString('en-US', {
        timeZone: BRASIL_TIMEZONE, weekday: 'long', day: 'numeric', month: 'long'
    });
}

// =============================================
// INIT
// =============================================
function initAdmin() {
    setupAdminTabs();
    loadAdminMembers();
    loadAdminActivities();
    setupDashboardDaySelect();
    setupActivitiesDaySelect();
    setupActivityForm();
    setupAssignPanel();
    setupMemberForm();
    setupAssignDaySelect();
    setupAssignScopeSegmented();

    const defaultDay = getDefaultScheduleDay();
    document.getElementById('dashboardDaySelect').value = defaultDay;
    document.getElementById('activitiesDaySelect').value = defaultDay;
    document.getElementById('assignDaySelect').value = defaultDay;
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
            if (tab.dataset.tab === 'assign') refreshAssignPanel();
            if (tab.dataset.tab === 'people') refreshMembersList();
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
            adminMembers.push(data);
        });
        refreshMembersList();
        populateAssignPersonSelectors();
        refreshDashboard();
    });
}

function refreshMembersList() {
    const container = document.getElementById('membersListContent');
    if (!adminMembers.length) {
        container.innerHTML = '<p class="text-muted">No members registered.</p>';
        return;
    }

    const groups = ['alpha', 'beta', 'gamma', 'delta'];
    const labels = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma', delta: 'Delta' };
    const groupedMembers = {
        alpha: adminMembers.filter(m => m.group === 'alpha'),
        beta: adminMembers.filter(m => m.group === 'beta'),
        gamma: adminMembers.filter(m => m.group === 'gamma'),
        delta: adminMembers.filter(m => m.group === 'delta')
    };

    let html = '';
    groups.forEach(group => {
        const members = groupedMembers[group];
        if (!members.length) return;
        html += `<div style="margin:12px 0 8px;font-weight:700;color:var(--text-secondary);font-size:13px">${labels[group]} (${members.length})</div>`;
        members.forEach(m => {
            const isAdmin = m.isAdmin ? '⭐' : '';
            const registered = m.password ? '✓' : '○';
            html += `<div class="member-item">
                <div class="member-item-info">
                    <strong>${m.name || m.id} ${isAdmin}</strong>
                    <div style="font-size:11px;color:var(--text-muted)">@${m.id} · ${m.role || 'No role'} · ${registered}</div>
                </div>
                <div class="member-item-actions" style="display:flex;align-items:center;gap:4px;flex-shrink:0">
                    <select onchange="changeGroup('${m.id}', this.value)" style="width:auto;padding:4px 20px 4px 6px;font-size:11px;background:var(--bg-primary);border:1px solid var(--border-color);border-radius:4px;color:var(--text-primary)">
                        <option value="alpha" ${m.group === 'alpha' ? 'selected' : ''}>Alpha</option>
                        <option value="beta" ${m.group === 'beta' ? 'selected' : ''}>Beta</option>
                        <option value="gamma" ${m.group === 'gamma' ? 'selected' : ''}>Gamma</option>
                        <option value="delta" ${m.group === 'delta' ? 'selected' : ''}>Delta</option>
                    </select>
                    <button class="btn-icon-small" onclick="toggleAdmin('${m.id}')" title="Toggle admin">⭐</button>
                    <button class="btn-icon-small" onclick="deleteMember('${m.id}')" title="Delete">🗑️</button>
                </div>
            </div>`;
        });
    });
    container.innerHTML = html;
}

function populateAssignPersonSelectors() {
    // Person selector in new assignment card
    const personSelect = document.getElementById('assignPersonSelect');
    if (personSelect) {
        personSelect.innerHTML = '<option value="">Select person...</option>';
        adminMembers.forEach(m => {
            personSelect.innerHTML += `<option value="${m.id}">${m.name || m.id} (${m.group.toUpperCase()})</option>`;
        });
    }

    // Person selector in sub-tasks card
    const subtaskSelect = document.getElementById('subtaskPersonSelect');
    if (subtaskSelect) {
        subtaskSelect.innerHTML = '<option value="">Select person...</option>';
        adminMembers.forEach(m => {
            subtaskSelect.innerHTML += `<option value="${m.id}">${m.name || m.id} (${m.group.toUpperCase()})</option>`;
        });
    }
}

async function toggleAdmin(id) {
    const doc = await db.collection('members').doc(id).get();
    if (doc.exists) {
        const current = doc.data().isAdmin || false;
        await db.collection('members').doc(id).update({ isAdmin: !current });
    }
}

async function changeGroup(id, group) {
    try { await db.collection('members').doc(id).update({ group: group }); }
    catch (err) { alert('Error: ' + err.message); }
}

async function deleteMember(id) {
    if (!confirm('Delete this member?')) return;
    try { await db.collection('members').doc(id).delete(); }
    catch (err) { alert('Error: ' + err.message); }
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
        const role = document.getElementById('memberRole').value.trim() || 'Member';
        const btn = e.target.querySelector('.btn');

        btn.classList.add('loading');
        try {
            const existing = await db.collection('members').doc(user).get();
            if (existing.exists) { alert('Username already exists'); btn.classList.remove('loading'); return; }
            await db.collection('members').doc(user).set({
                name, password: 'eco2026', group, role, isAdmin: false, createdAt: new Date().toISOString()
            });
            document.getElementById('memberForm').reset();
            alert('✓ Member created. User: ' + user + ' / Password: eco2026');
        } catch (err) { alert('Error: ' + err.message); }
        btn.classList.remove('loading');
    });
}

// =============================================
// ACTIVITIES
// =============================================
function loadAdminActivities() {
    db.collection('activities').onSnapshot((snapshot) => {
        adminActivities = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (!data || !data.date || !data.time || !data.title) return;
            data.id = doc.id;
            if (!data.assignments || typeof data.assignments !== 'object') data.assignments = {};
            if (!data.personalSubtasks || typeof data.personalSubtasks !== 'object') data.personalSubtasks = {};
            adminActivities.push(data);
        });
        adminActivities.sort((a, b) => {
            const da = `${a.date} ${a.time}`;
            const db = `${b.date} ${b.time}`;
            return da.localeCompare(db);
        });
        refreshActivitiesList();
        refreshDashboard();
        refreshMembersList();
        refreshAssignPanel();
    }, (err) => {
        console.error('Error loading activities:', err);
        document.getElementById('activitiesListContent').innerHTML = '<p class="text-muted">Error loading activities.</p>';
        document.getElementById('dashboardBody').innerHTML = '<tr><td colspan="5" class="loading-row">Error loading activities.</td></tr>';
    });
}

function setupActivitiesDaySelect() {
    document.getElementById('activitiesDaySelect').addEventListener('change', () => {
        refreshActivitiesList();
    });
}

function setupActivityForm() {
    document.getElementById('activityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const date = document.getElementById('activityDate').value;
        const time = document.getElementById('activityTime').value;
        const duration = parseInt(document.getElementById('activityDuration').value) || 120;
        const title = document.getElementById('activityTitle').value.trim();
        const description = document.getElementById('activityDescription').value.trim();
        const type = document.getElementById('activityType').value;
        const btn = e.target.querySelector('.btn');

        if (!date || !time || !title) { alert('Complete date, time and title'); return; }
        btn.classList.add('loading');

        try {
            await db.collection('activities').add({
                date, time, duration, title, description, type,
                icon: '📋', assignments: {}, personalSubtasks: {}, completions: {}
            });
            document.getElementById('activityForm').reset();
            document.getElementById('activityDuration').value = 120;
            document.getElementById('activityDate').value = document.getElementById('activitiesDaySelect').value;
            alert('✓ Activity created');
        } catch (err) { alert('Error: ' + err.message); }
        btn.classList.remove('loading');
    });

    const daySelect = document.getElementById('activitiesDaySelect');
    document.getElementById('activityDate').value = daySelect.value;
    daySelect.addEventListener('change', () => {
        document.getElementById('activityDate').value = daySelect.value;
    });
}

function refreshActivitiesList() {
    const day = document.getElementById('activitiesDaySelect').value;
    const dayActivities = adminActivities.filter(a => a.date === day);
    const container = document.getElementById('activitiesListContent');

    if (!dayActivities.length) {
        container.innerHTML = '<p class="text-muted">No activities for this day.</p>';
        return;
    }

    let html = '';
    dayActivities.forEach(activity => {
        const assignCount = Object.keys(activity.assignments || {}).length;
        const subtaskCount = countSubtasks(activity.personalSubtasks);
        html += `<div class="event-item" style="margin-bottom:6px;padding:10px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border-color)">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <div>
                    <strong style="color:var(--accent-primary);font-size:13px">${activity.time} (${activity.duration}min)</strong>
                    <div style="font-weight:600;font-size:14px">${activity.title}</div>
                    <div style="font-size:11px;color:var(--text-muted)">${assignCount} assignments · ${subtaskCount} sub-tasks</div>
                </div>
                <button class="btn-icon-small" onclick="deleteActivity('${activity.id}')" title="Delete">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

function countSubtasks(subtasks) {
    if (!subtasks || typeof subtasks !== 'object') return 0;
    let count = 0;
    Object.values(subtasks).forEach(val => {
        if (Array.isArray(val)) count += val.length;
    });
    return count;
}

async function deleteActivity(id) {
    if (!confirm('Delete this activity?')) return;
    try { await db.collection('activities').doc(id).delete(); }
    catch (err) { alert('Error: ' + err.message); }
}

// =============================================
// ASSIGNMENTS PANEL (Redesigned)
// =============================================

/** Setup segmented control for assignment scope */
function setupAssignScopeSegmented() {
    const container = document.getElementById('assignScopeSegmented');
    if (!container) return;

    container.querySelectorAll('.segmented-option').forEach(btn => {
        btn.addEventListener('click', () => {
            container.querySelectorAll('.segmented-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const scope = btn.dataset.scope;
            document.getElementById('assignGroupField').style.display = scope === 'group' ? 'block' : 'none';
            document.getElementById('assignPersonField').style.display = scope === 'person' ? 'block' : 'none';
        });
    });
}

function setupAssignDaySelect() {
    document.getElementById('assignDaySelect').addEventListener('change', () => {
        refreshAssignPanel();
    });
}

function refreshAssignPanel() {
    const day = document.getElementById('assignDaySelect').value;
    const dayActivities = adminActivities.filter(a => a.date === day);
    const select = document.getElementById('assignActivitySelect');

    select.innerHTML = '<option value="">Select an activity...</option>';
    dayActivities.forEach(a => {
        select.innerHTML += `<option value="${a.id}">${a.time} - ${a.title}</option>`;
    });

    if (dayActivities.length > 0) {
        select.value = dayActivities[0].id;
        select.dispatchEvent(new Event('change'));
    } else {
        document.getElementById('assignPanel').style.display = 'none';
    }
}

function setupAssignPanel() {
    const select = document.getElementById('assignActivitySelect');
    select.addEventListener('change', () => {
        const activityId = select.value;
        if (activityId) {
            document.getElementById('assignPanel').style.display = 'block';
            renderCurrentAssignments(activityId);
            populateSubtaskPersonSelect(activityId);
            renderSubtasksList(activityId);
        } else {
            document.getElementById('assignPanel').style.display = 'none';
        }
    });

    // Assign button — uses segmented control for scope
    document.getElementById('assignBtn').addEventListener('click', async () => {
        const activityId = document.getElementById('assignActivitySelect').value;
        const role = document.getElementById('assignRoleInput').value.trim();

        if (!activityId || !role) { alert('Select an activity and enter a task description'); return; }

        // Determine scope from segmented control
        const activeScope = document.querySelector('#assignScopeSegmented .segmented-option.active');
        if (!activeScope) { alert('Select who to assign to'); return; }

        const scope = activeScope.dataset.scope;
        let key;

        if (scope === 'all') {
            key = 'all';
        } else if (scope === 'group') {
            const group = document.getElementById('assignGroupSelect').value;
            key = 'group_' + group;
        } else if (scope === 'person') {
            const person = document.getElementById('assignPersonSelect').value;
            if (!person) { alert('Select a person'); return; }
            key = 'person_' + person;
        }

        try {
            const docRef = db.collection('activities').doc(activityId);
            const doc = await docRef.get();
            if (!doc.exists) return;

            const data = doc.data();
            if (!data.assignments) data.assignments = {};
            data.assignments[key] = role;
            await docRef.update({ assignments: data.assignments });
            document.getElementById('assignRoleInput').value = '';
            renderCurrentAssignments(activityId);
        } catch (err) { alert('Error: ' + err.message); }
    });

    // Sub-task button — now appends to array
    document.getElementById('subtaskBtn').addEventListener('click', async () => {
        const activityId = document.getElementById('assignActivitySelect').value;
        const personId = document.getElementById('subtaskPersonSelect').value;
        const text = document.getElementById('subtaskText').value.trim();

        if (!activityId || !personId || !text) { alert('Complete all fields'); return; }

        try {
            const ref = db.collection('activities').doc(activityId);
            const doc = await ref.get();
            if (!doc.exists) return;

            const data = doc.data();
            if (!data.personalSubtasks || typeof data.personalSubtasks !== 'object') {
                data.personalSubtasks = {};
            }

            // Ensure it's an array, then push
            if (!Array.isArray(data.personalSubtasks[personId])) {
                data.personalSubtasks[personId] = [];
            }
            data.personalSubtasks[personId].push(text);

            await ref.update({ personalSubtasks: data.personalSubtasks });
            document.getElementById('subtaskText').value = '';
            populateSubtaskPersonSelect(activityId);
            renderSubtasksList(activityId);
        } catch (err) { alert('Error: ' + err.message); }
    });
}

function renderCurrentAssignments(activityId) {
    const activity = adminActivities.find(a => a.id === activityId);
    const container = document.getElementById('assignCurrentList');
    if (!activity || !activity.assignments) {
        container.innerHTML = '<p class="text-muted">No assignments yet.</p>';
        return;
    }

    const entries = Object.entries(activity.assignments);
    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">No assignments yet.</p>';
        return;
    }

    let html = '';
    entries.forEach(([key, value]) => {
        let target = key === 'all' ? '👥 Everyone' :
                     key === 'admins' ? '⭐ Admins' :
                     key.startsWith('group_') ? '🅰️ ' + key.replace('group_', '').toUpperCase() :
                     key.startsWith('person_') ? '👤 ' + key.replace('person_', '') : key;
        html += `<div class="assign-item">
            <div class="assign-item-info">
                <strong>${target}</strong>
                <div style="font-size:12px;color:var(--text-secondary)">${value}</div>
            </div>
            <button class="btn-icon-small" onclick="removeAssignment('${activityId}','${key}')" title="Remove">✖</button>
        </div>`;
    });
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

function populateSubtaskPersonSelect(activityId) {
    const select = document.getElementById('subtaskPersonSelect');
    select.innerHTML = '<option value="">Select person...</option>';

    if (!activityId) return;
    const activity = adminActivities.find(a => a.id === activityId);
    if (!activity) return;

    // Still show all members — they can have multiple sub-tasks now
    adminMembers.forEach(m => {
        select.innerHTML += `<option value="${m.id}">${m.name || m.id} (${m.group.toUpperCase()})</option>`;
    });
}

function renderSubtasksList(activityId) {
    const container = document.getElementById('subtasksList');
    if (!activityId) {
        container.innerHTML = '<p class="text-muted">Select an activity to see sub-tasks.</p>';
        return;
    }

    const activity = adminActivities.find(a => a.id === activityId);
    const subtasks = activity && activity.personalSubtasks ? activity.personalSubtasks : {};

    const entries = [];
    Object.keys(subtasks).forEach(memberId => {
        if (Array.isArray(subtasks[memberId])) {
            subtasks[memberId].forEach((text, idx) => {
                entries.push({ memberId, text, idx });
            });
        }
    });

    if (!entries.length) {
        container.innerHTML = '<p class="text-muted">No sub-tasks.</p>';
        return;
    }

    let html = '';
    entries.forEach(({ memberId, text, idx }) => {
        const member = adminMembers.find(m => m.id === memberId);
        const name = member ? member.name : memberId;
        html += `<div class="admin-subtask-item">
            <div class="subtask-info">
                <span class="subtask-person">👤 ${name}</span>
                <span class="subtask-desc">${text}</span>
            </div>
            <button class="btn-icon-small" onclick="removeSubtask('${activityId}','${memberId}',${idx})" title="Remove">✖</button>
        </div>`;
    });
    container.innerHTML = html;
}

async function removeSubtask(activityId, memberId, idx) {
    try {
        const ref = db.collection('activities').doc(activityId);
        const doc = await ref.get();
        if (!doc.exists) return;
        
        const data = doc.data();
        const map = data.personalSubtasks || {};
        if (Array.isArray(map[memberId])) {
            map[memberId].splice(idx, 1);
            // Clean up empty arrays
            if (map[memberId].length === 0) {
                delete map[memberId];
            }
        }
        await ref.update({ personalSubtasks: map });
        populateSubtaskPersonSelect(activityId);
        renderSubtasksList(activityId);
    } catch (err) { alert('Error: ' + err.message); }
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
        tbody.innerHTML = '<tr><td colspan="5" class="loading-row">No members.</td></tr>';
        if (summaryCards) summaryCards.innerHTML = '';
        return;
    }

    const dayActivities = adminActivities.filter(a => a.date === day);
    const now = new Date();
    const nowBrasil = new Date(now.toLocaleString('en-US', { timeZone: BRASIL_TIMEZONE }));
    const groupColors = { alpha: '#f85149', beta: '#58a6ff', gamma: '#3fb950', delta: '#d29922' };

    let html = '';
    adminMembers.forEach(member => {
        let currentTask = 'No task';
        let currentActivity = '—';
        let isDone = false;

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

        // Check if any task is completed (per-key model)
        for (const activity of dayActivities) {
            const comp = activity.completions || {};
            // Check all per-key completions for this member
            const completions = Object.keys(comp).filter(k => {
                return k.startsWith('person_' + member.id) || 
                       k.startsWith('subtask_' + member.id) ||
                       k === 'all' ||
                       k === 'admins' ||
                       k.startsWith('group_' + member.group);
            });
            if (completions.some(k => comp[k] && comp[k].completed)) {
                isDone = true; break;
            }
        }

        const dot = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${groupColors[member.group] || '#666'};margin-right:6px"></span>`;
        html += `<tr>
            <td>${dot}${member.name || member.id} ${member.isAdmin ? '⭐' : ''}</td>
            <td><span style="text-transform:uppercase;font-size:12px;font-weight:600;color:${groupColors[member.group]}">${member.group}</span></td>
            <td>${currentTask}</td>
            <td style="font-size:12px;color:var(--text-muted)">${currentActivity}</td>
            <td style="text-align:center">${isDone ? '✓' : '○'}</td>
        </tr>`;
    });
    tbody.innerHTML = html;

    if (summaryCards) {
        const stats = calculateDayCompletionStats(day);
        summaryCards.innerHTML = `
            <div class="summary-card"><span class="label">People</span><span class="stat">${adminMembers.length}</span></div>
            <div class="summary-card"><span class="label">Activities</span><span class="stat">${dayActivities.length}</span></div>
            <div class="summary-card"><span class="label">Completion</span><span class="stat">${stats.percent}%</span><span style="font-size:10px;color:var(--text-muted)">${stats.completed}/${stats.total}</span></div>
        `;
    }
}

function calculateDayCompletionStats(day) {
    const dayActivities = adminActivities.filter(a => a.date === day);
    let total = 0, completed = 0;

    dayActivities.forEach(activity => {
        const a = activity.assignments || {};
        const completions = activity.completions || {};

        Object.keys(a).forEach(key => {
            if (key === 'all') {
                adminMembers.forEach(m => {
                    total++;
                    if (Object.keys(completions).some(k => 
                        (k.startsWith('person_' + m.id) || k.startsWith('subtask_' + m.id)) &&
                        completions[k] && completions[k].completed
                    )) completed++;
                });
                return;
            }
            if (key === 'admins') {
                adminMembers.filter(m => m.isAdmin).forEach(m => {
                    total++;
                    if (Object.keys(completions).some(k => 
                        (k.startsWith('person_' + m.id) || k.startsWith('subtask_' + m.id)) &&
                        completions[k] && completions[k].completed
                    )) completed++;
                });
                return;
            }
            if (key.startsWith('group_')) {
                const group = key.replace('group_', '');
                adminMembers.filter(m => m.group === group).forEach(m => {
                    total++;
                    if (Object.keys(completions).some(k => 
                        (k.startsWith('person_' + m.id) || k.startsWith('subtask_' + m.id)) &&
                        completions[k] && completions[k].completed
                    )) completed++;
                });
                return;
            }
            if (key.startsWith('person_')) {
                total++;
                if (completions[key] && completions[key].completed) completed++;
            }
        });
    });

    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

console.log('SEM Brasil 2026 - Admin Panel v3 loaded (segmented control + array sub-tasks)');