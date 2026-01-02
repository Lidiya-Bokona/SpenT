// --- Constants & Config ---
const STORAGE_KEYS = {
    // USERS key no longer needed really, but we'll keep for legacy struct if we want
    TASKS: 'spent_tasks'
};

// --- Storage Manager ---
const Storage = {
    // Simplified: No user list needed, just "Default User" context
    getTasks: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
    setTasks: (tasks) => localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
};

// --- Auth Functions (Stubbed for No-Auth) ---
async function checkAuth() {
    return true; // Always authenticated
}

// Ensure a "session" exists implicitly
const DEFAULT_USER_ID = 1;

// --- Data Logic (The "Backend") ---

function getFinancials(tasks = [], dateStr = null) {
    let invested = 0;
    let explicitWasted = 0;
    let totalLogged = 0;

    tasks.forEach(t => {
        const duration = getDurationSeconds(t.start_time, t.end_time);
        totalLogged += duration;
        if (t.label === 'Good' || t.label === 'Neutral') {
            invested += duration;
        } else {
            explicitWasted += duration;
        }
    });

    // Calculate Untracked based on "Time Passed"
    // If date is today, time passed = now. If past date, time passed = 86400.
    let secondsPassed = 86400; // Default to full day (past)

    if (dateStr) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (dateStr === todayStr) {
            const now = new Date();
            secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        }
    }

    // Ensure we don't have negative untracked (e.g. overlapping tasks logging > time passed)
    let untracked = Math.max(0, secondsPassed - totalLogged);

    // "Automatically wasted" = Untracked + Explicit Bad
    let totalWasted = explicitWasted + untracked;

    return { invested, wasted: totalWasted, untracked, explicitWasted };
}

function getDurationSeconds(start, end) {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const d1 = new Date(0, 0, 0, h1, m1);
    const d2 = new Date(0, 0, 0, h2, m2);
    let diff = (d2 - d1) / 1000;
    if (diff < 0) diff += 86400; // crossover midnight? Assuming simple day for now
    return diff;
}

// --- Dashboard Functions ---

let allTasks = []; // Store locally for editing

async function loadDashboardData() {
    // Filter tasks for TODAY
    const rawTasks = Storage.getTasks();
    const todayStr = new Date().toISOString().split('T')[0];

    // We treat all tasks as belonging to the default user now
    // If migration from old version: we might ignore user_id or just show all.
    // For safety, let's just show all tasks that match today's date.

    allTasks = rawTasks.filter(t => t.date === todayStr);

    // Calculate Stats
    // Pass today's date to handle "Untracked time" logic relative to NOW
    const { invested, wasted } = getFinancials(allTasks, todayStr);

    // Calculate Remaining (Time Left in the Day)
    const now = new Date();
    const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const secondsInDay = 86400;
    const remaining = secondsInDay - secondsPassed;

    // Update UI
    startCountdown(remaining);

    const invEl = document.getElementById('invested-today');
    const wasEl = document.getElementById('wasted-today');

    if (invEl) invEl.textContent = invested.toLocaleString();
    if (wasEl) wasEl.textContent = wasted.toLocaleString();

    renderTasks(allTasks);
}

function startCountdown(initialSeconds) {
    // Sync with real time to be accurate
    const counter = document.getElementById('money-counter');
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    function update() {
        const now = new Date();
        const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        const remaining = 86400 - secondsPassed;

        if (remaining >= 0) {
            counter.textContent = remaining.toLocaleString();
        } else {
            counter.textContent = "0";
        }
    }

    update();
    window.countdownInterval = setInterval(update, 1000);
}

