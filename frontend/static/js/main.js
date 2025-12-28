const API_URL = ''; // Relative path prevents CORS issues on localhost/127.0.0.1 mismatch

// --- Auth Functions ---
async function checkAuth() {
    try {
        const response = await fetch(`${API_URL}/check-auth`, { credentials: 'include' });
        if (response.ok) {
            const data = await response.json();
            return data.authenticated;
        }
        return false;
    } catch (e) {
        console.error("Auth check failed", e);
        return false;
    }
}

async function login(email, password) {
    const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    });
    return response.json();
}

async function signup(username, email, password) {
    const response = await fetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
        credentials: 'include'
    });
    return response.json();
}

async function logout() {
    await fetch(`${API_URL}/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/';
}

// --- Dashboard Functions ---

let allTasks = []; // Store locally for editing

async function loadDashboardData() {
    try {
        const response = await fetch(`${API_URL}/api/dashboard`, { credentials: 'include' });
        if (response.status === 401) {
            window.location.href = 'login.html';
            return;
        }
        const data = await response.json();

        // Update Global Stats
        startCountdown(data.remaining);


        const invEl = document.getElementById('invested-today');
        const wasEl = document.getElementById('wasted-today');
        const invDurEl = document.getElementById('invested-duration');
        const wasDurEl = document.getElementById('wasted-duration');

        if (invEl) invEl.textContent = data.invested.toLocaleString();
        if (wasEl) wasEl.textContent = data.wasted.toLocaleString();

        if (invDurEl) invDurEl.textContent = formatDuration(data.invested);
        if (wasDurEl) wasDurEl.textContent = formatDuration(data.wasted);

        // Render Tasks
        allTasks = data.tasks;
        renderTasks(data.tasks);

    } catch (e) {
        console.error("Failed to load dashboard", e);
    }
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function startCountdown(initialSeconds) {
    let remaining = initialSeconds;
    const counter = document.getElementById('money-counter');

    // Clear existing interval if any (basic global var check or attribute)
    if (window.countdownInterval) clearInterval(window.countdownInterval);

    function update() {
        if (remaining > 0) {
            counter.textContent = remaining.toLocaleString();
            remaining--;
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

    tasks.forEach(task => {
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
            
            <div class="task-price-tag">$${task.cost}</div>
            
            <div class="actions">
                <button onclick="openByModal(${task.id})" class="btn-sm-icon" title="Edit">✎</button>
                <button onclick="deleteTask(${task.id})" class="btn-sm-icon delete" title="Delete">🗑</button>
            </div>
        `;
        list.appendChild(div);
    });
}

// --- Modal Logic ---

// --- Modal Logic ---

function openByModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('modal-task-form');
    const title = document.getElementById('modal-title');
    if (!modal || !form) {
        console.error("Modal or Form not found");
        return;
    }

    // Reset Form
    form.reset();
    document.getElementById('task-id').value = '';

    const routineOpts = document.getElementById('routine-options');
    const customDays = document.getElementById('custom-days-container');
    if (routineOpts) routineOpts.classList.add('hidden');
    if (customDays) customDays.classList.add('hidden');

    // Reset UI State for Buttons
    document.querySelectorAll('.recurrence-btn').forEach(btn => btn.classList.remove('active'));
    const dailyBtn = document.querySelector('.recurrence-btn[data-value="Daily"]');
    if (dailyBtn) dailyBtn.classList.add('active');

    const rTypeInput = document.getElementById('m-recurrence-type');
    if (rTypeInput) rTypeInput.value = 'Daily';

    document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));

    const hiddenSelect = document.getElementById('m-task-label');

    if (taskId) {
        // Edit Mode
        const task = allTasks.find(t => t.id === taskId);
        if (!task) return;

        title.textContent = 'Edit Transaction';
        document.getElementById('task-id').value = task.id;
        document.getElementById('m-task-name').value = task.name;
        document.getElementById('m-task-start').value = task.start_time;
        document.getElementById('m-task-end').value = task.end_time;
        document.getElementById('m-task-desc').value = task.description || '';

        // Label Sync
        if (hiddenSelect) hiddenSelect.value = task.label;
        const radio = document.querySelector(`input[name="category"][value="${task.label}"]`);
        if (radio) radio.checked = true;

        if (task.is_routine) {
            const routineCheck = document.getElementById('m-is-routine');
            if (routineCheck) routineCheck.checked = true;
            if (routineOpts) routineOpts.classList.remove('hidden');

            // Set Recurrence Type
            const rType = task.recurrence_type || 'Daily';
            if (rTypeInput) rTypeInput.value = rType;

            // UI visual update
            document.querySelectorAll('.recurrence-btn').forEach(btn => {
                if (btn.dataset.value === rType) btn.classList.add('active');
                else btn.classList.remove('active');
            });

            if (rType === 'Custom' && task.repeat_days) {
                if (customDays) customDays.classList.remove('hidden');
                const days = task.repeat_days.split(',');
                document.querySelectorAll('.day-btn').forEach(btn => {
                    if (days.includes(btn.dataset.day)) btn.classList.add('active');
                });
            }
        }

    } else {
        // Add Mode
        title.textContent = 'New Transaction';
        const now = new Date();
        const nowStr = now.toTimeString().slice(0, 5);
        document.getElementById('m-task-start').value = nowStr;

        // Default to Good
        if (hiddenSelect) hiddenSelect.value = 'Good';
        const radio = document.querySelector(`input[name="category"][value="Good"]`);
        if (radio) radio.checked = true;
    }

    modal.classList.add('active');
}

function closeModal() {
    document.getElementById('task-modal').classList.remove('active');
}

// Close on outside click
window.onclick = function (event) {
    const modal = document.getElementById('task-modal');
    if (event.target == modal) {
        closeModal();
    }
}

// Routine Options Toggle
document.getElementById('m-is-routine').addEventListener('change', function () {
    const opts = document.getElementById('routine-options');
    if (this.checked) opts.classList.remove('hidden');
    else opts.classList.add('hidden');
});

// New Recurrence Button Logic
function setRecurrence(val) {
    // Remove active from all
    document.querySelectorAll('.recurrence-btn').forEach(b => b.classList.remove('active'));

    // Add active to clicked (using data-value to find it, or we could pass 'this' but strict value match is safer)
    const btn = document.querySelector(`.recurrence-btn[data-value="${val}"]`);
    if (btn) btn.classList.add('active');

    // Update hidden input
    document.getElementById('m-recurrence-type').value = val;

    // Show/Hide Custom Days
    const custom = document.getElementById('custom-days-container');
    if (val === 'Custom') custom.classList.remove('hidden');
    else custom.classList.add('hidden');
}

// New Day Button Logic
function toggleDay(el) {
    el.classList.toggle('active');
}

// Expose to window
window.setRecurrence = setRecurrence;
window.toggleDay = toggleDay;


// Submit Form
document.getElementById('modal-task-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('task-id').value;
    const isEdit = !!id;
    const url = isEdit ? `${API_URL}/api/tasks/edit/${id}` : `${API_URL}/api/tasks/add`;

    // Gather Data
    const isRoutine = document.getElementById('m-is-routine').checked;
    let recurrenceType = document.getElementById('m-recurrence-type').value;
    let repeatDays = null;

    if (isRoutine && recurrenceType === 'Custom') {
        const checked = Array.from(document.querySelectorAll('.day-btn.active')).map(btn => btn.dataset.day);
        repeatDays = checked.join(',');
    }

    // Get Label from Radio Buttons directly
    const selectedRadio = document.querySelector('input[name="category"]:checked');
    const label = selectedRadio ? selectedRadio.value : 'Good';

    // Time Validation
    const startTime = document.getElementById('m-task-start').value;
    const endTime = document.getElementById('m-task-end').value;

    if (startTime >= endTime) {
        alert("End time must be after start time.");
        return;
    }

    const data = {
        name: document.getElementById('m-task-name').value,
        start_time: startTime,
        end_time: endTime,
        label: label,
        description: document.getElementById('m-task-desc').value,
        is_routine: isRoutine,
        recurrence_type: isRoutine ? recurrenceType : 'Daily',
        repeat_days: repeatDays
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include'
    });

    if (response.ok) {
        closeModal();
        loadDashboardData();
    } else {
        const res = await response.json();
        alert(res.message || "Failed to save task");
    }
});

