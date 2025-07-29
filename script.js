const ADMIN_CODE = '291290';
let currentUserCode = null;
let isAdmin = false;
let hourHeight = 30; // Standard px pro Stunde

// Definierte Tage für den Kalender
const calendarDays = [
    '2025-08-02', '2025-08-03', '2025-08-04', '2025-08-05',
    '2025-08-06', '2025-08-07', '2025-08-08', '2025-08-09', '2025-08-10'
];

// Globale Daten-Arrays
let users = [];
let fixedActivities = [];
let proposals = [];

// Initiale Daten laden
async function loadInitialData() {
    try {
        const response = await fetch('data.json');
        const data = await response.json();
        users = data.users || [];
        fixedActivities = data.fixedActivities || [];
        proposals = data.proposals || [];
    } catch (error) {
        console.log('data.json nicht gefunden, starte mit leeren Daten.');
        users = [];
        fixedActivities = [];
        proposals = [];
    }
    saveToLocalStorage();
    updateCalendar();
    updateActivitiesList();
}

function saveToLocalStorage() {
    localStorage.setItem('users', JSON.stringify(users));
    localStorage.setItem('fixedActivities', JSON.stringify(fixedActivities));
    localStorage.setItem('proposals', JSON.stringify(proposals));
}

function loadFromLocalStorage() {
    users = JSON.parse(localStorage.getItem('users')) || [];
    fixedActivities = JSON.parse(localStorage.getItem('fixedActivities')) || [];
    proposals = JSON.parse(localStorage.getItem('proposals')) || [];
}

// Initiale Ladung
loadInitialData();

function verifyCode() {
    const code = document.getElementById('code-input').value.trim();
    if (code === ADMIN_CODE) {
        isAdmin = true;
        currentUserCode = code;
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('user-panel').style.display = 'none';
        document.getElementById('login-section').style.display = 'none';
        loadAdminPanel();
    } else if (code.length === 4 && users.some(user => user.code === code)) {
        isAdmin = false;
        currentUserCode = code;
        document.getElementById('user-panel').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
        document.getElementById('login-section').style.display = 'none';
    } else {
        alert('Ungültiger Code! Stelle sicher, dass der Code existiert.');
    }
    updateCalendar();
    updateActivitiesList();
}

function logout() {
    isAdmin = false;
    currentUserCode = null;
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('user-panel').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    updateCalendar();
    updateActivitiesList();
}

function addUser() {
    const name = document.getElementById('new-user-name').value.trim();
    if (name) {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        users.push({ name, code });
        saveToLocalStorage();
        loadUserList();
    }
}