function renderTasks(tasks) {
    const list = document.getElementById('task-list');
    list.innerHTML = '';

    if (tasks.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary);">No tasks logged today.</p>';
        return;
    }

    // Sort by start time
    tasks.sort((a, b) => a.start_time.localeCompare(b.start_time));

    tasks.forEach(task => {
        const cost = getDurationSeconds(task.start_time, task.end_time);

        const div = document.createElement('div');
        div.className = `task-card ${task.label.toLowerCase()}`;
        div.innerHTML = `
            <div class="task-info">
                <h4>${task.name} <small style="color:var(--text-secondary); font-weight:normal;">(${task.start_time} - ${task.end_time})</small></h4>
                <div style="display:flex; gap:0.5rem; margin-top:0.3rem;">
                    <span class="badge ${task.label === 'Good' ? 'badge-good' : task.label === 'Bad' ? 'badge-bad' : 'badge-neutral'}">${task.label}</span>
                    ${task.is_routine ? '<span class="badge" style="border:1px solid var(--text-secondary); color:var(--text-secondary);">Routine</span>' : ''}
                </div>
            </div>
            
            <div class="task-price-tag">$${cost.toLocaleString()}</div>
            
            <div class="actions">
                <button onclick="openByModal(${task.id})" class="btn-sm-icon" title="Edit">✎</button>
                <button onclick="deleteTask(${task.id})" class="btn-sm-icon delete" title="Delete">🗑</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- Modal & Form Logic ---

document.addEventListener('DOMContentLoaded', () => {
    // ... (Clock setup exists in old code, preserving)
    // Clock Logic
    setInterval(() => {
        const now = new Date();

        // Combined DateTime (legacy/other pages)
        const dtEl = document.getElementById('current-datetime');
        if (dtEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
            dtEl.textContent = now.toLocaleDateString('en-US', options).replace(' at ', ' | ');
        }

        // Split Date and Time (Dashboard)
        const dateEl = document.getElementById('current-date');
        const timeEl = document.getElementById('current-time');

        if (dateEl) {
            const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
            dateEl.textContent = now.toLocaleDateString('en-US', dateOptions);
        }

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
        }
    }, 1000);

    // Initial load checks
    if (window.location.pathname.includes('dashboard') || window.location.pathname === '/') {
        // No auth check needed, just load
        loadDashboardData();
    }
});

// Submit Task
const taskForm = document.getElementById('modal-task-form');
if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // No user check needed for static/open mode
        const id = document.getElementById('task-id').value; // String if present

        // Gather Data
        const isRoutine = document.getElementById('m-is-routine').checked;
        const recurrenceType = document.getElementById('m-recurrence-type').value;
        let repeatDays = null;

        if (isRoutine && recurrenceType === 'Custom') {
            const checked = Array.from(document.querySelectorAll('.day-btn.active')).map(btn => btn.dataset.day);
            repeatDays = checked.join(',');
        }

        const selectedRadio = document.querySelector('input[name="category"]:checked');
        const label = selectedRadio ? selectedRadio.value : (document.getElementById('m-task-label')?.value || 'Good');

        const startTime = document.getElementById('m-task-start').value;
        const endTime = document.getElementById('m-task-end').value;

        if (startTime >= endTime) {
            alert("End time must be after start time.");
            return;
        }

        const taskData = {
            id: id ? parseInt(id) : Date.now(),
            user_id: 1, // Default ID
            date: new Date().toISOString().split('T')[0], // Always save to today for now
            name: document.getElementById('m-task-name').value,
            start_time: startTime,
            end_time: endTime,
            label: label,
            description: document.getElementById('m-task-desc').value,
            is_routine: isRoutine,
            recurrence_type: isRoutine ? recurrenceType : 'Daily',
            repeat_days: repeatDays
        };

        const tasks = Storage.getTasks();

        if (id) {
            // Edit
            const idx = tasks.findIndex(t => t.id == id);
            if (idx > -1) {
                tasks[idx] = { ...tasks[idx], ...taskData };
            }
        } else {
            // Add
            tasks.push(taskData);
        }

        Storage.setTasks(tasks);
        closeModal();
        loadDashboardData();
    });
}

// Delete Task
async function deleteTask(id) {
    if (!confirm("Delete this task?")) return;

    let tasks = Storage.getTasks();
    tasks = tasks.filter(t => t.id !== id);
    Storage.setTasks(tasks);

    loadDashboardData();
}

// --- Auth Form Listeners (Login/Signup) ---
// These need to be attached if the elements exist (e.g. on login.html)

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const res = await login(email, password);

        if (res.success) window.location.href = 'dashboard.html';
        else {
            const err = document.getElementById('error-message');
            err.textContent = res.message;
            err.classList.remove('hidden');
        }
    });
}

const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username')?.value || 'User';
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirm = document.getElementById('confirm_password').value;
        const errorDiv = document.getElementById('error-message');

        if (password !== confirm) {
            errorDiv.textContent = "Passwords do not match.";
            errorDiv.classList.remove('hidden');
            return;
        }

        const res = await signup(username, email, password);
        if (res.success) {
            window.location.href = 'login.html'; // Redirect to login
        } else {
            errorDiv.textContent = res.message;
            errorDiv.classList.remove('hidden');
        }
    });

    // Password validation listeners (keep existing UI logic)
    const passInput = document.getElementById('password');
    const reqLen = document.getElementById('req-length');
    const reqMix = document.getElementById('req-mix');
    const reqList = document.getElementById('password-requirements');

    if (passInput && reqList) {
        passInput.addEventListener('focus', () => reqList.style.display = 'block');
        passInput.addEventListener('input', () => {
            const val = passInput.value;
            if (reqLen) {
                if (val.length >= 8) reqLen.classList.add('valid');
                else reqLen.classList.remove('valid');
            }
            if (reqMix) {
                const hasLetter = /[a-zA-Z]/.test(val);
                const hasNum = /[0-9]/.test(val);
                const hasSym = /[^a-zA-Z0-9]/.test(val);
                if (hasLetter && hasNum && hasSym) reqMix.classList.add('valid');
                else reqMix.classList.remove('valid');
            }
        });
    }
}


// --- Modal UI Helpers ---
function openByModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    if (!modal) return;

    // Reset basic fields
    document.getElementById('modal-task-form').reset();
    document.getElementById('task-id').value = '';
    document.getElementById('modal-title').textContent = 'New Transaction';

    // Default time
    const now = new Date();
    document.getElementById('m-task-start').value = now.toTimeString().slice(0, 5);

    // Hide specialized sections
    document.getElementById('routine-options').classList.add('hidden');
    document.getElementById('custom-days-container').classList.add('hidden');
    document.querySelectorAll('.recurrence-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.recurrence-btn[data-value="Daily"]')?.classList.add('active');

    if (taskId) {
        // Find task
        const tasks = allTasks; // from loaded scope
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('modal-title').textContent = 'Edit Transaction';
            document.getElementById('task-id').value = task.id;
            document.getElementById('m-task-name').value = task.name;
            document.getElementById('m-task-start').value = task.start_time;
            document.getElementById('m-task-end').value = task.end_time;
            document.getElementById('m-task-desc').value = task.description || '';

            // Radio
            const rad = document.querySelector(`input[name = "category"][value = "${task.label}"]`);
            if (rad) rad.checked = true;
            // Also select fallback
            const sel = document.getElementById('m-task-label');
            if (sel) sel.value = task.label;

            if (task.is_routine) {
                document.getElementById('m-is-routine').checked = true;
                document.getElementById('routine-options').classList.remove('hidden');
                setRecurrence(task.recurrence_type || 'Daily');

                if (task.recurrence_type === 'Custom' && task.repeat_days) {
                    const days = task.repeat_days.split(',');
                    document.querySelectorAll('.day-btn').forEach(btn => {
                        if (days.includes(btn.dataset.day)) btn.classList.add('active');
                    });
                }
            }
        }
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
}

window.onclick = function (event) {
    const modal = document.getElementById('task-modal');
    if (event.target == modal) closeModal();
}

// Routine Toggles
document.getElementById('m-is-routine')?.addEventListener('change', function () {
    const opts = document.getElementById('routine-options');
    if (this.checked) opts.classList.remove('hidden');
    else opts.classList.add('hidden');
});

// UI Exports
window.openByModal = openByModal;
window.closeModal = closeModal;
window.deleteTask = deleteTask;
window.toggleDay = function (el) { el.classList.toggle('active'); };
window.setRecurrence = function (val) {
    document.querySelectorAll('.recurrence-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.recurrence-btn[data-value="${val}"]`)?.classList.add('active');
    document.getElementById('m-recurrence-type').value = val;
    const custom = document.getElementById('custom-days-container');
    if (val === 'Custom') custom.classList.remove('hidden');
    else custom.classList.add('hidden');
};

