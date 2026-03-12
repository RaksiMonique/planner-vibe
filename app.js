// --- DATA INITIALIZATION ---
let state = JSON.parse(localStorage.getItem('secondBrainData')) || {
    tasks: [],
    bibleStudies: [],
    habits: [],
    segments: { God: [], Finance: [], Health: [], Leisure: [], Business: [] },
    routines: { morning: [], evening: [] },
    recipes: [],
    mealPlan: {},
    journal: {},
    quotes: []
};

// Ensure journal object exists for backward compatibility with old data
if (!state.journal) {
    state.journal = {};
}

// Ensure quotes array exists for backward compatibility with old data
if (!state.quotes) {
    state.quotes = [];
}

const saveState = () => localStorage.setItem('secondBrainData', JSON.stringify(state));

// --- UI HELPERS ---
function showToast(message, type = 'success') {
    const toastEl = document.getElementById('liveToast');
    const toastBody = document.getElementById('toast-body');
    
    toastBody.textContent = message;
    
    // Reset classes
    toastEl.className = `toast align-items-center border-0 text-white bg-${type === 'error' ? 'danger' : 'success'}`;
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// --- DATA MANAGEMENT ---
function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `second-brain-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Data exported successfully!');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = readerEvent => {
            try {
                const importedState = JSON.parse(readerEvent.target.result);

                // Add default for journal if missing for backward compatibility
                if (!importedState.journal) {
                    importedState.journal = {};
                }
                
                // Add default for quotes if missing
                if (!importedState.quotes) {
                    importedState.quotes = [];
                }

                // Basic validation
                const requiredKeys = ['tasks', 'bibleStudies', 'habits', 'segments', 'recipes', 'mealPlan'];
                const hasAllKeys = requiredKeys.every(key => key in importedState);

                if (!hasAllKeys) {
                    showToast('Invalid data file. Missing sections.', 'error');
                    return;
                }

                if (confirm('This will overwrite all current data with the contents of the file. Are you sure?')) {
                    state = importedState;
                    saveState();
                    showToast('Data imported successfully!');
                    showSection('dashboard'); // Go to dashboard to show new state
                }
            } catch (error) {
                showToast('Failed to parse file.', 'error');
                console.error("Import error:", error);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// --- QUICK ADD ---
function quickAddTask(event) {
    event.preventDefault();
    const input = document.getElementById('quick-add-task-input');
    const title = input.value.trim();

    if (!title) return;

    const newTask = {
        id: Date.now(),
        title: title,
        dueDate: new Date().toISOString().split('T')[0], // Today's date
        priority: 3, // Medium priority
        segment: '',
        completed: false
    };

    state.tasks.push(newTask);
    saveState();
    input.value = ''; // Clear input
    renderDashboard(document.getElementById('main-render')); // Refresh dashboard
    
    const originalPlaceholder = input.placeholder;
    input.placeholder = "Task added!";
    setTimeout(() => {
        input.placeholder = originalPlaceholder;
    }, 2000);
}

// --- NAVIGATION ---
function showSection(section) {
    const container = document.getElementById('main-render');
    const title = document.getElementById('section-title');
    const quickAddForm = document.getElementById('quick-add-task-form');

    // Update active link in sidebar
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });
    title.innerText = section.charAt(0).toUpperCase() + section.slice(1);
    quickAddForm.classList.toggle('d-none', section !== 'dashboard');

    switch(section) {
        case 'dashboard': renderDashboard(container); break;
        case 'calendar': renderCalendar(container); break;
        case 'bible': renderBibleStudy(container); break;
        case 'habits': renderHabits(container); break;
        case 'segments': renderSegments(container); break;
        case 'meals': renderMeals(container); break;
        case 'journal': renderJournal(container); break;
        case 'quotes': renderQuotes(container); break;
    }

    // Trigger Animation
    container.classList.remove('fade-in');
    void container.offsetWidth; // Trigger reflow
    container.classList.add('fade-in');
}

// --- CORE LOGIC: URGENCY ALGORITHM ---
function getUrgencyStatus(task) {
    if (!task.dueDate) return 'No Date';
    const diff = (new Date(task.dueDate) - new Date()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return 'Overdue';
    if (diff <= 1) return 'Today';
    if (diff <= 7) return 'This Week';
    return 'This Month';
}

// --- COMPONENT: DASHBOARD ---
function renderDashboard(container) {
    const urgentTasks = state.tasks
        .filter(t => !t.completed)
        .sort((a, b) => b.priority - a.priority || new Date(a.dueDate) - new Date(b.dueDate))
        .slice(0, 8);

    const todayStr = new Date().toISOString().split('T')[0];
    const todaysEvents = state.tasks.filter(t => t.dueDate === todayStr);

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-md-8">
                <div class="card p-4 mb-4">
                    <h5><i class="bi bi-lightning-charge text-warning"></i> Urgent Focus</h5>
                    <ul class="list-group list-group-flush mt-3">
                        ${urgentTasks.map(t => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <input type="checkbox" class="form-check-input me-2" onchange="toggleTask(${t.id})">
                                    <span class="${t.priority >= 4 ? 'fw-bold text-danger' : ''}">${t.title}</span>
                                    <small class="text-muted ms-2">${getUrgencyStatus(t)}</small>
                                </div>
                                <span class="badge bg-light text-dark border">${t.segment || 'General'}</span>
                            </li>
                        `).join('') || '<li class="list-group-item">All clear! No urgent tasks.</li>'}
                    </ul>
                </div>
                <div class="row g-3">
                    <div class="col-md-4">
                        <div class="card p-3 bg-primary text-white h-100">
                            <h6>Segment Progress</h6>
                            <small>Overall: ${calculateTotalProgress()}%</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card p-3 bg-success text-dark h-100">
                            <h6>Top Habit</h6>
                            <small>${getTopHabit()}</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card p-3 bg-info text-dark h-100">
                            <h6>Next Study</h6>
                            <small class="text-truncate d-block" title="${getNextBibleStudy()}">${getNextBibleStudy()}</small>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="card p-4 mb-4">
                    <h5><i class="bi bi-calendar-check text-info"></i> Today's Schedule</h5>
                    <ul class="list-group list-group-flush mt-3">
                        ${todaysEvents.map(t => `
                            <li class="list-group-item d-flex justify-content-between align-items-center">
                                <div>
                                    <input type="checkbox" class="form-check-input me-2" onchange="toggleTask(${t.id})" ${t.completed ? 'checked' : ''}>
                                    <span class="${t.completed ? 'text-decoration-line-through text-muted' : ''}">${t.title}</span>
                                </div>
                                <span class="badge bg-light text-dark border">${t.segment || 'General'}</span>
                            </li>
                        `).join('') || '<li class="list-group-item text-muted fst-italic">No events scheduled for today.</li>'}
                    </ul>
                </div>
                <div class="card p-4 bg-light border-0">
                    <h5>Daily Routines</h5>
                    <div class="mt-3">
                        <h6><i class="bi bi-sun"></i> Morning</h6>
                        <ul class="ps-3 mb-4">${state.routines.morning.length > 0 ? state.routines.morning.map(r => `<li>${r}</li>`).join('') : '<li class="text-muted fst-italic list-unstyled">Add morning tasks...</li>'}</ul>
                        <h6><i class="bi bi-moon-stars"></i> Evening</h6>
                        <ul class="ps-3">${state.routines.evening.length > 0 ? state.routines.evening.map(r => `<li>${r}</li>`).join('') : '<li class="text-muted fst-italic list-unstyled">Add evening tasks...</li>'}</ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function toggleTask(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveState();
        // Re-render the current view to reflect the change
        const activeSection = document.querySelector('#sidebar .nav-link.active').dataset.section || 'dashboard';
        showSection(activeSection);
    }
}