function loadUserList() {
    const list = document.getElementById('user-list');
    list.innerHTML = '';
    users.forEach((user, index) => {
        const li = document.createElement('li');
        li.textContent = `${user.name} - Code: ${user.code}`;
        
        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Umbenennen';
        renameBtn.onclick = () => {
            const newName = prompt('Neuen Namen eingeben:', user.name);
            if (newName) {
                user.name = newName;
                saveToLocalStorage();
                loadUserList();
            }
        };
        li.appendChild(renameBtn);
        
        const editCodeBtn = document.createElement('button');
        editCodeBtn.textContent = 'Code ändern';
        editCodeBtn.onclick = () => {
            const newCode = prompt('Neuen 4-stelligen Code eingeben:', user.code);
            if (newCode && newCode.length === 4) {
                user.code = newCode;
                saveToLocalStorage();
                loadUserList();
            }
        };
        li.appendChild(editCodeBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Löschen';
        deleteBtn.onclick = () => {
            if (confirm(`Jugendlichen ${user.name} wirklich löschen?`)) {
                users.splice(index, 1);
                saveToLocalStorage();
                loadUserList();
            }
        };
        li.appendChild(deleteBtn);
        
        list.appendChild(li);
    });
}

function loadAdminPanel() {
    loadUserList();
    loadAdminProposals();
    loadEditActivities();
}

function loadAdminProposals() {
    const container = document.getElementById('admin-proposals');
    container.innerHTML = '';
    proposals.forEach(proposal => {
        const div = document.createElement('div');
        div.className = 'proposal';
        div.textContent = `${proposal.day} ${proposal.time}: ${proposal.name} (Ja: ${proposal.votesYes}, Nein: ${proposal.votesNo})`;
        const acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Annehmen';
        acceptBtn.onclick = () => {
            const duration = parseInt(prompt('Dauer in Minuten eingeben (z.B. 120 für Anfahrt etc.):')) || 60;
            fixedActivities.push({ day: proposal.day, time: proposal.time, duration, name: proposal.name });
            proposals = proposals.filter(p => p !== proposal);
            saveToLocalStorage();
            loadAdminProposals();
        };
        const rejectBtn = document.createElement('button');
        rejectBtn.textContent = 'Ablehnen';
        rejectBtn.onclick = () => {
            proposals = proposals.filter(p => p !== proposal);
            saveToLocalStorage();
            loadAdminProposals();
        };
        div.appendChild(acceptBtn);
        div.appendChild(rejectBtn);
        container.appendChild(div);
    });
}

function loadEditActivities() {
    const container = document.getElementById('edit-activities');
    container.innerHTML = '';
    fixedActivities.forEach((activity, index) => {
        const div = document.createElement('div');
        div.textContent = `${activity.day} ${activity.time} (${activity.duration} Min.): ${activity.name}`;
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Bearbeiten';
        editBtn.onclick = () => {
            const newTime = prompt('Neue Uhrzeit (z.B. 14:00):', activity.time);
            const newDuration = prompt('Neue Dauer in Minuten:', activity.duration);
            const newName = prompt('Neuer Name:', activity.name);
            if (newTime) activity.time = newTime;
            if (newDuration) activity.duration = parseInt(newDuration) || activity.duration;
            if (newName) activity.name = newName;
            saveToLocalStorage();
            loadEditActivities();
        };
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = 'Löschen';
        deleteBtn.onclick = () => {
            if (confirm('Aktivität löschen?')) {
                fixedActivities.splice(index, 1);
                saveToLocalStorage();
                loadEditActivities();
            }
        };
        div.appendChild(editBtn);
        div.appendChild(deleteBtn);
        container.appendChild(div);
    });
}

function submitProposal() {
    const day = document.getElementById('proposal-day').value;
    const time = document.getElementById('proposal-time').value.trim();
    const name = document.getElementById('proposal-name').value.trim();
    if (day && time && name) {
        proposals.push({ day, time, name, votesYes: 0, votesNo: 0, votedUsers: [] });
        saveToLocalStorage();
    } else {
        alert('Bitte alle Felder ausfüllen!');
    }
}

function addFixedActivity() {
    const day = document.getElementById('activity-day').value;
    const time = document.getElementById('activity-time').value.trim();
    const duration = parseInt(document.getElementById('activity-duration').value.trim()) || 60;
    const name = document.getElementById('activity-name').value.trim();
    if (day && time && name) {
        fixedActivities.push({ day, time, duration, name });
        saveToLocalStorage();
        loadEditActivities();
    } else {
        alert('Bitte alle Felder ausfüllen!');
    }
}

function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
}

function updateCalendar() {
    const calendar = document.getElementById('calendar');
    calendar.innerHTML = '';

    // Header mit Tagen
    const header = document.createElement('div');
    header.className = 'calendar-header';
    calendarDays.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.textContent = new Date(day).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric' });
        header.appendChild(dayHeader);
    });
    calendar.appendChild(header);

    // Grid mit Spalten
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    calendarDays.forEach(day => {
        const dayColumn = document.createElement('div');
        dayColumn.className = 'day-column dropzone';
        dayColumn.dataset.day = day;
        dayColumn.style.minHeight = `${24 * hourHeight}px`;

        // Stundenlinien
        const hourLines = document.createElement('div');
        hourLines.className = 'hour-lines';
        for (let hour = 0; hour < 24; hour++) {
            const hourLine = document.createElement('div');
            hourLine.className = 'hour-line';
            hourLine.style.height = `${hourHeight}px`;
            const label = document.createElement('span');
            label.className = 'hour-label';
            label.textContent = `${hour}:00`;
            hourLine.appendChild(label);
            hourLines.appendChild(hourLine);
        }
        dayColumn.appendChild(hourLines);

        dayColumn.addEventListener('dragover', dragOver);
        dayColumn.addEventListener('drop', drop);

        // Feste Aktivitäten
        fixedActivities.filter(a => a.day === day).forEach(activity => {
            const div = createActivityElement(activity, 'fixed-activity');
            const startMin = parseTime(activity.time);
            div.style.top = `${(startMin / 60) * hourHeight}px`;
            div.style.height = `${(activity.duration / 60) * hourHeight}px`;
            dayColumn.appendChild(div);
        });

        // Vorschläge
        proposals.filter(p => p.day === day).forEach(proposal => {
            const div = createProposalElement(proposal);
            const startMin = parseTime(proposal.time);
            div.style.top = `${(startMin / 60) * hourHeight}px`;
            div.style.height = `${hourHeight}px`; // 1 Stunde für Vorschläge
            dayColumn.appendChild(div);
        });

        grid.appendChild(dayColumn);
    });
    calendar.appendChild(grid);
}

