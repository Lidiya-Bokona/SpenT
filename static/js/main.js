// --- Constants & Config ---
const STORAGE_KEYS = {
    USERS: 'spent_users',
    CURRENT_USER: 'spent_current_user',
    TASKS: 'spent_tasks'
};

// --- Storage Manager ---
const Storage = {
    getUsers: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]'),
    setUsers: (users) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),

    getCurrentUser: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER)),
    setCurrentUser: (user) => localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user)),
    removeCurrentUser: () => localStorage.removeItem(STORAGE_KEYS.CURRENT_USER),

    getTasks: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]'),
    setTasks: (tasks) => localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks))
};

// --- Auth Functions ---
async function checkAuth() {
    const user = Storage.getCurrentUser();
    return !!user;
}

async function login(email, password) {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 300));

    const users = Storage.getUsers();
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        Storage.setCurrentUser({ id: user.id, username: user.username, email: user.email });
        return { success: true };
    }
    return { success: false, message: 'Invalid credentials' };
}

async function signup(username, email, password) {
    await new Promise(r => setTimeout(r, 300));

    const users = Storage.getUsers();
    if (users.find(u => u.email === email)) {
        return { success: false, message: 'Email already exists' };
    }

    const newUser = {
        id: Date.now(),
        username,
        email,
        password // In a real app never store plain text, but for local static demo it's fine
    };

    users.push(newUser);
    Storage.setUsers(users);

    // Auto login
    // Storage.setCurrentUser({ id: newUser.id, username, email });
    return { success: true };
}

async function logout() {
    Storage.removeCurrentUser();
    window.location.href = 'index.html'; // Changed from / to index.html for static file support
}

// --- Data Logic (The "Backend") ---

function getFinancials(tasks = []) {
    let invested = 0;
    let wasted = 0;
    // Assuming 24h = 86400 seconds. 
    // We calculate "Invested" as sum of contents of tasks labeled 'Good' + 'Neutral'? 
    // Or 'Good' only? The prompt said "Invested Today (sum of Good and Neutral)".
    // "Wasted Today (sum of Bad tasks and untracked time gaps)".

    // In this static mock, we'll calculate strictly from tasks for now.
    // However, the "Money" metaphor implies we start with 86400.

    tasks.forEach(t => {
        const duration = getDurationSeconds(t.start_time, t.end_time);
        if (t.label === 'Good' || t.label === 'Neutral') {
            invested += duration;
        } else {
            wasted += duration;
        }
    });

    // Untracked time = 86400 - (invested + wasted) -> treated as Wasted per prompt logic? 
    // "untracked time gaps" -> generally yes. 
    // But for "Today's Ledger", we might just show what has passed so far?
    // Let's stick to the prompt: "ensure the sum of all time always equals $86,400" is tricky for *future* time.
    // Interpretation: "Balance" is what's left.
    // "Invested" + "Wasted" (logged) + "Remaining" = 86400.

    // Actually, usually "Wasted" includes bad habits. 

    return { invested, wasted };
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
    const user = Storage.getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Filter tasks for TODAY
    const rawTasks = Storage.getTasks();
    const todayStr = new Date().toISOString().split('T')[0];

    // In our simple model, we might not store dates in the task object per the previous code?
    // Previous code: `tasks` array. Let's look at the structure.
    // If not, we will add 'date' field to new tasks. Old tasks might miss it.
    // For this migration, we'll assume we show ALL tasks or just today's. 
    // Let's modify save logic to include date.

    allTasks = rawTasks.filter(t => t.user_id === user.id && t.date === todayStr);

    // Calculate Stats
    const { invested, wasted } = getFinancials(allTasks);

    // Calculate Remaining (Time Left in the Day)
    // Actually, "Balance" is usually (Seconds in Day - Seconds Passed).
    // Or is it (Seconds in Day - Seconds Logged)?
    // The previous prompt said: "Time Remaining" -> countdown.

    const now = new Date();
    const secondsPassed = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    const secondsInDay = 86400;
    const remaining = secondsInDay - secondsPassed;

    // Update UI
    startCountdown(remaining);

    const invEl = document.getElementById('invested-today');
    const wasEl = document.getElementById('wasted-today');

    // For price tags on tasks, we assume $1 = 1 second for simplicity of the prompt "Time is Money"?
    // Or is it arbitrary? The prompt said "start with $86,400 (seconds)". So 1s = $1.

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
    setInterval(() => {
        const now = new Date();
        const dtEl = document.getElementById('current-datetime');
        if (dtEl) {
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
            dtEl.textContent = now.toLocaleDateString('en-US', options).replace(' at ', ' | ');
        }
    }, 1000);

    // Initial Route Check
    const path = window.location.pathname;
    if (path.includes('dashboard') || path.endsWith('/')) {
        // If index/landing, we usually don't force login unless it's dashboard
        if (path.includes('dashboard')) {
            checkAuth().then(auth => {
                if (auth) loadDashboardData();
                else window.location.href = 'login.html';
            });
        }
    }
});

// Submit Task
const taskForm = document.getElementById('modal-task-form');
if (taskForm) {
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = Storage.getCurrentUser();
        if (!user) return;

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
            user_id: user.id,
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
            const rad = document.querySelector(`input[name="category"][value="${task.label}"]`);
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
        const user = Storage.getCurrentUser();
        if (!user) return {}; // handle error

        const userTasks = tasks.filter(t => t.user_id === user.id);

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

        const { invested, wasted } = getFinancials(filtered);

        // Today specifics
        const todayStr = now.toISOString().split('T')[0];
        const todayTasks = userTasks.filter(t => t.date === todayStr);
        const todayStats = getFinancials(todayTasks);

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
        // Re-use logic or just return raw tasks for chart.js processing in analytics.html
        return Storage.getTasks().filter(t => t.user_id === Storage.getCurrentUser()?.id);
    }
};