// --- COMPONENT: HABIT TRACKER ---
function addHabitPrompt() {
    const name = prompt("Enter the name of the new habit:");
    if (!name || name.trim() === '') return;

    const goal = parseInt(prompt("How many times per month do you want to do this?", "10"));
    if (isNaN(goal) || goal <= 0) {
        alert("Please enter a valid number for the goal.");
        return;
    }

    state.habits.push({
        name: name.trim(),
        goal: goal,
        logs: []
    });
    saveState();
    renderHabits(document.getElementById('main-render'));
}

function logHabit(habitIndex) {
    const habit = state.habits[habitIndex];
    if (!habit) return;

    const today = new Date().setHours(0, 0, 0, 0);
    const alreadyLoggedToday = habit.logs.some(log => new Date(log).setHours(0, 0, 0, 0) === today);
    if (alreadyLoggedToday) {
        showToast("You've already logged this habit today!", 'error');
        return;
    }

    habit.logs.push(Date.now());
    saveState();
    renderHabits(document.getElementById('main-render'));
}

function undoLastHabitLog(habitIndex) {
    const habit = state.habits[habitIndex];
    if (habit && habit.logs.length > 0) {
        habit.logs.pop();
        saveState();
        renderHabits(document.getElementById('main-render'));
    }
}

function deleteHabit(habitIndex) {
    if (confirm(`Are you sure you want to delete the habit "${state.habits[habitIndex].name}"?`)) {
        state.habits.splice(habitIndex, 1);
        saveState();
        renderHabits(document.getElementById('main-render'));
    }
}

