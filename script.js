// Check localStorage availability
try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
} catch (e) {
    alert('LocalStorage is not available. Please check browser settings (enable cookies/storage) or run on a local server (e.g., python -m http.server).');
}

// Global Variables
let currentPage = 'dashboard';
let users = JSON.parse(localStorage.getItem('schahlled_users')) || [];
let customers = JSON.parse(localStorage.getItem('schahlled_customers')) || [];
let products = JSON.parse(localStorage.getItem('schahlled_products')) || [];
let lendings = JSON.parse(localStorage.getItem('schahlled_lendings')) || [];
let consumptionMaterials = JSON.parse(localStorage.getItem('schahlled_consumption')) || [];
let settings = JSON.parse(localStorage.getItem('schahlled_settings')) || {
    autoReturnTime: 0,
    requireTesterNumber: true,
    autoPrint: false,
    printerType: 'normal'
};
let currentLoggedInUser = null;
let autoReturnTimer = null;

// Lending Flow Variables
let selectedUser = null;
let selectedCustomer = null;
let selectedProducts = [];
let currentStep = 1;

// Consumption Flow Variables
let selectedConsumptionCustomer = null;
let selectedEmployee = null;
let currentConsumptionStep = 1;
let consumptionProducts = [];

// Initialize Application
document.addEventListener('DOMContentLoaded', async function() {
    await loadInitialData(); // Lade JSON-Dateien, falls localStorage leer
    initializeApp();
    updateAlerts();
    updateAllLists();
    loadStorageLocations();
    loadHeaderUserSelect();
    setupAutoReturn();
    setupActivityListeners();
});

async function loadInitialData() {
    // Lade Daten aus JSON, wenn localStorage leer ist
    if (users.length === 0) {
        users = await fetch('data/users.json').then(res => res.json()).catch(() => []);
        saveData('users');
    }
    if (customers.length === 0) {
        customers = await fetch('data/customers.json').then(res => res.json()).catch(() => []);
        saveData('customers');
    }
    if (products.length === 0) {
        products = await fetch('data/products.json').then(res => res.json()).catch(() => []);
        saveData('products');
    }
    if (!localStorage.getItem('schahlled_storage_locations')) {
        const storageLocations = await fetch('data/storage_locations.json').then(res => res.json()).catch(() => []);
        localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
    }
}

function initializeApp() {
    // Load current user from localStorage
    const storedUserId = localStorage.getItem('schahlled_current_user_id');
    if (storedUserId) {
        currentLoggedInUser = users.find(u => u.id == storedUserId) || { name: 'System' };
    } else {
        currentLoggedInUser = { name: 'System' };
    }
    // Initialize return date (7 days from now)
    const returnDate = new Date();
    returnDate.setDate(returnDate.getDate() + 7);
    const returnDateField = document.getElementById('returnDate');
    if (returnDateField) {
        returnDateField.value = returnDate.toISOString().slice(0, 16);
    }
    
    // Setup barcode inputs
    setupBarcodeInputs();
    
    console.log('SchahlLED System initialized, logged in as:', currentLoggedInUser.name);
}

// Der Rest des JS-Codes bleibt gleich wie im Original, da er funktional ist. Ich habe nur den Initialisierungs-Teil angepasst, um fetch zu nutzen.
// ... (kopiere den gesamten <script>-Inhalt aus dem Original hierher, ab "function loadHeaderUserSelect()" bis zum Ende)
function loadHeaderUserSelect() {
    const select = document.getElementById('headerUserSelect');
    select.innerHTML = '<option value="">-- Benutzer wählen --</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        if (currentLoggedInUser && user.id == currentLoggedInUser.id) {
            option.selected = true;
        }
        select.appendChild(option);
    });
}

function changeLoggedInUser(userId) {
    if (userId) {
        currentLoggedInUser = users.find(u => u.id == userId);
        localStorage.setItem('schahlled_current_user_id', userId);
        resetAutoReturnTimer();
        alert(`Benutzer gewechselt zu ${currentLoggedInUser.name}`);
    } else {
        currentLoggedInUser = null;
        localStorage.removeItem('schahlled_current_user_id');
        showPage('dashboard');
    }
}

function setupAutoReturn() {
    if (settings.autoReturnTime > 0) {
        resetAutoReturnTimer();
    }
}

function resetAutoReturnTimer() {
    if (autoReturnTimer) {
        clearTimeout(autoReturnTimer);
    }
    if (settings.autoReturnTime > 0) {
        autoReturnTimer = setTimeout(() => {
            currentLoggedInUser = null;
            localStorage.removeItem('schahlled_current_user_id');
            document.getElementById('headerUserSelect').value = '';
            showPage('dashboard');
            alert('Automatische Abmeldung aufgrund Inaktivität.');
        }, settings.autoReturnTime * 1000);
    }
}

function setupActivityListeners() {
    ['mousemove', 'keydown', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, resetAutoReturnTimer);
    });
}

function loadStorageLocations() {
    const storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    
    // Update all storage location dropdowns
    const dropdowns = [
        'storageLocation', 
        'newUserDefaultStorage', 
        'editUserDefaultStorage', 
        'newCustomerDefaultStorage', 
        'editCustomerDefaultStorage', 
        'newProductStorageLocation'
    ];
    
    dropdowns.forEach(dropdownId => {
        const dropdown = document.getElementById(dropdownId);
        if (dropdown) {
            // Keep the first option (placeholder)
            const firstOption = dropdown.firstElementChild;
            dropdown.innerHTML = '';
            if (firstOption) dropdown.appendChild(firstOption);
            
            // Add storage locations
            storageLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                dropdown.appendChild(option);
            });
        }
    });
}

function addCustomStorageLocation() {
    const newLocation = document.getElementById('customStorageLocation').value.trim();
    if (!newLocation) {
        alert('Bitte Lagerplatz eingeben!');
        return;
    }
    
    let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    
    if (storageLocations.includes(newLocation)) {
        alert('Lagerplatz bereits vorhanden!');
        return;
    }
    
    storageLocations.push(newLocation);
    localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
    
    // Reload dropdowns
    loadStorageLocations();
    
    // Select the new location
    document.getElementById('storageLocation').value = newLocation;
    document.getElementById('customStorageLocation').value = '';
    
    alert('Lagerplatz erfolgreich hinzugefügt!');
}

function showPage(pageId) {
    console.log('Navigating to page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageId;
        
        // Update page content
        switch(pageId) {
            case 'dashboard':
                updateAlerts();
                break;
            case 'lendingFlow':
                loadStorageLocations(); // Load storage locations for step 3
                initializeLendingFlow();
                break;
            case 'returnFlow':
                updateReturnList();
                const returnBarcodeField = document.getElementById('returnBarcode');
                if (returnBarcodeField) returnBarcodeField.focus();
                break;
            case 'inventoryList':
                updateInventoryList();
                break;
            case 'consumptionMaterials':
                loadStorageLocations(); // Load storage locations for consumption form
                initializeConsumptionFlow();
                break;
            case 'userManagement':
                updateUserManagementTable();
                break;
            case 'customerManagement':
                updateCustomerManagementTable();
                break;
            case 'productManagement':
                updateProductManagementTable();
                break;
            case 'storageManagement':
                updateStorageManagementTable();
                break;
        }
        
        // Close navigation menu
        toggleMenu(false);
    } else {
        console.error('Page not found:', pageId);
    }
}

function toggleMenu(forceClose = null) {
    const menu = document.querySelector('.nav-menu');
    const overlay = document.querySelector('.nav-overlay');
    
    if (forceClose === false || (forceClose === null && menu.classList.contains('open'))) {
        menu.classList.remove('open');
        overlay.classList.remove('open');
    } else {
        menu.classList.add('open');
        overlay.classList.add('open');
    }
}

