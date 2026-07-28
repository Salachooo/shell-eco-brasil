// =============================================
// SEM Brasil 2026 - Admin Panel (Redesign v3)
// Segmented assignment + Array-based sub-tasks
// =============================================

let adminMembers = [];
let adminClockInterval = null;
const SCHEDULE_DAYS = ['2026-08-21','2026-08-22','2026-08-23','2026-08-24','2026-08-25','2026-08-26','2026-08-27'];
let adminActivities = [];
let currentAssignActivityId = null;
let assemblyDraggedStageId = null;

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
    setupAssemblyStageForm();
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
            if (tab.dataset.tab === 'stats') refreshStats();
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

    // Multi-person chips
    const multiPeople = document.getElementById('assignMultiPeople');
    if (multiPeople) {
        multiPeople.innerHTML = adminMembers.map(m => `
            <div class="person-chip" data-person-id="${m.id}" onclick="this.classList.toggle('active')">👤 ${m.name || m.id}</div>
        `).join('');
        
        document.getElementById('assignMultiSelectAll').onclick = () => {
            multiPeople.querySelectorAll('.person-chip').forEach(c => c.classList.add('active'));
        };
        document.getElementById('assignMultiDeselectAll').onclick = () => {
            multiPeople.querySelectorAll('.person-chip').forEach(c => c.classList.remove('active'));
        };
    }

    // Person selector in sub-tasks card
    const subtaskSelect = document.getElementById('subtaskPersonSelect');
    if (subtaskSelect) {
        subtaskSelect.innerHTML = '<option value="">Select person...</option>';
        adminMembers.forEach(m => {
            subtaskSelect.innerHTML += `<option value="${m.id}">${m.name || m.id} (${m.group.toUpperCase()})</option>`;
        });
    }

    // Person selector in assembly stage editor
    const assemblyPersonSelect = document.getElementById('assemblyStagePersonSelect');
    if (assemblyPersonSelect) {
        assemblyPersonSelect.innerHTML = '<option value="">No specific person</option>';
        adminMembers.forEach(m => {
            assemblyPersonSelect.innerHTML += `<option value="${m.id}">${m.name || m.id} (${m.group.toUpperCase()})</option>`;
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
            if (!Array.isArray(data.assemblyStages)) data.assemblyStages = [];
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
            const iconByType = {
                team_activity: '📋',
                meeting: '🧠',
                competition: '🏎️',
                practice: '🔧',
                assembly: '🔩',
                meal: '🍽️',
                free_time: '🕓'
            };

            await db.collection('activities').add({
                date, time, duration, title, description, type,
                icon: iconByType[type] || '📋', assignments: {}, personalSubtasks: {}, completions: {}, assemblyStages: []
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
                <div style="display:flex;gap:4px">
                    <button class="btn-icon-small" onclick="editActivity('${activity.id}')" title="Edit date/time">✏️</button>
                    <button class="btn-icon-small" onclick="cloneActivity('${activity.id}')" title="Clone activity">📋</button>
                    <button class="btn-icon-small" onclick="deleteActivity('${activity.id}')" title="Delete">🗑️</button>
                </div>
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
            document.getElementById('assignMultiField').style.display = scope === 'multi' ? 'block' : 'none';
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
        const preservedId = currentAssignActivityId && dayActivities.some(a => a.id === currentAssignActivityId)
            ? currentAssignActivityId
            : dayActivities[0].id;
        select.value = preservedId;
        currentAssignActivityId = preservedId;
        select.dispatchEvent(new Event('change'));
    } else {
        currentAssignActivityId = null;
        document.getElementById('assignPanel').style.display = 'none';
    }
}

function setupAssignPanel() {
    const select = document.getElementById('assignActivitySelect');
    select.addEventListener('change', () => {
        const activityId = select.value;
        currentAssignActivityId = activityId || null;
        if (activityId) {
            document.getElementById('assignPanel').style.display = 'block';
            renderCurrentAssignments(activityId);
            populateSubtaskPersonSelect(activityId);
            renderSubtasksList(activityId);
            syncAssemblyStageEditor(activityId);
        } else {
            document.getElementById('assignPanel').style.display = 'none';
            syncAssemblyStageEditor(null);
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
        } else if (scope === 'multi') {
            const selected = document.querySelectorAll('#assignMultiPeople .person-chip.active');
            if (selected.length === 0) { alert('Select at least one person'); return; }
            try {
                const docRef = db.collection('activities').doc(activityId);
                const doc = await docRef.get();
                if (!doc.exists) return;
                const data = doc.data();
                if (!data.assignments) data.assignments = {};
                selected.forEach(chip => {
                    data.assignments['person_' + chip.dataset.personId] = role;
                });
                await docRef.update({ assignments: data.assignments });
                document.getElementById('assignRoleInput').value = '';
                renderCurrentAssignments(activityId);
                return;
            } catch (err) { alert('Error: ' + err.message); return; }
        } else { alert('Select who to assign to'); return; }

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

function isAssemblyActivity(activity) {
    return !!activity && activity.type === 'assembly';
}

function getAssemblyStages(activity) {
    if (!activity || !Array.isArray(activity.assemblyStages)) return [];
    return [...activity.assemblyStages].sort((a, b) => (a.order || 0) - (b.order || 0));
}

function getAssignmentKeyLabel(key) {
    if (key === 'all') return 'Everyone';
    if (key === 'admins') return 'Admins';
    if (key.startsWith('group_')) return 'Group ' + key.replace('group_', '').toUpperCase();
    if (key.startsWith('person_')) return key.replace('person_', '');
    return key;
}

function memberMatchesAssignmentKey(member, key) {
    if (!member || !key) return false;
    if (key === 'all') return true;
    if (key === 'admins') return !!member.isAdmin;
    if (key.startsWith('group_')) return member.group === key.replace('group_', '');
    if (key.startsWith('person_')) return member.id === key.replace('person_', '');
    return false;
}

function buildAssignmentCompletionKey(assignmentKey, memberId) {
    return `assignment::${assignmentKey}::${memberId}`;
}

function isCompletionDone(completions, key) {
    return !!(completions[key] && completions[key].completed);
}

function syncAssemblyStageEditor(activityId) {
    const card = document.getElementById('assemblyStagesCard');
    if (!card) return;

    if (!activityId) {
        card.style.display = 'none';
        return;
    }

    const activity = adminActivities.find(a => a.id === activityId);
    const show = isAssemblyActivity(activity);
    card.style.display = show ? 'block' : 'none';

    if (show) {
        renderAssemblyStageDependsOnOptions(activityId);
        renderAssemblyStagesList(activityId);
    }
}

function setupAssemblyStageForm() {
    const addBtn = document.getElementById('assemblyStageAddBtn');
    if (!addBtn || addBtn.dataset.bound === 'true') return;
    addBtn.dataset.bound = 'true';

    addBtn.addEventListener('click', async () => {
        const activityId = document.getElementById('assignActivitySelect').value;
        const title = document.getElementById('assemblyStageTitle').value.trim();
        const personId = document.getElementById('assemblyStagePersonSelect').value;
        const scope = document.getElementById('assemblyStageScope').value;
        const dependsOn = document.getElementById('assemblyStageDependsOn').value;

        if (!activityId) { alert('Select an activity first.'); return; }
        if (!title) { alert('Stage title is required.'); return; }

        const activity = adminActivities.find(a => a.id === activityId);
        if (!isAssemblyActivity(activity)) {
            alert('Stage editor is only available for Assembly activities.');
            return;
        }

        const stageId = 'stage_' + Date.now();
        const assignmentKey = personId ? ('person_' + personId) : scope;

        const stages = getAssemblyStages(activity);
        const newStage = {
            id: stageId,
            title,
            assignmentKey,
            dependsOn: dependsOn ? [dependsOn] : [],
            order: stages.length
        };

        try {
            const updatedStages = [...stages, newStage];
            await db.collection('activities').doc(activityId).update({ assemblyStages: updatedStages });
            document.getElementById('assemblyStageTitle').value = '';
            document.getElementById('assemblyStagePersonSelect').value = '';
            document.getElementById('assemblyStageDependsOn').value = '';
        } catch (err) {
            alert('Error adding stage: ' + err.message);
        }
    });
}

function renderAssemblyStageDependsOnOptions(activityId) {
    const dependsSelect = document.getElementById('assemblyStageDependsOn');
    if (!dependsSelect) return;

    const activity = adminActivities.find(a => a.id === activityId);
    const stages = getAssemblyStages(activity);

    dependsSelect.innerHTML = '<option value="">None (first available)</option>';
    stages.forEach(stage => {
        dependsSelect.innerHTML += `<option value="${stage.id}">${stage.title}</option>`;
    });
}

function renderAssemblyStagesList(activityId) {
    const container = document.getElementById('assemblyStagesList');
    if (!container) return;

    const activity = adminActivities.find(a => a.id === activityId);
    const stages = getAssemblyStages(activity);

    if (!isAssemblyActivity(activity)) {
        container.innerHTML = '<p class="text-muted">Only Assembly activities support sequential stages.</p>';
        return;
    }

    if (!stages.length) {
        container.innerHTML = '<p class="text-muted">No stages yet. Add the first stage above.</p>';
        return;
    }

    container.innerHTML = stages.map((stage, idx) => `
        <div class="assembly-stage-item" draggable="true" data-stage-id="${stage.id}" data-activity-id="${activityId}">
            <div class="assembly-stage-handle" title="Drag to reorder">☰</div>
            <div class="assembly-stage-content">
                <div class="assembly-stage-title">${idx + 1}. ${stage.title}</div>
                <div class="assembly-stage-meta">
                    <span>${getAssignmentKeyLabel(stage.assignmentKey)}</span>
                    <span>${stage.dependsOn && stage.dependsOn.length ? ('Depends on: ' + stage.dependsOn.join(', ')) : 'No dependency'}</span>
                </div>
            </div>
            <div class="assembly-stage-actions">
                <button class="btn-icon-small" type="button" data-assembly-action="up" data-stage-id="${stage.id}" ${idx === 0 ? 'disabled' : ''}>↑</button>
                <button class="btn-icon-small" type="button" data-assembly-action="down" data-stage-id="${stage.id}" ${idx === stages.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="btn-icon-small" type="button" data-assembly-action="remove" data-stage-id="${stage.id}">✖</button>
            </div>
        </div>
    `).join('');

    bindAssemblyStageListInteractions(container, activityId);
}

function bindAssemblyStageListInteractions(container, activityId) {
    container.querySelectorAll('.assembly-stage-item').forEach(item => {
        item.addEventListener('dragstart', () => {
            assemblyDraggedStageId = item.dataset.stageId;
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            assemblyDraggedStageId = null;
            item.classList.remove('dragging');
            container.querySelectorAll('.assembly-stage-item').forEach(el => el.classList.remove('drag-over'));
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (item.dataset.stageId !== assemblyDraggedStageId) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', async (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');
            const targetStageId = item.dataset.stageId;
            if (!assemblyDraggedStageId || assemblyDraggedStageId === targetStageId) return;
            await reorderAssemblyStages(activityId, assemblyDraggedStageId, targetStageId);
        });
    });

    container.querySelectorAll('[data-assembly-action]').forEach(btn => {
        btn.addEventListener('click', async () => {
            const action = btn.dataset.assemblyAction;
            const stageId = btn.dataset.stageId;
            if (action === 'remove') {
                await removeAssemblyStage(activityId, stageId);
                return;
            }
            if (action === 'up') {
                await moveAssemblyStageByOffset(activityId, stageId, -1);
                return;
            }
            if (action === 'down') {
                await moveAssemblyStageByOffset(activityId, stageId, 1);
            }
        });
    });
}

async function moveAssemblyStageByOffset(activityId, stageId, offset) {
    const activity = adminActivities.find(a => a.id === activityId);
    const stages = getAssemblyStages(activity);
    const index = stages.findIndex(stage => stage.id === stageId);
    const targetIndex = index + offset;

    if (index < 0 || targetIndex < 0 || targetIndex >= stages.length) return;

    const moved = stages.splice(index, 1)[0];
    stages.splice(targetIndex, 0, moved);

    const normalized = stages.map((stage, order) => ({ ...stage, order }));
    await db.collection('activities').doc(activityId).update({ assemblyStages: normalized });
}

async function reorderAssemblyStages(activityId, draggedStageId, targetStageId) {
    const activity = adminActivities.find(a => a.id === activityId);
    const stages = getAssemblyStages(activity);

    const fromIndex = stages.findIndex(stage => stage.id === draggedStageId);
    const toIndex = stages.findIndex(stage => stage.id === targetStageId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = stages.splice(fromIndex, 1)[0];
    stages.splice(toIndex, 0, moved);

    const normalized = stages.map((stage, order) => ({ ...stage, order }));
    await db.collection('activities').doc(activityId).update({ assemblyStages: normalized });
}

async function removeAssemblyStage(activityId, stageId) {
    const activity = adminActivities.find(a => a.id === activityId);
    const stages = getAssemblyStages(activity);

    const filtered = stages
        .filter(stage => stage.id !== stageId)
        .map((stage, order) => ({
            ...stage,
            order,
            dependsOn: Array.isArray(stage.dependsOn) ? stage.dependsOn.filter(dep => dep !== stageId) : []
        }));

    await db.collection('activities').doc(activityId).update({ assemblyStages: filtered });
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
                if (isAssemblyActivity(activity)) {
                    const stages = getAssemblyStages(activity);
                    const nextStage = stages.find(stage => {
                        if (!memberMatchesAssignmentKey(member, stage.assignmentKey)) return false;
                        const stageKey = 'assembly_stage_' + stage.id;
                        const done = activity.completions && activity.completions[stageKey] && activity.completions[stageKey].completed;
                        if (done) return false;
                        const deps = Array.isArray(stage.dependsOn) ? stage.dependsOn : [];
                        return deps.every(dep => activity.completions && activity.completions['assembly_stage_' + dep] && activity.completions['assembly_stage_' + dep].completed);
                    });
                    if (nextStage) {
                        currentTask = nextStage.title;
                        currentActivity = activity.title;
                        break;
                    }
                }

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
                if (k.startsWith('assembly_stage_')) {
                    const stageId = k.replace('assembly_stage_', '');
                    const stage = (activity.assemblyStages || []).find(s => s.id === stageId);
                    return stage ? memberMatchesAssignmentKey(member, stage.assignmentKey) : false;
                }
                if (k.startsWith('assignment::')) {
                    return k.endsWith('::' + member.id);
                }
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

    // Add click handlers to dashboard rows (open person detail)
    tbody.querySelectorAll('tr').forEach((row, index) => {
        // Skip header/loading rows
        const member = adminMembers[index];
        if (row.cells.length >= 5 && member) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                openAdminPersonDetail(member);
            });
        }
    });

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
        const assignments = activity.assignments || {};
        const completions = activity.completions || {};

        Object.keys(assignments).forEach(assignmentKey => {
            adminMembers.forEach(member => {
                if (!memberMatchesAssignmentKey(member, assignmentKey)) return;
                total++;

                const memberKey = buildAssignmentCompletionKey(assignmentKey, member.id);
                const isDone = isCompletionDone(completions, memberKey) || isCompletionDone(completions, assignmentKey);
                if (isDone) completed++;
            });
        });

        if (isAssemblyActivity(activity)) {
            getAssemblyStages(activity).forEach(stage => {
                adminMembers.forEach(member => {
                    if (!memberMatchesAssignmentKey(member, stage.assignmentKey)) return;
                    total++;
                    if (isCompletionDone(completions, 'assembly_stage_' + stage.id)) completed++;
                });
            });
        }
    });

    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
}

/**
 * Open a modal to view a person's tasks (admin version).
 * Uses the same person detail modal from app.js logic, adapted for admin.
 */
function openAdminPersonDetail(member) {
    // Reuse the existing person detail modal from admin.html if it exists,
    // otherwise create an overlay inline.
    let existing = document.getElementById('adminPersonDetailModal');
    if (!existing) {
        existing = document.createElement('div');
        existing.id = 'adminPersonDetailModal';
        existing.className = 'modal-overlay';
        existing.innerHTML = `<div class="modal-card" style="position:relative">
            <button class="modal-close admin-person-detail-close" type="button">✕</button>
            <div id="adminPersonDetailContent"></div>
        </div>`;
        document.body.appendChild(existing);
        existing.addEventListener('click', (e) => {
            if (e.target.id === 'adminPersonDetailModal') {
                existing.classList.remove('active');
            }
        });
        existing.querySelector('.admin-person-detail-close').addEventListener('click', () => {
            existing.classList.remove('active');
        });
    }

    const content = document.getElementById('adminPersonDetailContent');
    if (!content) return;

    const groupColors = { alpha: '#f85149', beta: '#58a6ff', gamma: '#3fb950', delta: '#d29922' };
    const color = groupColors[member.group] || '#6e7681';
    const initial = member.name ? member.name.charAt(0).toUpperCase() : '?';
    const hasAccount = !!member.password;

    // Count tasks across all days
    let totalTasks = 0;
    let completedTasks = 0;
    const dayBreakdown = [];

    SCHEDULE_DAYS.forEach(day => {
        const dayActivities = adminActivities.filter(a => a.date === day);
        if (!dayActivities.length) return;
        const dayEntries = [];

        dayActivities.forEach(activity => {
            const completions = activity.completions || {};
            const assignments = activity.assignments || {};

            // Check assignments for this member
            const memberTasks = [];
            Object.keys(assignments).forEach(key => {
                if (!memberMatchesAssignmentKey(member, key)) return;
                const taskKey = buildAssignmentCompletionKey(key, member.id);
                const isDone = isCompletionDone(completions, taskKey);
                totalTasks++;
                if (isDone) completedTasks++;
                memberTasks.push({
                    role: assignments[key],
                    key: taskKey,
                    completed: isDone,
                    sourceType: key === 'all' ? 'all' : key === 'admins' ? 'admins' : key.startsWith('group_') ? 'group' : 'personal'
                });
            });

            // Check subtasks
            const subtasks = activity.personalSubtasks || {};
            if (subtasks[member.id] && Array.isArray(subtasks[member.id])) {
                subtasks[member.id].forEach((text, idx) => {
                    const sk = `subtask_${member.id}_${idx}`;
                    const isDone = isCompletionDone(completions, sk);
                    totalTasks++;
                    if (isDone) completedTasks++;
                    memberTasks.push({ role: text, key: sk, completed: isDone, sourceType: 'subtask' });
                });
            }

            // Check assembly stages
            if (isAssemblyActivity(activity)) {
                getAssemblyStages(activity).forEach(stage => {
                    if (!memberMatchesAssignmentKey(member, stage.assignmentKey)) return;
                    const sk = 'assembly_stage_' + stage.id;
                    const isDone = isCompletionDone(completions, sk);
                    totalTasks++;
                    if (isDone) completedTasks++;
                    memberTasks.push({ role: stage.title, key: sk, completed: isDone, sourceType: 'assembly' });
                });
            }

            if (memberTasks.length > 0) {
                dayEntries.push({ title: activity.title, time: activity.time, tasks: memberTasks, icon: activity.icon || '📋' });
            }
        });

        if (dayEntries.length > 0) {
            dayBreakdown.push({ day, entries: dayEntries });
        }
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
            <h4 style="font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Tasks by Day</h4>
            ${dayBreakdown.map(d => `
                <div class="weekly-day-block">
                    <h4>${d.day.substring(8)} — ${d.entries.length} activities</h4>
                    ${d.entries.map(e => `
                        <div class="weekly-row">
                            <strong>${e.time}</strong> — ${e.icon} ${e.title}
                            ${e.tasks.map(t => `<div class="weekly-meta" style="display:flex;align-items:center;gap:6px;margin-top:2px">
                                <span style="color:${t.completed ? 'var(--accent-green)' : 'var(--text-muted)'}">${t.completed ? '✓' : '○'}</span>
                                <span>${t.role}</span>
                            </div>`).join('')}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    `;

    existing.classList.add('active');
}

// =============================================
// EDIT ACTIVITY (reschedule date/time)
// =============================================
function editActivity(activityId) {
    const activity = adminActivities.find(a => a.id === activityId);
    if (!activity) return;

    const newDate = prompt('New date (YYYY-MM-DD):', activity.date || '');
    if (!newDate) return;
    const newTime = prompt('New time (HH:MM):', activity.time || '');
    if (!newTime) return;

    db.collection('activities').doc(activityId).update({ date: newDate, time: newTime })
        .then(() => {
            alert('✓ Activity rescheduled to ' + newDate + ' at ' + newTime);
        })
        .catch(err => alert('Error: ' + err.message));
}

// =============================================
// CLONE ACTIVITY (copy with all data)
// =============================================
function cloneActivity(activityId) {
    const activity = adminActivities.find(a => a.id === activityId);
    if (!activity) return;

    const targetDate = prompt('Target date for clone (YYYY-MM-DD):', activity.date || '');
    if (!targetDate) return;
    const targetTime = prompt('Target time for clone (HH:MM):', activity.time || '');
    if (!targetTime) return;

    const copyAssignments = confirm('Copy assignments? (OK=Yes, Cancel=No)');
    const copySubtasks = confirm('Copy sub-tasks? (OK=Yes, Cancel=No)');
    const copyStages = confirm('Copy assembly stages? (OK=Yes, Cancel=No)');

    const newDoc = {
        date: targetDate,
        time: targetTime,
        duration: activity.duration || 120,
        title: activity.title,
        description: activity.description || '',
        type: activity.type || 'team_activity',
        icon: activity.icon || '📋',
        assignments: copyAssignments ? (activity.assignments || {}) : {},
        personalSubtasks: copySubtasks ? (activity.personalSubtasks || {}) : {},
        completions: {}, // Always fresh completions
        assemblyStages: copyStages ? (activity.assemblyStages || []) : []
    };

    db.collection('activities').add(newDoc)
        .then(() => {
            alert('✓ Activity cloned to ' + targetDate + ' at ' + targetTime);
        })
        .catch(err => alert('Error: ' + err.message));
}

// =============================================
// STATISTICS TAB
// =============================================
function refreshStats() {
    const container = document.getElementById('statsContent');
    if (!container) return;
    if (!adminMembers.length || !adminActivities.length) {
        container.innerHTML = '<p class="text-muted">Waiting for data...</p>';
        return;
    }

    const groupColors = { alpha: '#f85149', beta: '#58a6ff', gamma: '#3fb950', delta: '#d29922' };
    const groupNames = { alpha: 'Alpha', beta: 'Beta', gamma: 'Gamma', delta: 'Delta' };

    // Calculate per-group completion stats
    const groupStats = { alpha: { total: 0, completed: 0 }, beta: { total: 0, completed: 0 }, gamma: { total: 0, completed: 0 }, delta: { total: 0, completed: 0 } };
    adminActivities.forEach(activity => {
        const assignments = activity.assignments || {};
        const completions = activity.completions || {};
        Object.keys(assignments).forEach(key => {
            adminMembers.forEach(member => {
                if (!memberMatchesAssignmentKey(member, key)) return;
                groupStats[member.group].total++;
                const mk = buildAssignmentCompletionKey(key, member.id);
                if (isCompletionDone(completions, mk) || isCompletionDone(completions, key)) groupStats[member.group].completed++;
            });
        });
    });

    // Per-day stats
    const dayStats = {};
    adminActivities.forEach(activity => {
        if (!dayStats[activity.date]) dayStats[activity.date] = { total: 0, completed: 0 };
        const assignments = activity.assignments || {};
        const completions = activity.completions || {};
        Object.keys(assignments).forEach(key => {
            adminMembers.forEach(member => {
                if (!memberMatchesAssignmentKey(member, key)) return;
                dayStats[activity.date].total++;
                const mk = buildAssignmentCompletionKey(key, member.id);
                if (isCompletionDone(completions, mk) || isCompletionDone(completions, key)) dayStats[activity.date].completed++;
            });
        });
    });

    // Top performers
    const memberScores = adminMembers.map(m => {
        let completed = 0, total = 0;
        adminActivities.forEach(activity => {
            const assignments = activity.assignments || {};
            const completions = activity.completions || {};
            Object.keys(assignments).forEach(key => {
                if (!memberMatchesAssignmentKey(m, key)) return;
                total++;
                const mk = buildAssignmentCompletionKey(key, m.id);
                if (isCompletionDone(completions, mk) || isCompletionDone(completions, key)) completed++;
            });
        });
        return { name: m.name || m.id, group: m.group, total, completed, pct: total ? Math.round((completed/total)*100) : 0 };
    }).sort((a,b) => b.pct - a.pct).slice(0, 5);

    // Overall
    let overallTotal = 0, overallCompleted = 0;
    Object.values(groupStats).forEach(g => { overallTotal += g.total; overallCompleted += g.completed; });
    const overallPct = overallTotal ? Math.round((overallCompleted / overallTotal) * 100) : 0;

    // Build SVG horizontal bar chart
    const barMaxWidth = 240;
    const buildBar = (label, done, total, color) => {
        const pct = total ? Math.round((done / total) * 100) : 0;
        return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
            <span style="width:50px;text-align:right;flex-shrink:0;font-weight:600;color:${color}">${label}</span>
            <div style="flex:1;height:18px;background:var(--bg-surface);border-radius:4px;overflow:hidden">
                <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;transition:width 0.5s ease"></div>
            </div>
            <span style="width:45px;flex-shrink:0;text-align:right;font-weight:600;font-size:11px;color:${color}">${pct}%</span>
            <span style="font-size:10px;color:var(--text-muted);width:40px;flex-shrink:0">${done}/${total}</span>
        </div>`;
    };

    container.innerHTML = `
        <div class="admin-card">
            <h3>Overall Completion</h3>
            <div style="display:flex;gap:12px;align-items:center">
                <div style="width:72px;height:72px;border-radius:50%;background:conic-gradient(var(--accent-green) ${overallPct}%, var(--bg-surface) ${overallPct}%);display:flex;align-items:center;justify-content:center">
                    <div style="width:52px;height:52px;border-radius:50%;background:var(--bg-card);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;color:var(--accent-primary)">${overallPct}%</div>
                </div>
                <div>
                    <div style="font-size:24px;font-weight:700">${overallCompleted}<span style="font-size:14px;color:var(--text-muted)"> / ${overallTotal}</span></div>
                    <div style="font-size:11px;color:var(--text-secondary)">tasks completed</div>
                </div>
            </div>
        </div>
        <div class="admin-card">
            <h3>By Group</h3>
            ${buildBar(groupNames.alpha, groupStats.alpha.completed, groupStats.alpha.total, groupColors.alpha)}
            ${buildBar(groupNames.beta, groupStats.beta.completed, groupStats.beta.total, groupColors.beta)}
            ${buildBar(groupNames.gamma, groupStats.gamma.completed, groupStats.gamma.total, groupColors.gamma)}
            ${buildBar(groupNames.delta, groupStats.delta.completed, groupStats.delta.total, groupColors.delta)}
        </div>
        <div class="admin-card">
            <h3>By Day</h3>
            ${SCHEDULE_DAYS.map(day => {
                const s = dayStats[day] || { total: 0, completed: 0 };
                return buildBar(day.substring(8), s.completed, s.total, 'var(--accent-primary)');
            }).join('')}
        </div>
        <div class="admin-card">
            <h3>Top 5</h3>
            ${memberScores.map((m, i) => buildBar(`${i+1}. ${m.name}`, m.completed, m.total, groupColors[m.group])).join('')}
        </div>
    `;
}

console.log('SEM Brasil 2026 - Admin Panel v3 loaded (segmented control + array sub-tasks)');