function renderHabits(container) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const habitsHtml = state.habits.map((habit, index) => {
        const logsThisMonth = habit.logs.filter(log => {
            const logDate = new Date(log);
            return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });

        const progress = habit.goal > 0 ? Math.round((logsThisMonth.length / habit.goal) * 100) : 0;
        const today = new Date().setHours(0, 0, 0, 0);
        const loggedToday = logsThisMonth.some(log => new Date(log).setHours(0, 0, 0, 0) === today);

        return `
            <div class="col-md-6 col-lg-4">
                <div class="card h-100">
                    <div class="card-body d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start">
                            <h5 class="card-title">${habit.name}</h5>
                            <button class="btn btn-sm text-danger" onclick="deleteHabit(${index})"><i class="bi bi-trash"></i></button>
                        </div>
                        <p class="card-text text-muted">Monthly Goal: ${logsThisMonth.length} / ${habit.goal}</p>
                        <div class="progress mb-3" style="height: 1.25rem;">
                            <div class="progress-bar bg-success" role="progressbar" style="width: ${progress}%" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100">${progress}%</div>
                        </div>
                        <div class="mt-auto d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="undoLastHabitLog(${index})" ${habit.logs.length === 0 ? 'disabled' : ''}>Undo</button>
                            <button class="btn btn-sm btn-success" onclick="logHabit(${index})" ${loggedToday ? 'disabled' : ''}>
                                <i class="bi bi-check-lg"></i> ${loggedToday ? 'Logged Today' : 'Log Today'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4 class="m-0">Monthly Habits</h4>
            <button class="btn btn-primary" onclick="addHabitPrompt()">
                <i class="bi bi-plus-lg"></i> New Habit
            </button>
        </div>
        <div class="row g-4">
            ${habitsHtml || '<div class="col-12"><p class="text-muted fst-italic">No habits tracked yet. Add one to get started!</p></div>'}
        </div>
    `;
}

// --- COMPONENT: CALENDAR ---
let currentCalendarDate = new Date();

function changeMonth(offset) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset);
    renderCalendar(document.getElementById('main-render'));
}

function saveNewTask() {
    const title = document.getElementById('taskTitle').value;
    const date = document.getElementById('taskDate').value;
    
    if (!title || !date) {
        showToast('Please enter a title and date.', 'error');
        return;
    }

    const newTask = {
        id: Date.now(),
        title: title,
        dueDate: date,
        priority: parseInt(document.getElementById('taskPriority').value),
        segment: document.getElementById('taskSegment').value,
        recurring: document.getElementById('taskRecurring').checked,
        completed: false
    };

    state.tasks.push(newTask);
    saveState();

    // Hide modal and reset form
    const modalEl = document.getElementById('addTaskModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
    document.getElementById('addTaskForm').reset();

    showToast('Task added successfully!');
    renderCalendar(document.getElementById('main-render'));
}

function openEditTaskModal(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('editTaskId').value = task.id;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDate').value = task.dueDate;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskSegment').value = task.segment;

    const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
    modal.show();
}

