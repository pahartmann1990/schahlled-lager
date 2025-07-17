// Der JS-Code bleibt größtenteils gleich, aber mit Erweiterungen für Login, Rechte, Logout-Zeit, Auto-Verknüpfung, Lager-Spezial, "versendet"-Button und Ausbuchen-Reiter.

// Global Variables - Erweitert
let currentUser = null;
let autoLogoutTimer;
let bookOuts = JSON.parse(localStorage.getItem('schahlled_bookouts')) || []; // Neu für Ausbuchen

// Initialisiere mit Patrick als Admin in users.json (passe data/users.json an)
// Beispiel: {"id":0, "name":"Patrick", "username":"patrick", "password":"adminpass", "role":"admin", "logoutTime":0, ...}

// In initializeApp() - Erweitert für Login
document.addEventListener('DOMContentLoaded', async function() {
    await loadInitialData();
    initializeApp();
    // Zeige Login bei Start
    if (!sessionStorage.getItem('currentUser')) {
        document.getElementById('loginModal').style.display = 'block';
    } else {
        currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        const users = JSON.parse(localStorage.getItem('schahlled_users'));
        setupAutoLogout(users.find(u => u.username === currentUser.username).logoutTime);
        if (currentUser.role === 'admin') {
            enableAdminFeatures();
        }
        autoSelectUser(currentUser);
    }
    // ... (rest gleich)
});

// Login-Handling
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const users = JSON.parse(localStorage.getItem('schahlled_users'));
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        currentUser = {username: username, role: user.role};
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        document.getElementById('loginModal').style.display = 'none';
        setupAutoLogout(user.logoutTime);
        if (user.role === 'admin') {
            enableAdminFeatures();
        } else if (user.role === 'lager') {
            // Lager-Modus: Kein Auto-Logout, manuelle Mitarbeiter-Auswahl
            promptEmployeeSelection();
        }
        autoSelectUser(user);
        alert('Login erfolgreich!');
    } else {
        alert('Falsche Anmeldedaten');
    }
});

// Auto-Logout (per User)
function setupAutoLogout(minutes) {
    if (minutes > 0 && currentUser.role !== 'lager') {
        autoLogoutTimer = setTimeout(() => {
            logout();
        }, minutes * 60 * 1000);
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('currentUser');
    clearTimeout(autoLogoutTimer);
    document.getElementById('loginModal').style.display = 'block'; // Zurück zum Login
    showPage('dashboard');
}

// Auto-Verknüpfung mit Mitarbeiter
function autoSelectUser(user) {
    // In Forms vorauswählen, außer für Lager
    if (user.role !== 'lager') {
        const userSelects = document.querySelectorAll('select[data-type="user"]'); // Tagg die Selects
        userSelects.forEach(select => {
            select.value = user.username;
        });
    }
}

// Lager-Spezial: Mitarbeiter-Auswahl prompten
function promptEmployeeSelection() {
    // Zeige Modal oder Select für Mitarbeiter-Auswahl im Lager-Modus
    // Implementiere ein Modal ähnlich wie Login, um Mitarbeiter zu wählen
    // Nach Auswahl: Verknüpfe, mit einstellbarer Reset-Zeit
    // Manuelle Abmeldung nur für den Mitarbeiter
}

// Admin-Features (erweitert)
function enableAdminFeatures() {
    // Zeige User-Settings
    const settingsLink = document.createElement('a');
    settingsLink.textContent = 'Benutzereinstellungen (Admin)';
    settingsLink.onclick = () => {
        populateUserList();
        document.getElementById('userSettingsModal').style.display = 'block';
    };
    document.querySelector('.sidebar nav ul li:nth-child(3) ul').appendChild(settingsLink); // Passe an deine Nav an
}

// Population von User-List in Settings
function populateUserList() {
    const users = JSON.parse(localStorage.getItem('schahlled_users'));
    const select = document.getElementById('userList');
    select.innerHTML = '';
    for (let user of users) {
        const option = document.createElement('option');
        option.value = user.username;
        option.textContent = user.name;
        select.appendChild(option);
    }
}

// Save User Settings
document.getElementById('userSettingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const selectedUsername = document.getElementById('userList').value;
    const newPass = document.getElementById('newPassword').value;
    const role = document.getElementById('role').value;
    const logoutTime = document.getElementById('logoutTime').value;
    let users = JSON.parse(localStorage.getItem('schahlled_users'));
    const userIndex = users.findIndex(u => u.username === selectedUsername);
    if (userIndex !== -1) {
        if (newPass) users[userIndex].password = newPass;
        users[userIndex].role = role;
        users[userIndex].logoutTime = parseInt(logoutTime);
        localStorage.setItem('schahlled_users', JSON.stringify(users));
        alert('Einstellungen gespeichert');
    }
});

// View Passwörter
document.getElementById('viewPasswords').addEventListener('click', function() {
    const users = JSON.parse(localStorage.getItem('schahlled_users'));
    let list = '';
    users.forEach(user => {
        list += `${user.name} (${user.username}): ${user.password}<br>`;
    });
    document.getElementById('passwordList').innerHTML = list;
});

// "Versendet"-Button in Verbrauchsmaterial-Liste
function addSentButton() {
    const items = document.querySelectorAll('.verbrauch-item'); // Passe an deine Class an
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.textContent = 'Versendet';
        btn.onclick = () => {
            item.dataset.status = 'versendet';
            // Update in consumptionMaterials
            const id = item.dataset.id;
            const index = consumptionMaterials.findIndex(c => c.id == id);
            if (index !== -1) {
                consumptionMaterials[index].status = 'versendet';
                saveData('consumption');
            }
            btn.disabled = true;
        };
        item.appendChild(btn);
    });
}

// Neu: Ausbuchen-Flow
function completeBookOut() {
    const barcode = document.getElementById('bookOutBarcode').value.trim();
    const storage = document.getElementById('bookOutStorage').value;
    const quantity = parseInt(document.getElementById('bookOutQuantity').value) || 1;
    const comment = document.getElementById('bookOutComment').value.trim();
    
    if (!barcode || !storage) {
        alert('Barcode und Lagerplatz erforderlich!');
        return;
    }
    
    const bookOut = {
        id: Date.now(),
        barcode: barcode,
        storage: storage,
        quantity: quantity,
        when: new Date().toISOString(),
        who: currentUser.username,
        comment: comment
    };
    
    bookOuts.push(bookOut);
    localStorage.setItem('schahlled_bookouts', JSON.stringify(bookOuts));
    
    alert('Produkt ausgebucht!');
    updateBookOutList();
}

// Update Ausbuchungs-Liste
function updateBookOutList() {
    const container = document.getElementById('bookOutList');
    let html = '<table class="data-table"><thead><tr><th>Barcode</th><th>Lagerplatz</th><th>Anzahl</th><th>Wann</th><th>Wer</th><th>Kommentar</th></tr></thead><tbody>';
    
    bookOuts.forEach(bookOut => {
        html += `
            <tr>
                <td>${bookOut.barcode}</td>
                <td>${bookOut.storage}</td>
                <td>${bookOut.quantity}</td>
                <td>${new Date(bookOut.when).toLocaleString('de-DE')}</td>
                <td>${bookOut.who}</td>
                <td>${bookOut.comment || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// In showPage('bookOutFlow'): updateBookOutList();

// ... (Rest des JS-Codes bleibt gleich)