function setupBarcodeInputs() {
    // Product barcode input with real-time search
    const productBarcodeField = document.getElementById('productBarcode');
    if (productBarcodeField) {
        productBarcodeField.addEventListener('input', function(e) {
            const input = e.target.value.trim();
            let barcodes = input.split(',').map(b => b.trim().toLowerCase()).filter(b => b);
            
            if (barcodes.length > 0) {
                let partialMatches = [];
                barcodes.forEach(barcode => {
                    const matches = products.filter(p => 
                        (p.barcode.toLowerCase().includes(barcode) || 
                         p.name.toLowerCase().includes(barcode)) && 
                        p.status === 'available'
                    );
                    partialMatches = [...new Set([...partialMatches, ...matches])];
                });
                
                if (partialMatches.length > 0) {
                    // Show partial matches
                    const productInfoDiv = document.getElementById('productInfo');
                    if (productInfoDiv) {
                        productInfoDiv.innerHTML = `
                            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffc107;">
                                <h4 style="color: #856404;">🔍 Suchergebnisse für "${input}"</h4>
                                <p>Gefunden: ${partialMatches.length} Treffer. Wählen Sie Produkte unten aus oder scannen Sie weiter.</p>
                            </div>
                        `;
                    }
                    
                    // Show suggestions
                    updateProductSuggestions(partialMatches);
                    const productSuggestions = document.getElementById('productSuggestions');
                    if (productSuggestions) productSuggestions.style.display = 'block';
                } else {
                    // No matches found
                    const productInfoDiv = document.getElementById('productInfo');
                    if (productInfoDiv) {
                        productInfoDiv.innerHTML = `
                            <div style="background: #ffebee; padding: 15px; border-radius: 8px; border: 1px solid #f44336;">
                                <h4 style="color: #c62828;">❌ Kein Produkt gefunden</h4>
                                <p>Barcode/Suche: "${input}"</p>
                                <p>Produkt ist nicht verfügbar oder existiert nicht.</p>
                                <button class="btn btn-primary" onclick="addNewProduct('${barcodes[0]}')">Neues Produkt anlegen</button>
                            </div>
                        `;
                    }
                    
                    // Show all available products
                    updateProductSuggestions(products.filter(p => p.status === 'available'));
                    const productSuggestions = document.getElementById('productSuggestions');
                    if (productSuggestions) productSuggestions.style.display = 'block';
                }
            } else {
                // Empty input - show all available products
                const productInfoDiv = document.getElementById('productInfo');
                if (productInfoDiv) productInfoDiv.innerHTML = '';
                updateProductSuggestions(products.filter(p => p.status === 'available'));
                const productSuggestions = document.getElementById('productSuggestions');
                if (productSuggestions) productSuggestions.style.display = 'block';
                selectedProducts = [];
                const continueBtn = document.getElementById('continueToStep3');
                if (continueBtn) continueBtn.disabled = true;
            }
        });
    }
    
    // Return barcode input
    const returnBarcodeField = document.getElementById('returnBarcode');
    if (returnBarcodeField) {
        returnBarcodeField.addEventListener('input', function(e) {
            const barcode = e.target.value.trim();
            if (barcode.length > 0) {
                const lending = lendings.find(l => 
                    (l.barcode.toLowerCase().includes(barcode.toLowerCase()) || 
                     l.productName.toLowerCase().includes(barcode.toLowerCase())) && 
                    l.status === 'lent'
                );
                if (lending) {
                    returnProduct(lending.id);
                    e.target.value = '';
                }
            }
        });
    }
}

function updateAlerts() {
    const container = document.getElementById('alertsContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Check for overdue items
    const overdueLendings = lendings.filter(l => 
        l.status === 'lent' && new Date(l.returnDate) < new Date()
    );
    
    if (overdueLendings.length > 0) {
        const alert = document.createElement('div');
        alert.className = 'alert error';
        alert.innerHTML = `
            <span>⚠️</span>
            <div>
                <strong>Überfällige Rückgaben:</strong> ${overdueLendings.length} Artikel sind überfällig!
                <button class="btn btn-primary" onclick="showPage('returnFlow')" style="margin-left: 10px;">Anzeigen</button>
            </div>
        `;
        container.appendChild(alert);
    }
    
    // Check for missing tester numbers
    const missingTesterNumbers = consumptionMaterials.filter(c => !c.testerNumber);
    
    if (missingTesterNumbers.length > 0) {
        const alert = document.createElement('div');
        alert.className = 'alert warning';
        alert.innerHTML = `
            <span>⚠️</span>
            <div>
                <strong>Fehlende Testernummern:</strong> ${missingTesterNumbers.length} Einträge ohne Testernummer!
                <button class="btn btn-primary" onclick="showPage('consumptionMaterials')" style="margin-left: 10px;">Prüfen</button>
            </div>
        `;
        container.appendChild(alert);
    }
    
    // Hide alerts section if no alerts
    const alertsSection = document.getElementById('alertsSection');
    if (alertsSection) {
        alertsSection.style.display = container.children.length > 0 ? 'block' : 'none';
    }
}

function initializeLendingFlow() {
    // Reset flow
    selectedUser = null;
    selectedCustomer = null;
    selectedProducts = [];
    currentStep = 1;
    
    // Show step 1
    showLendingStep(1);
    
    // Load users and customers
    updateUserSelectionGrid();
}

function showLendingStep(step) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`lendingStep${i}`);
        if (stepElement) {
            stepElement.classList.toggle('active', i === step);
        }
    }
    currentStep = step;
}

function updateUserSelectionGrid() {
    const grid = document.getElementById('userSelectionGrid');
    if (grid) grid.innerHTML = '';
    
    // Add users
    users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.onclick = (e) => selectUserOrCustomer(user, 'user', e);
        card.innerHTML = `
            <div><strong>👤 ${user.name}</strong></div>
            <div style="font-size: 14px; color: #666;">${user.department || 'Benutzer'}</div>
            <div style="font-size: 12px; color: #999;">${user.email}</div>
        `;
        grid.appendChild(card);
    });
    
    // Add customers
    customers.forEach(customer => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.onclick = (e) => selectUserOrCustomer(customer, 'customer', e);
        card.innerHTML = `
            <div><strong>🏢 ${customer.name}</strong></div>
            <div style="font-size: 14px; color: #666;">${customer.customerNumber}</div>
            <div style="font-size: 12px; color: #999;">${customer.contact}</div>
        `;
        grid.appendChild(card);
    });
}

function selectUserOrCustomer(entity, type, e) {
    // Clear previous selections
    document.querySelectorAll('.selection-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select new entity
    e.target.closest('.selection-card').classList.add('selected');
    
    if (type === 'user') {
        selectedUser = entity;
        selectedCustomer = null;
        currentLoggedInUser = entity; // Setze aktuellen Benutzer
    } else {
        selectedCustomer = entity;
        selectedUser = null;
    }
    
    // Enable continue button
    document.getElementById('continueToStep2').disabled = false;
    continueToStep2(); // Direkte Weiterleitung
}

function continueToStep2() {
    if (!selectedUser && !selectedCustomer) {
        alert('Bitte wählen Sie einen Benutzer oder Kunden aus!');
        return;
    }
    
    showLendingStep(2);
    
    // Show all available products immediately
    updateProductSuggestions(products.filter(p => p.status === 'available'));
    document.getElementById('productSuggestions').style.display = 'block';
    
    document.getElementById('productBarcode').focus();
}

function backToStep1() {
    showLendingStep(1);
}

function continueToStep3() {
    if (selectedProducts.length === 0) {
        alert('Bitte wählen Sie mindestens ein Produkt aus!');
        return;
    }
    
    showLendingStep(3);
    updateSelectedProductsList();
    
    // Pre-select default storage location based on user/customer
    const selectedEntity = selectedUser || selectedCustomer;
    if (selectedEntity && selectedEntity.defaultStorage) {
        document.getElementById('storageLocation').value = selectedEntity.defaultStorage;
    } else if (selectedProducts[0].storageLocation) {
        document.getElementById('storageLocation').value = selectedProducts[0].storageLocation;
    }
    
    // Load customers for additional customer selection
    loadCustomersForLending();
}

function loadCustomersForLending() {
    const customerSelect = document.getElementById('additionalCustomer');
    customerSelect.innerHTML = '<option value="">-- Kunde auswählen (optional) --</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = `${customer.name} (${customer.customerNumber || 'Keine Nr.'})`;
        customerSelect.appendChild(option);
    });
}

function backToStep2() {
    showLendingStep(2);
    
    // Show all available products again
    updateProductSuggestions(products.filter(p => p.status === 'available'));
    document.getElementById('productSuggestions').style.display = 'block';
    
    document.getElementById('productBarcode').focus();
}