function updateTask() {
    const taskId = parseInt(document.getElementById('editTaskId').value);
    const taskIndex = state.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    state.tasks[taskIndex] = {
        ...state.tasks[taskIndex],
        title: document.getElementById('editTaskTitle').value,
        dueDate: document.getElementById('editTaskDate').value,
        priority: parseInt(document.getElementById('editTaskPriority').value),
        segment: document.getElementById('editTaskSegment').value,
    };

    saveState();

    const modalEl = document.getElementById('editTaskModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    const activeSection = document.querySelector('#sidebar .nav-link.active').dataset.section;
    showSection(activeSection);
    showToast('Task updated!');
}

function deleteTask() {
    const taskId = parseInt(document.getElementById('editTaskId').value);
    
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    state.tasks = state.tasks.filter(t => t.id !== taskId);
    saveState();

    const modalEl = document.getElementById('editTaskModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    // Using a timeout to prevent Bootstrap backdrop issue on rapid modal closure/re-render
    setTimeout(() => {
        const activeSection = document.querySelector('#sidebar .nav-link.active').dataset.section;
        showSection(activeSection);
        showToast('Task deleted.');
    }, 150);
}

function renderCalendar(container) {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthName = currentCalendarDate.toLocaleString('default', { month: 'long' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let gridHtml = '';

    // Headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(day => {
        gridHtml += `<div class="text-center fw-bold p-2 border-bottom bg-light">${day}</div>`;
    });

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
        gridHtml += `<div class="calendar-day bg-light"></div>`;
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTasks = state.tasks.filter(t => t.dueDate === dateStr);
        const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

        gridHtml += `
            <div class="calendar-day border-end border-bottom">
                <div class="d-flex justify-content-between">
                    <span class="${isToday ? 'badge bg-primary rounded-circle' : 'fw-bold'}">${day}</span>
                </div>
                <div class="mt-1">
                    ${dayTasks.map(t => `<div class="task-item priority-${t.priority || 1} text-truncate" title="${t.title}" onclick="openEditTaskModal(${t.id})">${t.title}</div>`).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="card p-4">
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center gap-3">
                    <h4 class="m-0">${monthName} ${year}</h4>
                    <button class="btn btn-primary btn-sm" data-bs-toggle="modal" data-bs-target="#addTaskModal">
                        <i class="bi bi-plus-lg"></i> Add Task
                    </button>
                </div>
                <div>
                    <button class="btn btn-outline-secondary btn-sm" onclick="changeMonth(-1)"><i class="bi bi-chevron-left"></i></button>
                    <button class="btn btn-outline-secondary btn-sm" onclick="changeMonth(1)"><i class="bi bi-chevron-right"></i></button>
                </div>
            </div>
            <div class="overflow-auto">
                <div class="calendar-grid">
                    ${gridHtml}
                </div>
            </div>
        </div>
    `;
}

// --- COMPONENT: LIFE SEGMENTS ---
function addGoal(segment) {
    const input = document.getElementById(`input-${segment}`);
    const text = input.value.trim();
    if (!text) return;
    
    state.segments[segment].push({ text, done: false });
    saveState();
    renderSegments(document.getElementById('main-render'));
}

function toggleGoal(segment, index) {
    state.segments[segment][index].done = !state.segments[segment][index].done;
    saveState();
    renderSegments(document.getElementById('main-render'));
}

function deleteGoal(segment, index) {
    state.segments[segment].splice(index, 1);
    saveState();
    renderSegments(document.getElementById('main-render'));
}

function renderSegments(container) {
    const segments = Object.keys(state.segments);
    
    let html = '<div class="row g-4">';
    
    segments.forEach(segment => {
        const goals = state.segments[segment];
        const total = goals.length;
        const completed = goals.filter(g => g.done).length;
        const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
        
        // Icons mapping
        const icons = {
            God: 'bi-book',
            Finance: 'bi-cash-stack',
            Health: 'bi-heart-pulse',
            Leisure: 'bi-controller',
            Business: 'bi-briefcase'
        };

        html += `
            <div class="col-md-6">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center bg-white">
                        <h5 class="m-0"><i class="bi ${icons[segment] || 'bi-list'} me-2"></i>${segment}</h5>
                        <span class="badge bg-${progress === 100 ? 'success' : 'primary'}">${progress}%</span>
                    </div>
                    <div class="card-body">
                        <div class="progress mb-3" style="height: 10px;">
                            <div class="progress-bar bg-${progress === 100 ? 'success' : 'primary'}" role="progressbar" style="width: ${progress}%"></div>
                        </div>
                        
                        <ul class="list-group list-group-flush mb-3">
                            ${goals.map((g, i) => `
                                <li class="list-group-item d-flex align-items-center px-0">
                                    <input class="form-check-input me-2" type="checkbox" 
                                        ${g.done ? 'checked' : ''} 
                                        onchange="toggleGoal('${segment}', ${i})">
                                    <span class="${g.done ? 'text-decoration-line-through text-muted' : ''} flex-grow-1">${g.text}</span>
                                    <button class="btn btn-sm text-danger" onclick="deleteGoal('${segment}', ${i})"><i class="bi bi-trash"></i></button>
                                </li>
                            `).join('') || '<li class="list-group-item text-muted fst-italic px-0">No goals set yet.</li>'}
                        </ul>

                        <div class="input-group">
                            <input type="text" class="form-control form-control-sm" id="input-${segment}" placeholder="New goal...">
                            <button class="btn btn-outline-secondary btn-sm" type="button" onclick="addGoal('${segment}')">Add</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// --- COMPONENT: MEAL PLANNER ---
function planMeal(date, recipeId) {
    if (recipeId) {
        state.mealPlan[date] = parseInt(recipeId);
    } else {
        delete state.mealPlan[date];
    }
    saveState();
    renderMeals(document.getElementById('main-render'));
}

function openRecipeModal(recipeId = null) {
    const modalEl = document.getElementById('recipeModal');
    const modalTitle = document.getElementById('recipeModalTitle');
    const deleteBtn = document.getElementById('deleteRecipeBtn');
    document.getElementById('recipeForm').reset();
    document.getElementById('ingredient-fields').innerHTML = '';

    if (recipeId) {
        const recipe = state.recipes.find(r => r.id === recipeId);
        if (!recipe) return;

        modalTitle.innerText = 'Edit Recipe';
        deleteBtn.style.display = 'block';

        document.getElementById('recipeId').value = recipe.id;
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeInstructions').value = recipe.instructions;
        recipe.ingredients.forEach(ing => addIngredientField(ing));

    } else {
        modalTitle.innerText = 'Add Recipe';
        deleteBtn.style.display = 'none';
        document.getElementById('recipeId').value = '';
        addIngredientField(); // Start with one empty ingredient field
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function addIngredientField(ingredient = {}) {
    const container = document.getElementById('ingredient-fields');
    const field = document.createElement('div');
    field.className = 'row g-2 mb-2 align-items-center ingredient-row';
    field.innerHTML = `
        <div class="col">
            <input type="text" class="form-control form-control-sm ingredient-name" placeholder="Name" value="${ingredient.name || ''}">
        </div>
        <div class="col-auto">
            <input type="number" class="form-control form-control-sm ingredient-qty" placeholder="Qty" style="width: 80px;" value="${ingredient.qty || ''}">
        </div>
        <div class="col">
            <input type="text" class="form-control form-control-sm ingredient-unit" placeholder="Unit (e.g., cups, tbsp)" value="${ingredient.unit || ''}">
        </div>
        <div class="col-auto">
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="this.parentElement.parentElement.remove()">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(field);
}

function saveRecipe() {
    const recipeId = document.getElementById('recipeId').value;
    const name = document.getElementById('recipeName').value;
    if (!name) {
        showToast('Recipe name is required.', 'error');
        return;
    }

    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
        const ingName = row.querySelector('.ingredient-name').value;
        const ingQty = row.querySelector('.ingredient-qty').value;
        const ingUnit = row.querySelector('.ingredient-unit').value;
        if (ingName) {
            ingredients.push({ name: ingName, qty: parseFloat(ingQty) || 0, unit: ingUnit });
        }
    });

    const recipeData = {
        id: recipeId ? parseInt(recipeId) : Date.now(),
        name: name,
        instructions: document.getElementById('recipeInstructions').value,
        ingredients: ingredients
    };

    if (recipeId) {
        const index = state.recipes.findIndex(r => r.id === parseInt(recipeId));
        if (index !== -1) {
            state.recipes[index] = recipeData;
        }
    } else {
        state.recipes.push(recipeData);
    }

    saveState();
    
    const modalEl = document.getElementById('recipeModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showToast('Recipe saved!');
    renderMeals(document.getElementById('main-render'));
}

function deleteRecipe() {
    const recipeId = parseInt(document.getElementById('recipeId').value);
    if (!recipeId || !confirm('Are you sure you want to delete this recipe? This cannot be undone.')) {
        return;
    }

    // Also remove from any meal plans
    for (const date in state.mealPlan) {
        if (state.mealPlan[date] === recipeId) {
            delete state.mealPlan[date];
        }
    }

    state.recipes = state.recipes.filter(r => r.id !== recipeId);
    saveState();

    const modalEl = document.getElementById('recipeModal');
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();

    showToast('Recipe deleted.');
    renderMeals(document.getElementById('main-render'));
}

function renderMeals(container) {
    const recipes = state.recipes;
    const mealPlan = state.mealPlan;

    let recipeOptions = recipes.map(r => `<option value="${r.id}">${r.name}</option>`).join('');

    let mealPlanHtml = '';
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const plannedRecipeId = mealPlan[dateStr];
        const plannedRecipe = recipes.find(r => r.id === plannedRecipeId);

        mealPlanHtml += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
                <div>
                    <div class="fw-bold">${dayName} <small class="text-muted">${date.toLocaleDateString()}</small></div>
                    <div class="mt-1">${plannedRecipe ? `Planned: ${plannedRecipe.name}` : 'Nothing planned.'}</div>
                </div>
                <div class="d-flex align-items-center">
                    <select class="form-select form-select-sm w-auto me-2" onchange="planMeal('${dateStr}', this.value)">
                        <option value="">Choose a meal...</option>
                        ${recipeOptions}
                    </select>
                </div>
            </li>
        `;
    }

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-5">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="m-0">My Recipes</h5>
                        <button class="btn btn-primary btn-sm" onclick="openRecipeModal()">
                            <i class="bi bi-plus-lg"></i> Add Recipe
                        </button>
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">
                            ${recipes.map(r => `
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    ${r.name}
                                    <button class="btn btn-outline-secondary btn-sm" onclick="openRecipeModal(${r.id})">
                                        View/Edit
                                    </button>
                                </li>
                            `).join('') || '<li class="list-group-item text-muted">No recipes yet.</li>'}
                        </ul>
                    </div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="m-0">Upcoming Meal Plan</h5>
                        <button class="btn btn-success btn-sm" onclick="generateGroceryList()">
                            <i class="bi bi-cart"></i> Generate Grocery List
                        </button>
                    </div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush">
                            ${mealPlanHtml}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function generateGroceryList() {
    const ingredientsMap = new Map();
    const today = new Date();

    // Aggregate ingredients for the next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date();
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];

        const plannedRecipeId = state.mealPlan[dateStr];
        if (plannedRecipeId) {
            const recipe = state.recipes.find(r => r.id === plannedRecipeId);
            if (recipe && recipe.ingredients) {
                recipe.ingredients.forEach(ing => {
                    if (!ing.name) return; // Skip empty ingredients

                    const key = `${ing.name.trim().toLowerCase()}_${(ing.unit || '').trim().toLowerCase()}`;
                    
                    if (ingredientsMap.has(key)) {
                        const existing = ingredientsMap.get(key);
                        existing.qty += ing.qty || 0;
                    } else {
                        ingredientsMap.set(key, {
                            name: ing.name.trim(),
                            qty: ing.qty || 0,
                            unit: (ing.unit || '').trim()
                        });
                    }
                });
            }
        }
    }

    const listContent = document.getElementById('grocery-list-content');
    if (ingredientsMap.size === 0) {
        listContent.innerHTML = '<p class="text-muted fst-italic">No meals planned for the next 7 days, or planned meals have no ingredients.</p>';
    } else {
        let html = '<ul class="list-group list-group-flush">';
        for (const ing of [...ingredientsMap.values()].sort((a, b) => a.name.localeCompare(b.name))) {
            html += `<li class="list-group-item">${ing.name} - <strong>${ing.qty > 0 ? ing.qty : ''} ${ing.unit}</strong></li>`;
        }
        html += '</ul>';
        listContent.innerHTML = html;
    }

    const modal = new bootstrap.Modal(document.getElementById('groceryListModal'));
    modal.show();
}

function copyGroceryList() {
    const listEl = document.getElementById('grocery-list-content');
    const textToCopy = Array.from(listEl.querySelectorAll('li')).map(li => `- ${li.innerText}`).join('\n');
    navigator.clipboard.writeText(textToCopy || listEl.innerText).then(() => showToast('List copied to clipboard!'));
}

// --- COMPONENT: BIBLE STUDY ---
function openBibleStudyModal(studyId = null) {
    const modalEl = document.getElementById('bibleStudyModal');
    const modalTitle = document.getElementById('bibleStudyModalTitle');
    const deleteBtn = document.getElementById('deleteStudyBtn');
    const form = document.getElementById('bibleStudyForm');
    const prereqSelect = document.getElementById('studyPrereq');
    
    form.reset();

    // Populate Prerequisite Dropdown (exclude current study if editing)
    prereqSelect.innerHTML = '<option value="">None</option>';
    state.bibleStudies.forEach(s => {
        if (s.id !== studyId) {
            prereqSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        }
    });

    if (studyId) {
        const study = state.bibleStudies.find(s => s.id === studyId);
        if (!study) return;

        modalTitle.innerText = 'Edit Bible Study';
        deleteBtn.style.display = 'block';
        
        document.getElementById('bibleStudyId').value = study.id;
        document.getElementById('studyName').value = study.name;
        document.getElementById('studyType').value = study.type;
        document.getElementById('studyPriority').value = study.priority;
        document.getElementById('studyStatus').value = study.status;
        document.getElementById('studyBible').value = study.bible;
        document.getElementById('studyPrereq').value = study.prereqId || '';
    } else {
        modalTitle.innerText = 'Add Bible Study';
        deleteBtn.style.display = 'none';
        document.getElementById('bibleStudyId').value = '';
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function saveBibleStudy() {
    const id = document.getElementById('bibleStudyId').value;
    const name = document.getElementById('studyName').value;
    
    if (!name) {
        showToast('Study Name is required', 'error');
        return;
    }

    const studyData = {
        id: id ? parseInt(id) : Date.now(),
        name: name,
        type: document.getElementById('studyType').value,
        priority: document.getElementById('studyPriority').value,
        status: document.getElementById('studyStatus').value,
        bible: document.getElementById('studyBible').value,
        prereqId: document.getElementById('studyPrereq').value ? parseInt(document.getElementById('studyPrereq').value) : null,
        lastUpdate: id ? (state.bibleStudies.find(s => s.id == id).lastUpdate) : Date.now()
    };

    if (id) {
        const index = state.bibleStudies.findIndex(s => s.id == id);
        if (index !== -1) state.bibleStudies[index] = studyData;
    } else {
        state.bibleStudies.push(studyData);
    }

    saveState();
    const modal = bootstrap.Modal.getInstance(document.getElementById('bibleStudyModal'));
    if (modal) modal.hide();
    showToast('Bible study saved!');
    renderBibleStudy(document.getElementById('main-render'));
}

function deleteBibleStudy() {
    const id = parseInt(document.getElementById('bibleStudyId').value);
    if (confirm('Delete this study?')) {
        state.bibleStudies = state.bibleStudies.filter(s => s.id !== id);
        saveState();
        const modal = bootstrap.Modal.getInstance(document.getElementById('bibleStudyModal'));
        if (modal) modal.hide();
        showToast('Bible study deleted.');
        renderBibleStudy(document.getElementById('main-render'));
    }
}

function logStudySession(id) {
    const study = state.bibleStudies.find(s => s.id === id);
    if (study) {
        study.lastUpdate = Date.now();
        saveState();
        showToast('Session logged!');
        renderBibleStudy(document.getElementById('main-render'));
    }
}

function renderBibleStudy(container) {
    const studies = state.bibleStudies;
    const inProgress = studies.filter(s => s.status === 'In Progress').sort((a, b) => b.lastUpdate - a.lastUpdate);
    const notStarted = studies.filter(s => s.status === 'Not Started');
    const completed = studies.filter(s => s.status === 'Completed');

    const createCard = (s) => {
        const prereq = s.prereqId ? state.bibleStudies.find(p => p.id === s.prereqId) : null;
        return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 border-${s.priority === 'High' ? 'danger' : s.priority === 'Medium' ? 'warning' : 'info'}">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title text-truncate" title="${s.name}">${s.name}</h5>
                        <span class="badge bg-secondary">${s.type}</span>
                    </div>
                    <p class="card-text small text-muted mb-2">
                        <i class="bi bi-book"></i> ${s.bible || 'N/A'} <br>
                        ${prereq ? `<i class="bi bi-arrow-right-circle"></i> After: ${prereq.name}` : ''}
                    </p>
                    <p class="card-text"><small class="text-muted">Last updated: ${new Date(s.lastUpdate).toLocaleDateString()}</small></p>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-sm btn-outline-primary flex-grow-1" onclick="openBibleStudyModal(${s.id})">Edit</button>
                        ${s.status === 'In Progress' ? `<button class="btn btn-sm btn-success flex-grow-1" onclick="logStudySession(${s.id})">Log Session</button>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    };

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4>Bible Study Tracker</h4>
            <button class="btn btn-primary" onclick="openBibleStudyModal()"><i class="bi bi-plus-lg"></i> Add Study</button>
        </div>

        <h5 class="text-primary border-bottom pb-2 mb-3">In Progress</h5>
        <div class="row g-3 mb-4">
            ${inProgress.map(createCard).join('') || '<p class="text-muted fst-italic">No active studies.</p>'}
        </div>

        <h5 class="text-secondary border-bottom pb-2 mb-3">Up Next</h5>
        <div class="row g-3 mb-4">
            ${notStarted.map(createCard).join('') || '<p class="text-muted fst-italic">No upcoming studies.</p>'}
        </div>

        ${completed.length > 0 ? `
            <h5 class="text-success border-bottom pb-2 mb-3">Completed</h5>
            <div class="row g-3">
                ${completed.map(createCard).join('')}
            </div>
        ` : ''}
        </div>
    `;
}

// --- COMPONENT: JOURNAL ---
function saveJournalEntry() {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const content = document.getElementById('journal-entry-today').value;

    if (content.trim() === '') {
        if (state.journal[todayStr]) {
            delete state.journal[todayStr];
        }
    } else {
        state.journal[todayStr] = content;
    }

    saveState();
    showToast('Journal entry saved!');

    const saveBtn = document.getElementById('save-journal-btn');
    saveBtn.disabled = true;
    saveBtn.innerText = 'Saved!';
}

function renderJournal(container) {
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const todaysEntry = state.journal[todayStr] || '';

    const pastEntries = Object.keys(state.journal)
        .filter(date => date !== todayStr)
        .sort((a, b) => new Date(b) - new Date(a));

    container.innerHTML = `
        <div class="row g-4">
            <div class="col-lg-8">
                <div class="card">
                    <div class="card-header">
                        <h5 class="m-0">Today's Journal - ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h5>
                    </div>
                    <div class="card-body">
                        <textarea id="journal-entry-today" class="form-control" rows="12" placeholder="What's on your mind?"></textarea>
                    </div>
                    <div class="card-footer text-end">
                        <button id="save-journal-btn" class="btn btn-primary" onclick="saveJournalEntry()">Save Entry</button>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="card">
                    <div class="card-header">
                        <h5 class="m-0"><i class="bi bi-clock-history"></i> Past Entries</h5>
                    </div>
                    <div class="card-body" style="max-height: 500px; overflow-y: auto;">
                        ${pastEntries.length > 0 ? `
                            <div class="accordion accordion-flush" id="past-entries-accordion">
                                ${pastEntries.map((date, index) => `
                                    <div class="accordion-item">
                                        <h2 class="accordion-header" id="heading-${index}">
                                            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${index}">
                                                ${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </button>
                                        </h2>
                                        <div id="collapse-${index}" class="accordion-collapse collapse" data-bs-parent="#past-entries-accordion">
                                            <div class="accordion-body small" style="white-space: pre-wrap;">${state.journal[date]}</div>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        ` : '<p class="text-muted fst-italic">No past journal entries found.</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add a listener to the textarea to enable the save button on input
    const textarea = document.getElementById('journal-entry-today');
    const saveBtn = document.getElementById('save-journal-btn');
    if (textarea && saveBtn) {
        textarea.value = todaysEntry; // Set value safely via JS
        textarea.addEventListener('input', () => {
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Entry';
        });
    }
}

// --- COMPONENT: QUOTES ---
function openQuoteModal(quoteId = null) {
    const modalEl = document.getElementById('quoteModal');
    const modalTitle = document.getElementById('quoteModalTitle');
    const deleteBtn = document.getElementById('deleteQuoteBtn');
    document.getElementById('quoteForm').reset();

    if (quoteId) {
        const quote = state.quotes.find(q => q.id === quoteId);
        if (!quote) return;

        modalTitle.innerText = 'Edit Quote';
        deleteBtn.style.display = 'block';
        
        document.getElementById('quoteId').value = quote.id;
        document.getElementById('quoteText').value = quote.text;
        document.getElementById('quoteSource').value = quote.source;
        document.getElementById('quoteAuthor').value = quote.author || '';
        document.getElementById('quoteType').value = quote.type;
    } else {
        modalTitle.innerText = 'Add Quote';
        deleteBtn.style.display = 'none';
        document.getElementById('quoteId').value = '';
    }

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
}

function saveQuote() {
    const id = document.getElementById('quoteId').value;
    const text = document.getElementById('quoteText').value;
    const source = document.getElementById('quoteSource').value;
    
    if (!text || !source) {
        showToast('Quote text and source are required.', 'error');
        return;
    }

    const quoteData = {
        id: id ? parseInt(id) : Date.now(),
        text: text,
        source: source,
        author: document.getElementById('quoteAuthor').value,
        type: document.getElementById('quoteType').value
    };

    if (id) {
        const index = state.quotes.findIndex(q => q.id == id);
        if (index !== -1) state.quotes[index] = quoteData;
    } else {
        state.quotes.push(quoteData);
    }

    saveState();
    const modal = bootstrap.Modal.getInstance(document.getElementById('quoteModal'));
    if (modal) modal.hide();
    showToast('Quote saved!');
    renderQuotes(document.getElementById('main-render'));
}

function deleteQuote() {
    const id = parseInt(document.getElementById('quoteId').value);
    if (confirm('Delete this quote?')) {
        state.quotes = state.quotes.filter(q => q.id !== id);
        saveState();
        const modal = bootstrap.Modal.getInstance(document.getElementById('quoteModal'));
        if (modal) modal.hide();
        showToast('Quote deleted.');
        renderQuotes(document.getElementById('main-render'));
    }
}

function renderQuotes(container) {
    const quotes = state.quotes;
    const icons = {
        Book: 'bi-book',
        Movie: 'bi-film',
        Song: 'bi-music-note-beamed',
        Other: 'bi-chat-quote'
    };

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h4>Media Quotes</h4>
            <button class="btn btn-primary" onclick="openQuoteModal()">
                <i class="bi bi-plus-lg"></i> Add Quote
            </button>
        </div>
        <div class="row g-4">
            ${quotes.map(q => `
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body">
                            <figure class="mb-0">
                                <blockquote class="blockquote">
                                    <p class="fs-6">"${q.text}"</p>
                                </blockquote>
                                <figcaption class="blockquote-footer mb-0">
                                    ${q.author ? `${q.author} in ` : ''} <cite title="Source">${q.source}</cite>
                                </figcaption>
                            </figure>
                        </div>
                        <div class="card-footer d-flex justify-content-between align-items-center text-muted small">
                            <span><i class="bi ${icons[q.type]} me-1"></i> ${q.type}</span>
                            <button class="btn btn-link btn-sm p-0 text-secondary" onclick="openQuoteModal(${q.id})">Edit</button>
                        </div>
                    </div>
                </div>
            `).join('') || '<div class="col-12"><p class="text-muted fst-italic">No quotes added yet.</p></div>'}
        </div>
    `;
}

// --- HELPER FUNCTIONS ---
function calculateTotalProgress() {
    let total = 0, completed = 0;
    Object.values(state.segments).forEach(tasks => {
        tasks.forEach(t => { total++; if(t.done) completed++; });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
}

function getTopHabit() {
    if (state.habits.length === 0) return "None yet";

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const habitsWithMonthlyProgress = state.habits.map(habit => {
        const logsThisMonth = habit.logs.filter(log => {
            const logDate = new Date(log);
            return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
        });
        const progress = (habit.goal > 0) ? (logsThisMonth.length / habit.goal) : 0;
        return { ...habit, progress };
    });

    if (habitsWithMonthlyProgress.length === 0) return "None yet";

    let top = habitsWithMonthlyProgress.reduce((prev, current) =>
        (prev.progress > current.progress) ? prev : current
    );

    if (top.progress === 0) return "No progress yet";

    return `${top.name} (${Math.round(top.progress * 100)}%)`;
}

function getNextBibleStudy() {
    const studies = state.bibleStudies;
    if (!studies || studies.length === 0) return "None yet";

    const priorityMap = { 'High': 3, 'Medium': 2, 'Low': 1 };

    // 1. In Progress (Highest Priority, then Most Recently Updated)
    const inProgress = studies.filter(s => s.status === 'In Progress')
        .sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority] || b.lastUpdate - a.lastUpdate);
    
    if (inProgress.length > 0) return inProgress[0].name;

    // 2. Not Started (Highest Priority)
    const notStarted = studies.filter(s => s.status === 'Not Started')
        .sort((a, b) => priorityMap[b.priority] - priorityMap[a.priority]);
    
    if (notStarted.length > 0) return notStarted[0].name;

    return "All completed!";
}

// Initialize
function initializeApp() {
    document.getElementById('current-date').innerText = new Date().toDateString();

    // Setup navigation click handlers
    document.querySelectorAll('#sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent the link from navigating
            const section = link.dataset.section;
            if (section) {
                showSection(section);
                
                // Auto-close sidebar on mobile
                const sidebar = document.getElementById('sidebar');
                if (window.innerWidth < 768 && sidebar.classList.contains('active')) {
                    sidebar.classList.remove('active');
                }
            }
        });
    });

    // Setup Quick Add form
    document.getElementById('quick-add-task-form').addEventListener('submit', quickAddTask);

    // Sidebar Toggle for Mobile
    const toggleBtn = document.getElementById('sidebar-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    showSection('dashboard'); // Show initial section
}

initializeApp();
