const STORAGE_KEY = 'spent_tasks';

// --- Data Management (LocalStorage) ---

function getTasks() {
    const tasks = localStorage.getItem(STORAGE_KEY);
    return tasks ? JSON.parse(tasks) : [];
}

function saveTasks(tasks) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(task) {
    const tasks = getTasks();
    tasks.push(task);
    saveTasks(tasks);
}

function updateTask(updatedTask) {
    let tasks = getTasks();
    const index = tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
        tasks[index] = updatedTask;
        saveTasks(tasks);
    }
}

function removeTask(id) {
    let tasks = getTasks();
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(tasks);
}

// --- Time & Financial Logic ---

function getSecondsSinceMidnight() {
    const now = new Date();
    return (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
}

function timeStringToSeconds(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 3600) + (minutes * 60);
}

function secondsToTimeString(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${m}`;
}

function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
}

function getLocalDateString() {
    const now = new Date();
    // Returns YYYY-MM-DD in local time
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function calculateDailyStats() {
    const nowSeconds = getSecondsSinceMidnight();
    const tasks = getTasks();
    const today = getLocalDateString();

    // Filter tasks for today
    const todaysTasks = tasks.filter(t => t.date === today);

    // Collect intervals for Good/Neutral tasks
    const investments = [];

    todaysTasks.forEach(task => {
        if (task.label === 'Good' || task.label === 'Neutral') {
            investments.push({
                start: timeStringToSeconds(task.start_time),
                end: timeStringToSeconds(task.end_time)
            });
        }
    });

    // Merge intervals to avoid double-counting time
    investments.sort((a, b) => a.start - b.start);

    const mergedInvestments = [];
    if (investments.length > 0) {
        let current = investments[0];

        for (let i = 1; i < investments.length; i++) {
            const next = investments[i];
            if (current.end >= next.start) {
                // Overlap, merge
                current.end = Math.max(current.end, next.end);
            } else {
                // No overlap, push current and move to next
                mergedInvestments.push(current);
                current = next;
            }
        }
        mergedInvestments.push(current);
    }

    // Calculate Total Invested (Static - Time Covered) and Invested So Far (Live)
    let totalInvestedStatic = 0;
    let investedSoFar = 0;

    mergedInvestments.forEach(inv => {
        // Static total duration
        totalInvestedStatic += (inv.end - inv.start);

        // Live invested (intersection with [0, nowSeconds])
        if (nowSeconds > inv.start) {
            const effectiveEnd = Math.min(inv.end, nowSeconds);
            investedSoFar += (effectiveEnd - inv.start);
        }
    });

    // 3. Wasted (Live)
    // Time passed so far - Time spent productively/neutrally so far (merged)
    let totalWastedLive = nowSeconds - investedSoFar;
    if (totalWastedLive < 0) totalWastedLive = 0;

    // 4. Remaining (Live)
    const remainingLive = 86400 - nowSeconds;

    return {
        invested: totalInvestedStatic,
        wasted: totalWastedLive,
        remaining: remainingLive,
        tasks: todaysTasks
    };
}

// --- Dashboard UI Updates ---


function updateDashboard() {
    // Check if we are on the dashboard (look for the main new counter ID)
    const mainCounterDisplay = document.getElementById('main-counter-display');
    if (!mainCounterDisplay) return;

    const stats = calculateDailyStats();

    // Update MAIN Counter (Remaining Balance - Count Down)
    mainCounterDisplay.textContent = stats.remaining.toLocaleString();

    // Update Secondary Metrics
    // Card 1: Invested (Static Sum)
    const investedEl = document.getElementById('invested-today');
    const investedDurEl = document.getElementById('invested-duration');

    if (investedEl) investedEl.textContent = stats.invested.toLocaleString();
    if (investedDurEl) investedDurEl.textContent = formatDuration(stats.invested);

    // Card 2: Wasted (Live Count Up)
    const wastedEl = document.getElementById('wasted-time-small');
    const wastedDurEl = document.getElementById('wasted-duration');

    if (wastedEl) wastedEl.textContent = stats.wasted.toLocaleString();
    if (wastedDurEl) wastedDurEl.textContent = formatDuration(stats.wasted);
}

function renderTaskList() {
    const list = document.getElementById('task-list');
    if (!list) return;

    const tasks = getTasks();
    const today = getLocalDateString();
    const todaysTasks = tasks.filter(t => t.date === today).sort((a, b) => a.start_time.localeCompare(b.start_time));

    list.innerHTML = '';

    if (todaysTasks.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-secondary); margin-top:2rem;">No transactions today. Time is slipping away...</p>';
        return;
    }

    todaysTasks.forEach(task => {
        const div = document.createElement('div');
        div.className = `task-card ${task.label.toLowerCase()}`;

        // Calculate Cost/Value (Planned)
        const s = timeStringToSeconds(task.start_time);
        const e = timeStringToSeconds(task.end_time);
        const val = e - s;

        div.innerHTML = `
            <div class="task-info">
                <h4>${task.name} <small style="color:var(--text-secondary); font-weight:normal;">(${task.start_time} - ${task.end_time})</small></h4>
                <div style="display:flex; gap:0.5rem; margin-top:0.3rem;">
                    <span class="badge ${task.label === 'Good' ? 'badge-good' : task.label === 'Bad' ? 'badge-bad' : 'badge-neutral'}">${task.label}</span>
                    ${task.is_routine ? '<span class="badge" style="border:1px solid var(--text-secondary); color:var(--text-secondary);">Routine</span>' : ''}
                </div>
            </div>
            
            <div class="task-price-tag">$${val.toLocaleString()}</div>
            
            <div class="actions">
                <button onclick="openByModal('${task.id}')" class="btn-sm-icon" title="Edit">✎</button>
                <button onclick="deleteTask('${task.id}')" class="btn-sm-icon delete" title="Delete">🗑</button>
            </div>
        `;
        list.appendChild(div);
    });
}


// --- Modal & Form Logic ---

function openByModal(taskId = null) {
    const modal = document.getElementById('task-modal');
    const form = document.getElementById('modal-task-form');
    const title = document.getElementById('modal-title');

    if (!modal || !form) return;

    form.reset();
    document.getElementById('task-id').value = '';

    // Reset UI
    const routineOpts = document.getElementById('routine-options');
    if (routineOpts) routineOpts.classList.add('hidden');

    if (taskId && taskId !== 'undefined' && taskId !== 'null') {
        // Edit Mode
        const tasks = getTasks();
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            title.textContent = 'Edit Transaction';
            document.getElementById('task-id').value = task.id;
            document.getElementById('m-task-name').value = task.name;
            document.getElementById('m-task-start').value = task.start_time;
            document.getElementById('m-task-end').value = task.end_time;
            document.getElementById('m-task-desc').value = task.description || '';

            // Category
            const radio = document.querySelector(`input[name="category"][value="${task.label}"]`);
            if (radio) radio.checked = true;

            if (task.is_routine) {
                document.getElementById('m-is-routine').checked = true;
                if (routineOpts) routineOpts.classList.remove('hidden');
                document.getElementById('m-recurrence-type').value = task.recurrence_type;
                window.setRecurrence(task.recurrence_type);
            }
        }
    } else {
        // Add Mode
        title.textContent = 'New Transaction';
        const now = new Date();
        const nowStr = now.toTimeString().slice(0, 5);
        document.getElementById('m-task-start').value = nowStr;
        // Default end time + 30 mins
        const end = new Date(now.getTime() + 30 * 60000);
        document.getElementById('m-task-end').value = end.toTimeString().slice(0, 5);

        // Reset Recurrence UI
        window.setRecurrence('Daily');
    }

    modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('task-modal');
    if (modal) modal.classList.remove('active');
}

function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('task-id').value;
    const name = document.getElementById('m-task-name').value;
    const start = document.getElementById('m-task-start').value;
    const end = document.getElementById('m-task-end').value;
    const desc = document.getElementById('m-task-desc').value;
    const label = document.querySelector('input[name="category"]:checked').value;
    const isRoutine = document.getElementById('m-is-routine').checked;
    const recurrenceType = document.getElementById('m-recurrence-type').value;

    if (start >= end) {
        alert("End time must be after start time.");
        return;
    }

    const newTask = {
        id: id || Date.now().toString(),
        name,
        start_time: start,
        end_time: end,
        description: desc,
        label,
        is_routine: isRoutine,
        recurrence_type: recurrenceType,
        date: getLocalDateString()
    };

    if (id) {
        updateTask(newTask);
    } else {
        addTask(newTask);
    }

    closeModal();
    renderTaskList();
    updateDashboard(); // Immediate update
}

function deleteTaskWrapper(id) {
    if (confirm("Delete this transaction?")) {
        removeTask(id);
        renderTaskList();
        updateDashboard();
    }
}


// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {

    // Core Clock Init
    setInterval(() => {
        // Update Time Display
        const dtEl = document.getElementById('current-datetime');
        if (dtEl) {
            const now = new Date();
            const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' };
            dtEl.textContent = now.toLocaleDateString('en-US', options).replace(' at ', ' | ');
        }

        // Update Stats
        updateDashboard();
    }, 1000);

    // Initial Renders
    if (document.getElementById('task-list')) {
        renderTaskList();
        updateDashboard();
    }

    // Modal Events
    const form = document.getElementById('modal-task-form');
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Close Modal on Outside Click
    window.onclick = function (event) {
        const modal = document.getElementById('task-modal');
        if (event.target == modal) closeModal();
    }

    // Recurrence logic UI
    const routineCheck = document.getElementById('m-is-routine');
    if (routineCheck) {
        routineCheck.addEventListener('change', function () {
            const opts = document.getElementById('routine-options');
            if (this.checked) opts.classList.remove('hidden');
            else opts.classList.add('hidden');
        });
    }
});

// Expose to window for HTML attributes
window.openByModal = openByModal;
window.closeModal = closeModal;
window.deleteTask = deleteTaskWrapper;
// Helper for recurrence UI which might be used in modal
window.setRecurrence = function (val) {
    document.querySelectorAll('.recurrence-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.recurrence-btn[data-value="${val}"]`);
    if (btn) btn.classList.add('active');

    const inp = document.getElementById('m-recurrence-type');
    if (inp) inp.value = val;

    const custom = document.getElementById('custom-days-container');
    if (custom) {
        if (val === 'Custom') custom.classList.remove('hidden');
        else custom.classList.add('hidden');
    }
};
window.toggleDay = function (el) {
    el.classList.toggle('active');
};