function updateSelectedProductsList() {
    const container = document.getElementById('selectedProductsList');
    container.innerHTML = '<h4>Ausgewählte Produkte:</h4>';
    
    if (selectedProducts.length === 0) {
        container.innerHTML += '<p>Keine Produkte ausgewählt</p>';
        return;
    }
    
    let html = '<div class="list-container">';
    selectedProducts.forEach(product => {
        html += `
            <div style="padding: 15px; border: 2px solid var(--primary-blue); border-radius: 8px; background: rgba(127, 179, 211, 0.1); margin-bottom: 10px;">
                <h4>${product.name}</h4>
                <p><strong>Barcode:</strong> ${product.barcode}</p>
                <p><strong>Beschreibung:</strong> ${product.description}</p>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML += html;
}

function completeLending() {
    const storageLocation = document.getElementById('storageLocation').value;
    const returnDateTime = document.getElementById('returnDate').value;
    const comment = document.getElementById('lendingComment').value;
    const additionalCustomerId = document.getElementById('additionalCustomer').value;
    
    if (!storageLocation) {
        alert('Bitte Lagerplatz auswählen!');
        return;
    }
    
    if (!returnDateTime) {
        alert('Bitte Rückgabedatum auswählen!');
        return;
    }
    
    // Get additional customer if selected
    let additionalCustomer = null;
    if (additionalCustomerId) {
        additionalCustomer = customers.find(c => c.id == additionalCustomerId);
    }
    
    let lendingsCreated = [];
    selectedProducts.forEach(product => {
        const lending = {
            id: Date.now() + Math.random(),
            productId: product.id,
            productName: product.name,
            barcode: product.barcode,
            userId: selectedUser ? selectedUser.id : null,
            customerId: selectedCustomer ? selectedCustomer.id : null,
            userInfo: selectedUser || selectedCustomer,
            additionalCustomer: additionalCustomer,
            responsibleUser: currentLoggedInUser.name,
            lendDate: new Date().toISOString(),
            returnDate: returnDateTime,
            storageLocation: storageLocation,
            comment: comment,
            status: 'lent'
        };
        
        lendings.push(lending);
        lendingsCreated.push(lending);
        
        // Update product status
        const productIndex = products.findIndex(p => p.id === product.id);
        if (productIndex !== -1) {
            products[productIndex].status = 'lent';
        }
    });
    
    // Save data
    saveData('lendings');
    saveData('products');
    
    const customerInfo = additionalCustomer ? ` (Kunde: ${additionalCustomer.name})` : '';
    alert(`${selectedProducts.length} Artikel erfolgreich an ${ (selectedUser || selectedCustomer).name } ausgeliehen!${customerInfo}`);
    
    // Automatic print if enabled
    if (settings.autoPrint) {
        printLendingReceipt(lendingsCreated);
    } else {
        if (confirm('Ausleihe-Quittung drucken?')) {
            printLendingReceipt(lendingsCreated);
        }
    }
    
    // Return to dashboard
    showPage('dashboard');
}

function printLendingReceipt(lendingsCreated) {
    let html = '';
    const isReceipt = settings.printerType === 'receipt';
    
    if (isReceipt) {
        html = `
            <html>
            <head>
                <title>SchahlLED - Ausleihe-Quittung</title>
                <style>
                    body { font-family: monospace; font-size: 12px; line-height: 1.2; width: 80mm; margin: 0; padding: 0; }
                    h2 { text-align: center; font-size: 14px; }
                    p { margin: 2px 0; }
                    table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    th, td { padding: 2px; text-align: left; border: none; }
                    .divider { border-top: 1px dashed #000; margin: 5px 0; }
                </style>
            </head>
            <body class="receipt-print">
                <h2>SchahlLED - Ausleihe-Quittung</h2>
                <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
                <p>Benutzer/Kunde: ${(selectedUser || selectedCustomer).name}</p>
                <p>Rückgabedatum: ${new Date(lendingsCreated[0].returnDate).toLocaleDateString('de-DE')}</p>
                <p>Lagerplatz: ${lendingsCreated[0].storageLocation}</p>
                <p>Kommentar: ${lendingsCreated[0].comment || '-'}</p>
                <div class="divider"></div>
                <table>
                    <thead>
                        <tr>
                            <th>Produkt</th>
                            <th>Barcode</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        lendingsCreated.forEach(lending => {
            html += `
                <tr>
                    <td>${lending.productName}</td>
                    <td>${lending.barcode}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
                <div class="divider"></div>
                <p> Vielen Dank!</p>
            </body>
            </html>
        `;
    } else {
        html = `
            <html>
            <head>
                <title>SchahlLED - Ausleihe-Quittung</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                <h2>SchahlLED - Ausleihe-Quittung</h2>
                <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
                <p>Benutzer/Kunde: ${(selectedUser || selectedCustomer).name}</p>
                <p>Rückgabedatum: ${new Date(lendingsCreated[0].returnDate).toLocaleDateString('de-DE')}</p>
                <p>Lagerplatz: ${lendingsCreated[0].storageLocation}</p>
                <p>Kommentar: ${lendingsCreated[0].comment || '-'}</p>
                <h3>Ausgeliehene Produkte:</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Produktname</th>
                            <th>Barcode</th>
                            <th>Beschreibung</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        lendingsCreated.forEach(lending => {
            html += `
                <tr>
                    <td>${lending.productName}</td>
                    <td>${lending.barcode}</td>
                    <td>${lending.comment || '-'}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </body>
            </html>
        `;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
}

function updateReturnList() {
    const container = document.getElementById('returnList');
    const activeLendings = lendings.filter(l => l.status === 'lent');
    
    if (activeLendings.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Keine aktiven Ausleihen</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Produkt</th><th>Ausgeliehen an</th><th>Datum</th><th>Rückgabe bis</th><th>Lagerplatz</th><th>Status</th><th>Aktion</th></tr></thead><tbody>';
    
    activeLendings.forEach(lending => {
        const returnDate = new Date(lending.returnDate);
        const isOverdue = returnDate < new Date();
        const statusClass = isOverdue ? 'style="color: var(--danger-red); font-weight: bold;"' : '';
        
        html += `
            <tr>
                <td>${lending.productName}<br><small>${lending.barcode}</small></td>
                <td>${lending.userInfo.name}</td>
                <td>${new Date(lending.lendDate).toLocaleDateString('de-DE')}</td>
                <td ${statusClass}>${returnDate.toLocaleDateString('de-DE')} ${isOverdue ? '⚠️' : ''}</td>
                <td>${lending.storageLocation}</td>
                <td><span class="status-indicator status-lent">AUSGELIEHEN</span></td>
                <td><button class="btn btn-success" onclick="returnProduct('${lending.id}')">Zurückgeben</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function returnProduct(lendingId) {
    const lendingIndex = lendings.findIndex(l => l.id == lendingId);
    if (lendingIndex === -1) {
        alert('Ausleihe nicht gefunden!');
        return;
    }
    
    const lending = lendings[lendingIndex];
    
    // Update lending status
    lending.status = 'returned';
    lending.actualReturnDate = new Date().toISOString();
    
    // Update product status
    const productIndex = products.findIndex(p => p.id === lending.productId);
    if (productIndex !== -1) {
        products[productIndex].status = 'available';
    }
    
    // Save data
    saveData('lendings');
    saveData('products');
    
    alert(`${lending.productName} erfolgreich zurückgegeben!`);
    
    // Update lists
    updateReturnList();
    updateAlerts();
    
    // Clear barcode input
    document.getElementById('returnBarcode').value = '';
}

function updateInventoryList() {
    const container = document.getElementById('inventoryTable');
    
    let html = '<table class="data-table"><thead><tr><th>Produkt</th><th>Benutzer/Kunde</th><th>Zusätzlicher Kunde</th><th>Verantwortlicher</th><th>Ausgeliehen</th><th>Rückgabe</th><th>Status</th><th>Lagerplatz</th><th>Kommentar</th></tr></thead><tbody>';
    
    lendings.forEach(lending => {
        const statusClass = lending.status === 'lent' ? 'status-lent' : 'status-available';
        const returnDate = new Date(lending.returnDate);
        const isOverdue = lending.status === 'lent' && returnDate < new Date();
        const additionalCustomerInfo = lending.additionalCustomer ? lending.additionalCustomer.name : '-';
        
        html += `
            <tr>
                <td>${lending.productName}<br><small>${lending.barcode}</small></td>
                <td>${lending.userInfo.name}<br><small>${lending.userInfo.email || lending.userInfo.customerNumber || ''}</small></td>
                <td>${additionalCustomerInfo}</td>
                <td>${lending.responsibleUser || '-'}</td>
                <td>${new Date(lending.lendDate).toLocaleDateString('de-DE')}</td>
                <td style="${isOverdue ? 'color: var(--danger-red); font-weight: bold;' : ''}">${returnDate.toLocaleDateString('de-DE')} ${isOverdue ? '⚠️' : ''}</td>
                <td><span class="status-indicator ${statusClass}">${lending.status === 'lent' ? 'AUSGELIEHEN' : 'ZURÜCKGEGEBEN'}</span></td>
                <td>${lending.storageLocation}</td>
                <td>${lending.comment || '-'}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function initializeConsumptionFlow() {
    // Reset flow
    selectedConsumptionCustomer = null;
    selectedEmployee = null;
    currentConsumptionStep = 1;
    consumptionProducts = [];
    
    // Show step 1
    showConsumptionStep(1);
    
    // Load customers and employees
    updateCustomerSelectionGrid();
    loadEmployeesForConsumption();
    loadConsumptionFilters();
    updateConsumptionList();
}

function showConsumptionStep(step) {
    // Hide all steps
    for (let i = 1; i <= 3; i++) {
        const stepElement = document.getElementById(`consumptionStep${i}`);
        if (stepElement) {
            stepElement.classList.toggle('active', i === step);
        }
    }
    
    // Show/hide list container
    const listContainer = document.getElementById('consumptionListContainer');
    listContainer.style.display = step === 1 ? 'block' : 'none';
    
    currentConsumptionStep = step;
}

function loadEmployeesForConsumption() {
    const select = document.getElementById('employeeSelect');
    if (select) {
        select.innerHTML = '<option value="">-- Mitarbeiter wählen --</option>';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.name;
            select.appendChild(option);
        });
    }
}

function updateCustomerSelectionGrid() {
    const grid = document.getElementById('customerSelectionGrid');
    grid.innerHTML = '';
    
    customers.forEach(customer => {
        const card = document.createElement('div');
        card.className = 'selection-card';
        card.onclick = (e) => selectConsumptionCustomer(customer, e);
        card.innerHTML = `
            <div><strong>🏢 ${customer.name}</strong></div>
            <div style="font-size: 14px; color: #666;">${customer.customerNumber || 'Keine Kundennummer'}</div>
            <div style="font-size: 12px; color: #999;">${customer.contact || ''}</div>
        `;
        grid.appendChild(card);
    });
}

function selectConsumptionCustomer(customer, e) {
    // Clear previous selections
    document.querySelectorAll('#customerSelectionGrid .selection-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Select new customer
    e.target.closest('.selection-card').classList.add('selected');
    
    selectedConsumptionCustomer = customer;
    
    // Enable continue button if both selected
    checkConsumptionStep1Continue();
}

function checkConsumptionStep1Continue() {
    const employeeSelect = document.getElementById('employeeSelect');
    const continueBtn = document.getElementById('continueToConsumptionStep2');
    if (selectedConsumptionCustomer && employeeSelect.value) {
        continueBtn.disabled = false;
    } else {
        continueBtn.disabled = true;
    }
}

// Add change listener for employee select
document.addEventListener('DOMContentLoaded', function() {
    const employeeSelect = document.getElementById('employeeSelect');
    if (employeeSelect) {
        employeeSelect.addEventListener('change', checkConsumptionStep1Continue);
    }
});

function continueToConsumptionStep2() {
    if (!selectedConsumptionCustomer) {
        alert('Bitte wählen Sie einen Kunden aus!');
        return;
    }
    
    const employeeId = document.getElementById('employeeSelect').value;
    if (!employeeId) {
        alert('Bitte wählen Sie einen Mitarbeiter aus!');
        return;
    }
    
    selectedEmployee = users.find(u => u.id == employeeId);
    
    showConsumptionStep(2);
    updateProductInputs();
}

function backToConsumptionStep1() {
    showConsumptionStep(1);
}

function updateProductInputs() {
    const count = parseInt(document.getElementById('productCount').value) || 1;
    const container = document.getElementById('productInputsContainer');
    container.innerHTML = '';
    
    consumptionProducts = [];
    
    for (let i = 0; i < count; i++) {
        const productDiv = document.createElement('div');
        productDiv.className = 'form-container';
        productDiv.style.marginBottom = '20px';
        productDiv.style.border = '2px solid var(--border-gray)';
        productDiv.style.borderRadius = '10px';
        productDiv.innerHTML = `
            <h4 style="margin-bottom: 15px; color: var(--dark-blue);">Artikel ${i + 1}</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Artikelnummer:</label>
                    <input type="text" id="articleNumber_${i}" class="form-control" placeholder="Artikel-Nr.">
                </div>
                <div class="form-group">
                    <label>Defekte Leuchte:</label>
                    <input type="text" id="defectivePart_${i}" class="form-control" placeholder="Defekte Komponente">
                </div>
                <div class="form-group">
                    <label>Menge:</label>
                    <input type="number" id="quantity_${i}" class="form-control" min="1" value="1">
                </div>
                <div class="form-group">
                    <label>Projekt/Kommi:</label>
                    <input type="text" id="project_${i}" class="form-control" placeholder="Projekt-Info">
                </div>
                <div class="form-group">
                    <label>Lagerplatz:</label>
                    <select id="storage_${i}" class="form-control">
                        <option value="">-- Lagerplatz wählen --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>MO-Nummer:</label>
                    <input type="text" id="moNumber_${i}" class="form-control" placeholder="MO-Nummer">
                </div>
            </div>
            <div class="form-group">
                <label>Fehlerbeschreibung:</label>
                <textarea id="description_${i}" class="form-control" rows="2" placeholder="Detaillierte Beschreibung des Fehlers..."></textarea>
            </div>
        `;
        container.appendChild(productDiv);
        
        // Initialize product object
        consumptionProducts.push({
            articleNumber: '',
            defectivePart: '',
            quantity: 1,
            project: '',
            storage: '',
            moNumber: '',
            description: '',
            testerNumber: ''
        });
    }
    
    // Load storage locations for all dropdowns
    const storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    for (let i = 0; i < count; i++) {
        const dropdown = document.getElementById(`storage_${i}`);
        if (dropdown) {
            dropdown.innerHTML = '<option value="">-- Lagerplatz wählen --</option>';
            storageLocations.forEach(location => {
                const option = document.createElement('option');
                option.value = location;
                option.textContent = location;
                dropdown.appendChild(option);
            });
        }
    }
}

function continueToConsumptionStep3() {
    // Collect product data
    const count = consumptionProducts.length;
    let hasErrors = false;
    
    for (let i = 0; i < count; i++) {
        consumptionProducts[i].articleNumber = document.getElementById(`articleNumber_${i}`).value.trim();
        consumptionProducts[i].defectivePart = document.getElementById(`defectivePart_${i}`).value.trim();
        consumptionProducts[i].quantity = parseInt(document.getElementById(`quantity_${i}`).value) || 1;
        consumptionProducts[i].project = document.getElementById(`project_${i}`).value.trim();
        consumptionProducts[i].storage = document.getElementById(`storage_${i}`).value;
        consumptionProducts[i].moNumber = document.getElementById(`moNumber_${i}`).value.trim();
        consumptionProducts[i].description = document.getElementById(`description_${i}`).value.trim();
        
        if (!consumptionProducts[i].defectivePart) {
            alert(`Bitte geben Sie für Artikel ${i + 1} die defekte Komponente an!`);
            hasErrors = true;
            break;
        }
    }
    
    if (hasErrors) return;
    
    showConsumptionStep(3);
    updateTesterNumberInputs();
}

function backToConsumptionStep2() {
    showConsumptionStep(2);
}

function updateTesterNumberInputs() {
    const container = document.getElementById('testerNumbersContainer');
    container.innerHTML = '';
    
    consumptionProducts.forEach((product, i) => {
        const testerDiv = document.createElement('div');
        testerDiv.className = 'form-group';
        testerDiv.style.padding = '15px';
        testerDiv.style.border = '1px solid var(--border-gray)';
        testerDiv.style.borderRadius = '8px';
        testerDiv.style.marginBottom = '15px';
        testerDiv.innerHTML = `
            <h5 style="color: var(--dark-blue); margin-bottom: 10px;">Artikel ${i + 1}: ${product.defectivePart || 'Artikel'}</h5>
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="flex: 1;">
                    <label style="color: var(--danger-red); font-weight: bold;">Testernummer *:</label>
                    <input type="text" id="testerNumber_${i}" class="form-control required-field" placeholder="Testernummer eingeben" required>
                </div>
                <div>
                    <button type="button" class="btn btn-warning" onclick="copyFromPrevious(${i})" ${i === 0 ? 'disabled' : ''}>
                        📋 Von oben kopieren
                    </button>
                </div>
            </div>
            <div class="field-error" id="testerError_${i}" style="display: none;">Testernummer ist erforderlich!</div>
        `;
        container.appendChild(testerDiv);
    });
}

function copyFromPrevious(index) {
    if (index > 0) {
        const previousTester = document.getElementById(`testerNumber_${index - 1}`).value;
        if (previousTester) {
            document.getElementById(`testerNumber_${index}`).value = previousTester;
        } else {
            alert('Bitte tragen Sie zuerst die Testernummer des vorherigen Artikels ein!');
        }
    }
}

function copyTesterNumbers() {
    const firstTester = document.getElementById('testerNumber_0').value.trim();
    if (!firstTester) {
        alert('Bitte tragen Sie zuerst die Testernummer für Artikel 1 ein!');
        return;
    }
    
    if (confirm(`Testernummer "${firstTester}" auf alle Artikel übertragen?`)) {
        for (let i = 1; i < consumptionProducts.length; i++) {
            document.getElementById(`testerNumber_${i}`).value = firstTester;
        }
    }
}

function bulkAssignTester() {
    const testerNumber = prompt('Testernummer für alle Artikel eingeben:');
    if (testerNumber && testerNumber.trim()) {
        for (let i = 0; i < consumptionProducts.length; i++) {
            document.getElementById(`testerNumber_${i}`).value = testerNumber.trim();
        }
    }
}

function saveConsumptionMaterials() {
    const currentDate = new Date().toISOString().split('T')[0];
    let hasErrors = false;
    
    // Validate tester numbers
    for (let i = 0; i < consumptionProducts.length; i++) {
        const testerNumber = document.getElementById(`testerNumber_${i}`).value.trim();
        if (!testerNumber && settings.requireTesterNumber) {
            document.getElementById(`testerError_${i}`).style.display = 'block';
            document.getElementById(`testerNumber_${i}`).classList.add('required-field');
            hasErrors = true;
        } else {
            document.getElementById(`testerError_${i}`).style.display = 'none';
            document.getElementById(`testerNumber_${i}`).classList.remove('required-field');
            consumptionProducts[i].testerNumber = testerNumber;
        }
    }
    
    if (hasErrors) {
        alert('Bitte tragen Sie alle Testernummern ein!');
        return;
    }
    
    // Save all products
    consumptionProducts.forEach(product => {
        const consumption = {
            id: Date.now() + Math.random(),
            date: currentDate,
            articleNumber: product.articleNumber,
            defectivePart: product.defectivePart,
            quantity: product.quantity,
            customerNumber: selectedConsumptionCustomer.customerNumber || '',
            customerName: selectedConsumptionCustomer.name,
            projectInfo: product.project,
            storageLocation: product.storage,
            description: product.description,
            moNumber: product.moNumber,
            testerNumber: product.testerNumber,
            employee: selectedEmployee.name, // Ausgewählter Mitarbeiter
            createdAt: new Date().toISOString()
        };
        
        consumptionMaterials.push(consumption);
    });
    
    saveData('consumption');
    
    alert(`${consumptionProducts.length} Artikel erfolgreich gespeichert!`);
    
    // Reset and go back to start
    initializeConsumptionFlow();
    updateAlerts();
}

function loadConsumptionFilters() {
    // Load month filter
    const monthFilter = document.getElementById('monthFilter');
    monthFilter.innerHTML = '<option value="">Alle Monate</option>';
    
    const months = [
        'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
    ];
    
    const currentYear = new Date().getFullYear();
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        for (let month = 0; month < 12; month++) {
            const monthValue = `${year}-${String(month + 1).padStart(2, '0')}`;
            const monthLabel = `${months[month]} ${year}`;
            const option = document.createElement('option');
            option.value = monthValue;
            option.textContent = monthLabel;
            monthFilter.appendChild(option);
        }
    }
    
    // Load employee filter
    const employeeFilter = document.getElementById('employeeFilter');
    employeeFilter.innerHTML = '<option value="">Alle Mitarbeiter</option>';
    
    const employees = [...new Set(consumptionMaterials.map(c => c.employee).filter(e => e))];
    employees.forEach(employee => {
        const option = document.createElement('option');
        option.value = employee;
        option.textContent = employee;
        employeeFilter.appendChild(option);
    });
    
    // Load customer filter
    const customerFilter = document.getElementById('customerFilter');
    customerFilter.innerHTML = '<option value="">Alle Kunden</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.customerNumber || customer.name;
        option.textContent = `${customer.name} (${customer.customerNumber || 'Keine Nr.'})`;
        customerFilter.appendChild(option);
    });
    
    // Add event listeners for filters
    ['monthFilter', 'employeeFilter', 'customerFilter', 'consumptionSearch'].forEach(filterId => {
        const element = document.getElementById(filterId);
        if (element) {
            element.addEventListener('change', filterConsumptionList);
            element.addEventListener('input', filterConsumptionList);
        }
    });
}

function filterConsumptionList() {
    const monthFilter = document.getElementById('monthFilter').value;
    const employeeFilter = document.getElementById('employeeFilter').value;
    const customerFilter = document.getElementById('customerFilter').value;
    const searchFilter = document.getElementById('consumptionSearch').value.toLowerCase();
    
    let filteredItems = consumptionMaterials;
    
    // Month filter
    if (monthFilter) {
        filteredItems = filteredItems.filter(item => {
            const itemMonth = item.date.substring(0, 7); // YYYY-MM
            return itemMonth === monthFilter;
        });
    }
    
    // Employee filter
    if (employeeFilter) {
        filteredItems = filteredItems.filter(item => item.employee === employeeFilter);
    }
    
    // Customer filter
    if (customerFilter) {
        filteredItems = filteredItems.filter(item => 
            item.customerNumber === customerFilter || item.customerName === customerFilter
        );
    }
    
    // Search filter
    if (searchFilter) {
        const searchTerms = searchFilter.split(',').map(s => s.trim()).filter(s => s);
        filteredItems = filteredItems.filter(item => 
            searchTerms.some(term => 
                Object.values(item).some(value => 
                    value && value.toString().toLowerCase().includes(term)
                )
            )
        );
    }
    
    updateConsumptionListWithData(filteredItems);
}

function updateConsumptionList() {
    updateConsumptionListWithData(consumptionMaterials);
}

function updateConsumptionListWithData(items) {
    const container = document.getElementById('consumptionTable');
    
    if (items.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">Keine Einträge vorhanden</p>';
        return;
    }
    
    let html = '<table class="data-table"><thead><tr><th>Datum</th><th>Mitarbeiter</th><th>Kunde</th><th>Artikel-Nr.</th><th>Defekte Leuchte</th><th>Menge</th><th>Projekt</th><th>Lagerplatz</th><th>Beschreibung</th><th>MO-Nr.</th><th>Testernummer</th><th>Aktionen</th></tr></thead><tbody>';
    
    items.forEach(item => {
        const testerStyle = !item.testerNumber ? 'style="background-color: #ffebee; color: var(--danger-red); font-weight: bold;"' : '';
        
        html += `
            <tr ${testerStyle}>
                <td>${new Date(item.date).toLocaleDateString('de-DE')}</td>
                <td>${item.employee || '-'}</td>
                <td>${item.customerName || '-'}<br><small>${item.customerNumber || ''}</small></td>
                <td>${item.articleNumber || '-'}</td>
                <td>${item.defectivePart || '-'}</td>
                <td>${item.quantity}</td>
                <td>${item.projectInfo || '-'}</td>
                <td>${item.storageLocation || '-'}</td>
                <td>${item.description || '-'}</td>
                <td>${item.moNumber || '-'}</td>
                <td ${testerStyle}>${item.testerNumber || '❌ FEHLT'}</td>
                <td>
                    ${!item.testerNumber ? `<button class="btn btn-warning" onclick="addMissingTesterNumber('${item.id}')">📝 Nachtragen</button>` : ''}
                    <button class="btn btn-danger" onclick="deleteConsumptionItem('${item.id}')">🗑️</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function addMissingTesterNumber(itemId) {
    const testerNumber = prompt('Testernummer nachtragen:');
    if (testerNumber && testerNumber.trim()) {
        const itemIndex = consumptionMaterials.findIndex(item => item.id == itemId);
        if (itemIndex !== -1) {
            consumptionMaterials[itemIndex].testerNumber = testerNumber.trim();
            saveData('consumption');
            updateConsumptionList();
            updateAlerts();
            alert('Testernummer erfolgreich nachgetragen!');
        }
    }
}

function deleteConsumptionItem(itemId) {
    if (confirm('Eintrag wirklich löschen?')) {
        const itemIndex = consumptionMaterials.findIndex(item => item.id == itemId);
        if (itemIndex !== -1) {
            consumptionMaterials.splice(itemIndex, 1);
            saveData('consumption');
            updateConsumptionList();
            updateAlerts();
        }
    }
}

function exportConsumptionList() {
    const monthFilter = document.getElementById('monthFilter').value;
    const employeeFilter = document.getElementById('employeeFilter').value;
    const customerFilter = document.getElementById('customerFilter').value;
    
    let filename = 'SchahlLED_Verbrauchsmaterial';
    if (monthFilter) filename += `_${monthFilter}`;
    if (employeeFilter) filename += `_${employeeFilter}`;
    if (customerFilter) filename += `_${customerFilter}`;
    filename += '.csv';
    
    // Get filtered data
    filterConsumptionList();
    const tableElement = document.getElementById('consumptionTable');
    const table = tableElement.querySelector('table');
    
    if (!table) {
        alert('Keine Daten zum Exportieren vorhanden!');
        return;
    }
    
    // Convert table to CSV
    let csv = '';
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
        const cols = row.querySelectorAll('th, td');
        const csvRow = Array.from(cols).slice(0, -1).map(col => {
            // Remove HTML and clean text
            let text = col.textContent.replace(/"/g, '""');
            return `"${text}"`;
        }).join(',');
        csv += csvRow + '\n';
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    
    alert('Verbrauchsliste erfolgreich exportiert!');
}

function showAddUserModal() {
    loadStorageLocations(); // Load storage locations first
    document.getElementById('addUserModal').style.display = 'block';
    document.getElementById('newUserName').focus();
}

function addUser() {
    console.log('addUser called');
    const name = document.getElementById('newUserName').value.trim();
    const email = document.getElementById('newUserEmail').value.trim();
    const phone = document.getElementById('newUserPhone').value.trim();
    const department = document.getElementById('newUserDepartment').value.trim();
    const defaultStorage = document.getElementById('newUserDefaultStorage').value || 
                         document.getElementById('newUserCustomStorage').value.trim();
    
    if (!name || !email) {
        alert('Name und E-Mail sind erforderlich!');
        return;
    }
    
    // Add custom storage location if provided
    if (document.getElementById('newUserCustomStorage').value.trim()) {
        const customStorage = document.getElementById('newUserCustomStorage').value.trim();
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        if (!storageLocations.includes(customStorage)) {
            storageLocations.push(customStorage);
            localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        }
    }
    
    const user = {
        id: Date.now(),
        name: name,
        email: email,
        phone: phone,
        department: department,
        defaultStorage: defaultStorage,
        type: 'user',
        createdAt: new Date().toISOString()
    };
    
    console.log('New user', user);
    users.push(user);
    console.log('Users array after push', users);
    saveData('users');
    
    // Clear form
    document.getElementById('newUserName').value = '';
    document.getElementById('newUserEmail').value = '';
    document.getElementById('newUserPhone').value = '';
    document.getElementById('newUserDepartment').value = '';
    document.getElementById('newUserDefaultStorage').value = '';
    document.getElementById('newUserCustomStorage').value = '';
    
    closeModal('addUserModal');
    alert('Benutzer erfolgreich hinzugefügt!');
    
    loadHeaderUserSelect(); // Update header select
    
    if (currentPage === 'userManagement') {
        updateUserManagementTable();
    }
    
    if (currentPage === 'lendingFlow' && currentStep === 1) {
        updateUserSelectionGrid();
    }
}

function showEditUserModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('editUserId').value = user.id;
    document.getElementById('editUserName').value = user.name;
    document.getElementById('editUserEmail').value = user.email;
    document.getElementById('editUserPhone').value = user.phone || '';
    document.getElementById('editUserDepartment').value = user.department || '';
    document.getElementById('editUserDefaultStorage').value = user.defaultStorage || '';
    document.getElementById('editUserCustomStorage').value = '';

    loadStorageLocations();
    document.getElementById('editUserModal').style.display = 'block';
    document.getElementById('editUserName').focus();
}

function saveEditedUser() {
    const id = parseInt(document.getElementById('editUserId').value);
    const name = document.getElementById('editUserName').value.trim();
    const email = document.getElementById('editUserEmail').value.trim();
    const phone = document.getElementById('editUserPhone').value.trim();
    const department = document.getElementById('editUserDepartment').value.trim();
    const defaultStorage = document.getElementById('editUserDefaultStorage').value || 
                         document.getElementById('editUserCustomStorage').value.trim();
    
    if (!name || !email) {
        alert('Name und E-Mail sind erforderlich!');
        return;
    }
    
    // Add custom storage location if provided
    if (document.getElementById('editUserCustomStorage').value.trim()) {
        const customStorage = document.getElementById('editUserCustomStorage').value.trim();
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        if (!storageLocations.includes(customStorage)) {
            storageLocations.push(customStorage);
            localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        }
    }
    
    const userIndex = users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
        users[userIndex].name = name;
        users[userIndex].email = email;
        users[userIndex].phone = phone;
        users[userIndex].department = department;
        users[userIndex].defaultStorage = defaultStorage;
    }
    
    saveData('users');
    
    closeModal('editUserModal');
    alert('Benutzer erfolgreich bearbeitet!');
    
    loadHeaderUserSelect(); // Update header select
    
    if (currentPage === 'userManagement') {
        updateUserManagementTable();
    }
    
    if (currentPage === 'lendingFlow' && currentStep === 1) {
        updateUserSelectionGrid();
    }
}

function showAddCustomerModal() {
    loadStorageLocations(); // Load storage locations first
    document.getElementById('addCustomerModal').style.display = 'block';
    document.getElementById('newCustomerName').focus();
}

function addCustomer() {
    console.log('addCustomer called');
    const name = document.getElementById('newCustomerName').value.trim();
    const customerNumber = document.getElementById('newCustomerNumber').value.trim();
    const contact = document.getElementById('newCustomerContact').value.trim();
    const email = document.getElementById('newCustomerEmail').value.trim();
    const phone = document.getElementById('newCustomerPhone').value.trim();
    const defaultStorage = document.getElementById('newCustomerDefaultStorage').value || 
                         document.getElementById('newCustomerCustomStorage').value.trim();
    
    if (!name) {
        alert('Firmenname ist erforderlich!');
        return;
    }
    
    // Add custom storage location if provided
    if (document.getElementById('newCustomerCustomStorage').value.trim()) {
        const customStorage = document.getElementById('newCustomerCustomStorage').value.trim();
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        if (!storageLocations.includes(customStorage)) {
            storageLocations.push(customStorage);
            localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        }
    }
    
    const customer = {
        id: Date.now(),
        name: name,
        customerNumber: customerNumber,
        contact: contact,
        email: email,
        phone: phone,
        defaultStorage: defaultStorage,
        type: 'customer',
        createdAt: new Date().toISOString()
    };
    
    console.log('New customer', customer);
    customers.push(customer);
    console.log('Customers array after push', customers);
    saveData('customers');
    
    // Clear form
    document.getElementById('newCustomerName').value = '';
    document.getElementById('newCustomerNumber').value = '';
    document.getElementById('newCustomerContact').value = '';
    document.getElementById('newCustomerEmail').value = '';
    document.getElementById('newCustomerPhone').value = '';
    document.getElementById('newCustomerDefaultStorage').value = '';
    document.getElementById('newCustomerCustomStorage').value = '';
    
    closeModal('addCustomerModal');
    alert('Kunde erfolgreich hinzugefügt!');
    
    if (currentPage === 'customerManagement') {
        updateCustomerManagementTable();
    }
    
    if (currentPage === 'lendingFlow' && currentStep === 1) {
        updateUserSelectionGrid();
    }
}

function showEditCustomerModal(customerId) {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    document.getElementById('editCustomerId').value = customer.id;
    document.getElementById('editCustomerName').value = customer.name;
    document.getElementById('editCustomerNumber').value = customer.customerNumber || '';
    document.getElementById('editCustomerContact').value = customer.contact || '';
    document.getElementById('editCustomerEmail').value = customer.email || '';
    document.getElementById('editCustomerPhone').value = customer.phone || '';
    document.getElementById('editCustomerDefaultStorage').value = customer.defaultStorage || '';
    document.getElementById('editCustomerCustomStorage').value = '';

    loadStorageLocations();
    document.getElementById('editCustomerModal').style.display = 'block';
    document.getElementById('editCustomerName').focus();
}

function saveEditedCustomer() {
    const id = parseInt(document.getElementById('editCustomerId').value);
    const name = document.getElementById('editCustomerName').value.trim();
    const customerNumber = document.getElementById('editCustomerNumber').value.trim();
    const contact = document.getElementById('editCustomerContact').value.trim();
    const email = document.getElementById('editCustomerEmail').value.trim();
    const phone = document.getElementById('editCustomerPhone').value.trim();
    const defaultStorage = document.getElementById('editCustomerDefaultStorage').value || 
                         document.getElementById('editCustomerCustomStorage').value.trim();
    
    if (!name) {
        alert('Firmenname ist erforderlich!');
        return;
    }
    
    // Add custom storage location if provided
    if (document.getElementById('editCustomerCustomStorage').value.trim()) {
        const customStorage = document.getElementById('editCustomerCustomStorage').value.trim();
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        if (!storageLocations.includes(customStorage)) {
            storageLocations.push(customStorage);
            localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        }
    }
    
    const customerIndex = customers.findIndex(c => c.id === id);
    if (customerIndex !== -1) {
        customers[customerIndex].name = name;
        customers[customerIndex].customerNumber = customerNumber;
        customers[customerIndex].contact = contact;
        customers[customerIndex].email = email;
        customers[customerIndex].phone = phone;
        customers[customerIndex].defaultStorage = defaultStorage;
    }
    
    saveData('customers');
    
    closeModal('editCustomerModal');
    alert('Kunde erfolgreich bearbeitet!');
    
    if (currentPage === 'customerManagement') {
        updateCustomerManagementTable();
    }
    
    if (currentPage === 'lendingFlow' && currentStep === 1) {
        updateUserSelectionGrid();
    }
}

function showAddProductModal() {
    loadStorageLocations(); // Load storage locations first
    document.getElementById('addProductModal').style.display = 'block';
    document.getElementById('newProductBarcode').focus();
}

function addProduct() {
    console.log('addProduct called');
    const barcode = document.getElementById('newProductBarcode').value.trim();
    const name = document.getElementById('newProductName').value.trim();
    const storageLocation = document.getElementById('newProductStorageLocation').value || 
                          document.getElementById('newProductCustomStorage').value.trim();
    const description = document.getElementById('newProductDescription').value.trim();
    
    if (!barcode || !name) {
        alert('Barcode und Produktname sind erforderlich!');
        return;
    }
    
    // Check if barcode already exists
    if (products.find(p => p.barcode === barcode)) {
        alert('Barcode bereits vorhanden!');
        return;
    }
    
    // Add custom storage location if provided
    if (document.getElementById('newProductCustomStorage').value.trim()) {
        const customStorage = document.getElementById('newProductCustomStorage').value.trim();
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        if (!storageLocations.includes(customStorage)) {
            storageLocations.push(customStorage);
            localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        }
    }
    
    const product = {
        id: Date.now(),
        barcode: barcode,
        name: name,
        description: description,
        storageLocation: storageLocation,
        status: 'available',
        createdAt: new Date().toISOString()
    };
    
    console.log('New product', product);
    products.push(product);
    console.log('Products array after push', products);
    saveData('products');
    
    // Clear form
    document.getElementById('newProductBarcode').value = '';
    document.getElementById('newProductName').value = '';
    document.getElementById('newProductStorageLocation').value = '';
    document.getElementById('newProductCustomStorage').value = '';
    document.getElementById('newProductDescription').value = '';
    
    closeModal('addProductModal');
    alert('Produkt erfolgreich hinzugefügt!');
    
    if (currentPage === 'productManagement') {
        updateProductManagementTable();
    }
}

function updateUserManagementTable() {
    const container = document.getElementById('userManagementTable');
    
    let html = '<table class="data-table"><thead><tr><th>Name</th><th>E-Mail</th><th>Telefon</th><th>Abteilung</th><th>Standard-Lagerplatz</th><th>Erstellt</th><th>Aktionen</th></tr></thead><tbody>';
    
    users.forEach(user => {
        html += `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone || '-'}</td>
                <td>${user.department || '-'}</td>
                <td>${user.defaultStorage || '-'}</td>
                <td>${new Date(user.createdAt || Date.now()).toLocaleDateString('de-DE')}</td>
                <td>
                    <button class="btn btn-primary" onclick="showEditUserModal(${user.id})">Bearbeiten</button>
                    <button class="btn btn-danger" onclick="deleteUser(${user.id})">Löschen</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateCustomerManagementTable() {
    const container = document.getElementById('customerManagementTable');
    
    let html = '<table class="data-table"><thead><tr><th>Firmenname</th><th>Kundennummer</th><th>Ansprechpartner</th><th>E-Mail</th><th>Telefon</th><th>Standard-Lagerplatz</th><th>Aktionen</th></tr></thead><tbody>';
    
    customers.forEach(customer => {
        html += `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.customerNumber || '-'}</td>
                <td>${customer.contact || '-'}</td>
                <td>${customer.email || '-'}</td>
                <td>${customer.phone || '-'}</td>
                <td>${customer.defaultStorage || '-'}</td>
                <td>
                    <button class="btn btn-primary" onclick="showEditCustomerModal(${customer.id})">Bearbeiten</button>
                    <button class="btn btn-danger" onclick="deleteCustomer(${customer.id})">Löschen</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function updateProductManagementTable() {
    const container = document.getElementById('productManagementTable');
    
    let html = '<table class="data-table"><thead><tr><th>Name</th><th>Barcode</th><th>Lagerplatz</th><th>Status</th><th>Beschreibung</th><th>Aktionen</th></tr></thead><tbody>';
    
    products.forEach(product => {
        const statusClass = product.status === 'available' ? 'status-available' : 'status-lent';
        
        html += `
            <tr>
                <td>${product.name}</td>
                <td>${product.barcode}</td>
                <td>${product.storageLocation || '-'}</td>
                <td><span class="status-indicator ${statusClass}">${product.status === 'available' ? 'VERFÜGBAR' : 'AUSGELIEHEN'}</span></td>
                <td>${product.description || '-'}</td>
                <td><button class="btn btn-danger" onclick="deleteProduct(${product.id})">Löschen</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function deleteUser(userId) {
    if (confirm('Benutzer wirklich löschen?')) {
        users = users.filter(u => u.id !== userId);
        saveData('users');
        updateUserManagementTable();
        loadHeaderUserSelect(); // Update header
    }
}

function deleteCustomer(customerId) {
    if (confirm('Kunde wirklich löschen?')) {
        customers = customers.filter(c => c.id !== customerId);
        saveData('customers');
        updateCustomerManagementTable();
    }
}

function deleteProduct(productId) {
    if (confirm('Produkt wirklich löschen?')) {
        products = products.filter(p => p.id !== productId);
        saveData('products');
        updateProductManagementTable();
    }
}

function showSettingsModal() {
    document.getElementById('settingsModal').style.display = 'block';
    document.getElementById('autoReturnTime').value = settings.autoReturnTime;
    document.getElementById('requireTesterNumber').checked = settings.requireTesterNumber;
    document.getElementById('autoPrint').checked = settings.autoPrint;
    document.getElementById('printerType').value = settings.printerType;
}

function saveSettings() {
    settings.autoReturnTime = parseInt(document.getElementById('autoReturnTime').value) || 0;
    settings.requireTesterNumber = document.getElementById('requireTesterNumber').checked;
    settings.autoPrint = document.getElementById('autoPrint').checked;
    settings.printerType = document.getElementById('printerType').value;
    
    saveData('settings');
    closeModal('settingsModal');
    setupAutoReturn(); // Reinitialize timer with new settings
    alert('Einstellungen gespeichert!');
}

function showExportModal() {
    document.getElementById('exportModal').style.display = 'block';
    
    // Set default date range (last month to now)
    const now = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    document.getElementById('exportDateFrom').value = lastMonth.toISOString().split('T')[0];
    document.getElementById('exportDateTo').value = now.toISOString().split('T')[0];
}

function showImportModal() {
    document.getElementById('importModal').style.display = 'block';
}

function exportData() {
    const dateFrom = new Date(document.getElementById('exportDateFrom').value);
    const dateTo = new Date(document.getElementById('exportDateTo').value);
    dateTo.setHours(23, 59, 59, 999);
    
    const exportData = {};
    
    if (document.getElementById('exportUsers').checked) {
        exportData.users = users;
    }
    
    if (document.getElementById('exportCustomers').checked) {
        exportData.customers = customers;
    }
    
    if (document.getElementById('exportProducts').checked) {
        exportData.products = products;
    }
    
    if (document.getElementById('exportLendings').checked) {
        exportData.lendings = lendings.filter(l => {
            const lendDate = new Date(l.lendDate);
            return lendDate >= dateFrom && lendDate <= dateTo;
        });
    }
    
    if (document.getElementById('exportConsumption').checked) {
        exportData.consumptionMaterials = consumptionMaterials.filter(c => {
            const itemDate = new Date(c.date);
            return itemDate >= dateFrom && itemDate <= dateTo;
        });
    }
    
    if (document.getElementById('exportSettings').checked) {
        exportData.settings = settings;
    }
    
    // Add metadata
    exportData._metadata = {
        exportDate: new Date().toISOString(),
        version: '1.0',
        source: 'SchahlLED Management System'
    };
    
    // Download file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `schahlled_export_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    closeModal('exportModal');
    alert('Daten erfolgreich exportiert!');
}

function importData() {
    const fileInput = document.getElementById('importFile');
    const overwriteData = document.getElementById('overwriteData').checked;
    
    if (!fileInput.files[0]) {
        alert('Bitte wählen Sie eine Datei aus!');
        return;
    }
    
    // Backup vor Import
    if (overwriteData) {
        const backupData = {
            users: users,
            customers: customers,
            products: products,
            lendings: lendings,
            consumptionMaterials: consumptionMaterials,
            settings: settings,
            _metadata: {
                backupDate: new Date().toISOString(),
                version: '1.0',
                source: 'SchahlLED Backup'
            }
        };
        let backups = JSON.parse(localStorage.getItem('schahlled_backups')) || [];
        backups.push(backupData);
        localStorage.setItem('schahlled_backups', JSON.stringify(backups));
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (overwriteData) {
                if (confirm('Alle vorhandenen Daten werden überschrieben! Fortfahren?')) {
                    if (data.users) users = data.users;
                    if (data.customers) customers = data.customers;
                    if (data.products) products = data.products;
                    if (data.lendings) lendings = data.lendings;
                    if (data.consumptionMaterials) consumptionMaterials = data.consumptionMaterials;
                    if (data.settings) settings = data.settings;
                } else {
                    return;
                }
            } else {
                // Merge data
                if (data.users) {
                    data.users.forEach(user => {
                        if (!users.find(u => u.id === user.id)) users.push(user);
                    });
                }
                if (data.customers) {
                    data.customers.forEach(customer => {
                        if (!customers.find(c => c.id === customer.id)) customers.push(customer);
                    });
                }
                if (data.products) {
                    data.products.forEach(product => {
                        if (!products.find(p => p.id === product.id)) products.push(product);
                    });
                }
                if (data.lendings) {
                    data.lendings.forEach(lending => {
                        if (!lendings.find(l => l.id === lending.id)) lendings.push(lending);
                    });
                }
                if (data.consumptionMaterials) {
                    data.consumptionMaterials.forEach(item => {
                        if (!consumptionMaterials.find(c => c.id === item.id)) consumptionMaterials.push(item);
                    });
                }
                if (data.settings) {
                    settings = { ...settings, ...data.settings };
                }
            }
            
            saveAllData();
            closeModal('importModal');
            alert('Daten erfolgreich importiert!');
            
            // Refresh current page
            updateAllLists();
            loadHeaderUserSelect();
            
        } catch (error) {
            alert('Fehler beim Importieren der Datei: ' + error.message);
        }
    };
    reader.readAsText(fileInput.files[0]);
}

function saveData(type) {
    console.log('Saving ' + type);
    switch(type) {
        case 'users':
            localStorage.setItem('schahlled_users', JSON.stringify(users));
            break;
        case 'customers':
            localStorage.setItem('schahlled_customers', JSON.stringify(customers));
            break;
        case 'products':
            localStorage.setItem('schahlled_products', JSON.stringify(products));
            break;
        case 'lendings':
            localStorage.setItem('schahlled_lendings', JSON.stringify(lendings));
            break;
        case 'consumption':
            localStorage.setItem('schahlled_consumption', JSON.stringify(consumptionMaterials));
            break;
        case 'settings':
            localStorage.setItem('schahlled_settings', JSON.stringify(settings));
            break;
    }
}

function saveAllData() {
    saveData('users');
    saveData('customers');
    saveData('products');
    saveData('lendings');
    saveData('consumption');
    saveData('settings');
}

function updateAllLists() {
    updateAlerts();
    if (currentPage === 'returnFlow') updateReturnList();
    if (currentPage === 'inventoryList') updateInventoryList();
    if (currentPage === 'consumptionMaterials') {
        loadConsumptionFilters();
        updateConsumptionList();
    }
    if (currentPage === 'userManagement') updateUserManagementTable();
    if (currentPage === 'customerManagement') updateCustomerManagementTable();
    if (currentPage === 'productManagement') updateProductManagementTable();
    if (currentPage === 'storageManagement') updateStorageManagementTable();
}

function clearAllData() {
    if (confirm('Alle Daten wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
        localStorage.removeItem('schahlled_users');
        localStorage.removeItem('schahlled_customers');
        localStorage.removeItem('schahlled_products');
        localStorage.removeItem('schahlled_lendings');
        localStorage.removeItem('schahlled_consumption');
        localStorage.removeItem('schahlled_settings');
        localStorage.removeItem('schahlled_storage_locations');
        localStorage.removeItem('schahlled_current_user_id');
        
        location.reload();
    }
}

function printCurrentList() {
    const content = document.getElementById('inventoryTable').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>SchahlLED - Inventar</title>
            <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                /* Filter für linke Seite (z.B. LED-Strahler) */
                .filtered-product { display: none; }
                .product-led { display: table-row; }
            </style>
        </head>
        <body>
            <h2>SchahlLED - Inventar-Liste (LED-Strahler)</h2>
            <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
            ${content}
        </body>
        </html>
    `);
    // Filter anwenden
    const rows = printWindow.document.querySelectorAll('tr');
    rows.forEach(row => {
        const productNameCell = row.querySelector('td:first-child');
        if (productNameCell && !productNameCell.textContent.toLowerCase().includes('led')) {
            row.classList.add('filtered-product');
        } else if (productNameCell) {
            row.classList.add('product-led');
        }
    });
    printWindow.document.close();
    printWindow.print();
}

function printConsumptionList() {
    const content = document.getElementById('consumptionTable').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>SchahlLED - Verbrauchsmaterial</title>
            <style>
                body { font-family: Arial, sans-serif; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
            </style>
        </head>
        <body>
            <h2>SchahlLED - Verbrauchsmaterial-Liste</h2>
            <p>Erstellt am: ${new Date().toLocaleDateString('de-DE')}</p>
            ${content}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

function updateStorageManagementTable() {
    const container = document.getElementById('storageManagementTable');
    const storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    
    let html = '<table class="data-table"><thead><tr><th>Lagerplatz</th><th>Aktionen</th></tr></thead><tbody>';
    
    storageLocations.forEach(location => {
        html += `
            <tr>
                <td>${location}</td>
                <td><button class="btn btn-danger" onclick="deleteStorageLocation('${location}')">Löschen</button></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function showAddStorageModal() {
    document.getElementById('addStorageModal').style.display = 'block';
    document.getElementById('newStorageLocation').focus();
}

function showBatchStorageModal() {
    document.getElementById('batchStorageModal').style.display = 'block';
    document.getElementById('batchStoragePrefix').focus();
}

function addStorageLocation() {
    const newLocation = document.getElementById('newStorageLocation').value.trim();
    if (!newLocation) {
        alert('Bitte Lagerplatz eingeben!');
        return;
    }
    
    let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    if (storageLocations.includes(newLocation)) {
        alert('Lagerplatz bereits vorhanden!');
        return;
    }
    
    storageLocations.push(newLocation);
    localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
    loadStorageLocations();
    updateStorageManagementTable();
    
    document.getElementById('newStorageLocation').value = '';
    closeModal('addStorageModal');
    alert('Lagerplatz erfolgreich hinzugefügt!');
}

function addBatchStorageLocations() {
    const prefix = document.getElementById('batchStoragePrefix').value.trim();
    const start = document.getElementById('batchStorageStart').value.trim().split(',').map(s => s.trim());
    const end = document.getElementById('batchStorageEnd').value.trim().split(',').map(s => s.trim());
    
    if (!prefix || start.length !== 2 || end.length !== 2) {
        alert('Bitte Präfix und gültige Start-/Endnummern eingeben (z.B. 01, 01 und 08, 08)!');
        return;
    }
    
    const startRow = parseInt(start[0]);
    const startShelf = parseInt(start[1]);
    const endRow = parseInt(end[0]);
    const endShelf = parseInt(end[1]);
    
    if (isNaN(startRow) || isNaN(startShelf) || isNaN(endRow) || isNaN(endShelf)) {
        alert('Bitte gültige Nummern eingeben!');
        return;
    }
    
    let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
    let addedCount = 0;
    
    for (let row = startRow; row <= endRow; row++) {
        for (let shelf = (row === startRow ? startShelf : 1); shelf <= (row === endRow ? endShelf : 99); shelf++) {
            const location = `${prefix}-${String(row).padStart(2, '0')}-${String(shelf).padStart(2, '0')}`;
            if (!storageLocations.includes(location)) {
                storageLocations.push(location);
                addedCount++;
            }
        }
    }
    
    localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
    loadStorageLocations();
    updateStorageManagementTable();
    
    document.getElementById('batchStoragePrefix').value = '';
    document.getElementById('batchStorageStart').value = '';
    document.getElementById('batchStorageEnd').value = '';
    closeModal('batchStorageModal');
    alert(`${addedCount} Lagerplätze erfolgreich hinzugefügt!`);
}

function deleteStorageLocation(location) {
    if (confirm(`Lagerplatz "${location}" wirklich löschen?`)) {
        let storageLocations = JSON.parse(localStorage.getItem('schahlled_storage_locations')) || [];
        storageLocations = storageLocations.filter(l => l !== location);
        localStorage.setItem('schahlled_storage_locations', JSON.stringify(storageLocations));
        loadStorageLocations();
        updateStorageManagementTable();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

window.onclick = function(event) {
    const modals = document.getElementsByClassName('modal');
    for (let i = 0; i < modals.length; i++) {
        if (event.target == modals[i]) {
            modals[i].style.display = 'none';
        }
    }
}

// Tastatur-Shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey) {
        switch(e.key) {
            case 'h':
                e.preventDefault();
                showPage('dashboard');
                break;
            case 'l':
                e.preventDefault();
                showPage('lendingFlow');
                break;
            case 'r':
                e.preventDefault();
                showPage('returnFlow');
                break;
            case 'i':
                e.preventDefault();
                showPage('inventoryList');
                break;
            case 'v':
                e.preventDefault();
                showPage('consumptionMaterials');
                break;
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
    }
});
    
function updateProductSuggestions(productsList) {
    const grid = document.getElementById('availableProductsGrid');
    if (grid) grid.innerHTML = '';
    productsList.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => selectProduct(product);
        card.innerHTML = `
            <div class="product-info">
                <h4>${product.name}</h4>
                <div class="product-details">
                    <p>Barcode: ${product.barcode}</p>
                    <p>Lagerplatz: ${product.storageLocation || '-'}</p>
                    <p>Beschreibung: ${product.description || '-'}</p>
                </div>
                <div class="product-status">VERFÜGBAR</div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function selectProduct(product) {
    const card = event.target.closest('.product-card');
    if (selectedProducts.some(p => p.id === product.id)) {
        selectedProducts = selectedProducts.filter(p => p.id !== product.id);
        card.classList.remove('selected');
    } else {
        selectedProducts.push(product);
        card.classList.add('selected');
    }
    const continueBtn = document.getElementById('continueToStep3');
    continueBtn.disabled = selectedProducts.length === 0;
}

function addNewProduct(preFillBarcode) {
    showAddProductModal();
    document.getElementById('newProductBarcode').value = preFillBarcode || '';
    document.getElementById('newProductName').focus();
}