// Analytics Data Provider (for analytics.html)
window.AnalyticsAPI = {
    getSummary: (range) => {
        // Calculate based on range. For static demo, we might just do "Lifetime" or "Today".
        // Let's implement basic filtering.
        const tasks = Storage.getTasks();
        // Assume all tasks are valid for current user
        const userTasks = tasks;

        // Filter by date range (simple logic)
        let filtered = userTasks;
        const now = new Date();
        const cutoff = new Date();

        if (range === '1d') cutoff.setDate(now.getDate()); // Today
        else if (range === '7d') cutoff.setDate(now.getDate() - 7);
        else if (range === '30d') cutoff.setDate(now.getDate() - 30);
        else if (range === '365d') cutoff.setDate(now.getDate() - 365);

        // Apply date filter
        filtered = userTasks.filter(t => {
            const d = new Date(t.date);
            // 1d needs strict equality of YYYY-MM-DD? 
            // If range is 1d, we want t.date == todayStr
            if (range === '1d') return t.date === now.toISOString().split('T')[0];
            return d >= cutoff;
        });

        // For filtered range (e.g. 7d), getFinancials needs to sum up day-by-day to be accurate about "untracked" for past days
        // Simplified: Loop days
        let invested = 0;
        let wasted = 0;

        // Group by date
        const byDate = {};
        filtered.forEach(t => {
            if (!byDate[t.date]) byDate[t.date] = [];
            byDate[t.date].push(t);
        });

        // Iterate dates in range? 
        // If range is 7d, we should iterate last 7 days.
        // This is complex for a simple static demo. 
        // Fallback: Just calculate statics on found tasks + assume untracked for found days? 
        // Let's iterate the keys we have as a robust enough approx.
        Object.keys(byDate).forEach(date => {
            const stats = getFinancials(byDate[date], date); // Pass date to trigger full day calc
            invested += stats.invested;
            wasted += stats.wasted;
        });

        // Today specifics
        const todayStr = now.toISOString().split('T')[0];
        const todayTasks = userTasks.filter(t => t.date === todayStr);
        const todayStats = getFinancials(todayTasks, todayStr);

        return {
            total_invested: invested,
            total_wasted: wasted,
            avg_daily_investment: filtered.length ? Math.round(invested / (filtered.length || 1)) : 0, // crude avg per task? No per day.
            // efficient avg per day:
            // unique days
            // let days = new Set(filtered.map(t => t.date)).size;
            // avg = invested / days

            total_tasks: filtered.length,
            today_invested: todayStats.invested,
            today_wasted: todayStats.wasted,
            today_tasks: todayTasks.length
        };
    },

    // Helper to expose raw data for charts
    getData: (range) => {
        return Storage.getTasks(); // Return all tasks
    }
};