function updateActivitiesList() {
    const list = document.getElementById('activities-list');
    list.innerHTML = '';

    fixedActivities.forEach(activity => {
        const div = createActivityElement(activity, 'fixed-activity draggable');
        list.appendChild(div);
    });

    proposals.forEach(proposal => {
        const div = createProposalElement(proposal, true);
        list.appendChild(div);
    });
}

function createActivityElement(activity, className) {
    const div = document.createElement('div');
    div.className = className;
    div.textContent = `${activity.time} (${activity.duration} Min.): ${activity.name}`;
    div.dataset.day = activity.day;
    div.dataset.time = activity.time;
    div.dataset.duration = activity.duration;
    div.dataset.name = activity.name;
    if (isAdmin) {
        div.draggable = true;
        div.addEventListener('dragstart', dragStart);
    }
    return div;
}

function createProposalElement(proposal, draggable = false) {
    const div = document.createElement('div');
    div.className = 'proposal' + (draggable && isAdmin ? ' draggable' : '');
    div.textContent = `${proposal.time}: ${proposal.name} (Ja: ${proposal.votesYes}, Nein: ${proposal.votesNo})`;
    div.dataset.day = proposal.day;
    div.dataset.time = proposal.time;
    div.dataset.name = proposal.name;
    if (draggable && isAdmin) {
        div.draggable = true;
        div.addEventListener('dragstart', dragStart);
    }
    div.onclick = () => {
        if (!currentUserCode) {
            alert('Bitte erst verifizieren!');
            return;
        }
        if (proposal.votedUsers.includes(currentUserCode)) {
            alert('Du hast bereits abgestimmt!');
            return;
        }
        const vote = confirm('Ja abstimmen? (OK = Ja, Abbrechen = Nein)');
        if (vote) {
            proposal.votesYes++;
        } else {
            proposal.votesNo++;
        }
        proposal.votedUsers.push(currentUserCode);
        saveToLocalStorage();
        updateCalendar();
        updateActivitiesList();
    };
    return div;
}

function dragStart(e) {
    const data = {
        id: e.target.dataset.id || Date.now(),
        type: e.target.className.includes('fixed-activity') ? 'fixed' : 'proposal',
        day: e.target.dataset.day,
        time: e.target.dataset.time,
        duration: e.target.dataset.duration || 60,
        name: e.target.dataset.name
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(data));
    setTimeout(() => {
        e.target.classList.add('dragging');
    }, 0);
}

function dragOver(e) {
    e.preventDefault();
}

function drop(e) {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const dayColumn = e.target.closest('.dropzone');
    const day = dayColumn.dataset.day;
    if (!day || !isAdmin) return;

    const rect = dayColumn.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const dropMin = Math.floor(y / hourHeight * 60);
    const dropHour = Math.floor(dropMin / 60);
    const dropMinute = dropMin % 60;
    const newTime = `${String(dropHour).padStart(2, '0')}:${String(dropMinute).padStart(2, '0')}`;

    const updatedItem = { day, time: newTime, duration: data.duration, name: data.name };
    if (data.type === 'fixed') {
        fixedActivities = fixedActivities.map(a => a.id === data.id ? updatedItem : a);
    } else if (data.type === 'proposal') {
        proposals = proposals.map(p => p.id === data.id ? updatedItem : p);
    }
    saveToLocalStorage();
    updateCalendar();
    updateActivitiesList();
}

// Slider für Skalierung
document.getElementById('scale-slider').addEventListener('input', (e) => {
    hourHeight = parseInt(e.target.value);
    updateCalendar();
});