async function deleteTask(id) {
    // No confirm per request "Clean inline feedback" - wait, actually user said "Remove notification messages".
    // I will keep confirm for safety but maybe style it? For now standard confirm is safest.
    if (!confirm("Delete this task?")) return;

    const response = await fetch(`${API_URL}/api/tasks/delete/${id}`, {
        method: 'DELETE',
        credentials: 'include'
    });

    if (response.ok) {
        loadDashboardData();
    } else {
        console.error("Failed to delete");
    }
}


// --- Event Listeners Init ---

document.addEventListener('DOMContentLoaded', () => {
    // Clock
    setInterval(() => {
        const now = new Date();
        const dtEl = document.getElementById('current-datetime');
        if (dtEl) {
            // "Add today’s full date and current time"
            // E.g. Saturday, December 27, 2025 | 10:30:45 PM
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
            dtEl.textContent = now.toLocaleDateString('en-US', options).replace(' at ', ' | ');
        }
    }, 1000);

    // Initial load checks
    if (window.location.pathname.includes('dashboard') || window.location.pathname === '/') {
        checkAuth().then(auth => {
            if (auth) loadDashboardData();
            // else user might be redirected by backend or needs to login, but dashboard.html has script to redirect
        });
    }

    // Forms (Login/Signup logic remains similar, simplified for brevity here or handled in their specific files)
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const res = await login(document.getElementById('email').value, document.getElementById('password').value);
            if (res.success) window.location.href = '/dashboard';
            else document.getElementById('error-message').textContent = res.message;
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        // Real-time validation
        const passInput = document.getElementById('password');
        const reqLen = document.getElementById('req-length');
        const reqMix = document.getElementById('req-mix');
        const reqList = document.getElementById('password-requirements');

        if (passInput && reqList) {
            passInput.addEventListener('focus', () => reqList.style.display = 'block');
            passInput.addEventListener('input', () => {
                const val = passInput.value;
                // Length > 8
                if (val.length >= 8) reqLen.classList.add('valid');
                else reqLen.classList.remove('valid');

                // Mix: letter, number, symbol
                const hasLetter = /[a-zA-Z]/.test(val);
                const hasNum = /[0-9]/.test(val);
                const hasSym = /[^a-zA-Z0-9]/.test(val);
                if (hasLetter && hasNum && hasSym) reqMix.classList.add('valid');
                else reqMix.classList.remove('valid');
            });
        }

        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm = document.getElementById('confirm_password').value;
            const errorDiv = document.getElementById('error-message');

            // Client-side checks
            if (password !== confirm) {
                errorDiv.textContent = "Passwords do not match.";
                errorDiv.classList.remove('hidden');
                return;
            }

            const isStrong = password.length >= 8 &&
                /[a-zA-Z]/.test(password) &&
                /[0-9]/.test(password) &&
                /[^a-zA-Z0-9]/.test(password);

            if (!isStrong) {
                errorDiv.textContent = "Password does not meet security requirements.";
                errorDiv.classList.remove('hidden');
                return;
            }

            const res = await signup(username, email, password);
            if (res.success) {
                window.location.href = '/login';
            } else {
                errorDiv.textContent = res.message;
                errorDiv.classList.remove('hidden');
            }
        });
    }
});

// --- Utils ---
function togglePassword(fieldId, icon) {
    const input = document.getElementById(fieldId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
        icon.style.color = 'var(--accent-gold)';
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
        icon.style.color = '';
    }
}

// Expose functions to global scope for HTML onclick attributes
window.openByModal = openByModal;
window.deleteTask = deleteTask;
window.closeModal = closeModal;
window.setRange = typeof setRange !== 'undefined' ? setRange : null;
window.exportReport = typeof exportReport !== 'undefined' ? exportReport : null;
