// State Management
let employees = JSON.parse(localStorage.getItem('haraz_employees')) || [];
let attendanceLogs = JSON.parse(localStorage.getItem('haraz_attendance')) || [];

// Constants
const SHIFT_START_HOUR = 9; // 9 AM is considered start time

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateClock();
    setInterval(updateClock, 1000);
    renderDashboard();
    renderEmployeeTable();

    // Set default dates for payroll (current month)
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById('payrollStart').valueAsDate = firstDay;
    document.getElementById('payrollEnd').valueAsDate = today;
});

// --- NAVIGATION ---
function showSection(sectionId, linkElement) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
    // Show target section
    document.getElementById(sectionId).classList.add('active');

    // Update Sidebar
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    linkElement.classList.add('active');

    // Update Title
    const titles = {
        'dashboard': 'Dashboard',
        'employees': 'Staff Management',
        'payroll': 'Payroll & Wages'
    };
    document.getElementById('pageTitle').textContent = titles[sectionId];

    if (sectionId === 'dashboard') renderDashboard();
}

function updateClock() {
    const now = new Date();
    document.getElementById('clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// --- MODALS ---
function openModal(id) {
    document.getElementById(id).classList.add('open');
    if (id === 'employeeModal') {
        document.getElementById('editEmployeeId').value = '';
        document.querySelector('form').reset();
    }
}

function closeModal(id) {
    document.getElementById(id).classList.remove('open');
}

// --- KIOSK / KEYPAD ---
let currentInput = '';

function openKeypad() {
    currentInput = '';
    document.getElementById('keypadDisplay').value = '';
    document.getElementById('keypadMsg').textContent = '';
    document.getElementById('keypadMsg').className = '';
    document.getElementById('keypadModal').classList.add('open');

    // Switch to passcode by default
    switchTab('passcode');

    // Populate Demo Select for Biometric
    const bioSelect = document.getElementById('bioDemoSelect');
    bioSelect.innerHTML = '<option value="">-- Choose Staff to Simulate --</option>';
    employees.filter(e => e.hasBio).forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = e.name;
        bioSelect.appendChild(opt);
    });
}

function closeKeypad() {
    document.getElementById('keypadModal').classList.remove('open');
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('[id^="section-"]').forEach(s => s.style.display = 'none');

    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('section-' + tab).style.display = 'block';
}

function keyPress(key) {
    if (key === 'clear') {
        currentInput = '';
    } else {
        if (currentInput.length < 6) currentInput += key;
    }
    document.getElementById('keypadDisplay').value = currentInput;
}

function submitPasscode() {
    const emp = employees.find(e => e.passcode == currentInput);
    processLogin(emp);
}

function processLogin(emp) {
    const msgEl = document.getElementById('keypadMsg');
    const bioStatus = document.getElementById('bioStatus');

    if (!emp) {
        msgEl.textContent = 'Invalid Passcode';
        msgEl.style.color = 'var(--danger)';
        setTimeout(() => { msgEl.textContent = ''; currentInput = ''; document.getElementById('keypadDisplay').value = ''; }, 1000);
        return;
    }

    // Logic for Clock In / Out
    const lastLog = attendanceLogs
        .filter(log => log.empId === emp.id)
        .sort((a, b) => new Date(b.checkIn) - new Date(a.checkIn))[0];

    const now = new Date();
    let message = '';
    let color = '';

    if (!lastLog || lastLog.checkOut) {
        // Clock In
        const newLog = {
            id: Date.now(),
            empId: emp.id,
            checkIn: now.toISOString(),
            checkOut: null
        };
        attendanceLogs.push(newLog);
        message = `Welcome, ${emp.name}! (Clocked In)`;
        color = 'var(--success)';
    } else {
        // Clock Out
        lastLog.checkOut = now.toISOString();
        message = `Goodbye, ${emp.name}! (Clocked Out)`;
        color = 'var(--warning)';
    }

    // Passcode Feedback
    msgEl.textContent = message;
    msgEl.style.color = color;

    // Biometric Feedback
    bioStatus.textContent = message;
    bioStatus.style.color = color;
    document.getElementById('scannerEffect').classList.add('scan-success');

    saveData();
    renderDashboard();

    // Close modal after delay
    setTimeout(() => {
        closeKeypad();
        // Reset Scanner Effect
        document.getElementById('scannerEffect').classList.remove('scan-success');
        bioStatus.textContent = 'Press and hold to scan';
        bioStatus.style.color = 'var(--text-muted)';
    }, 1500);
}

// --- BIOMETRIC SIMULATION ---
let scanTimer;

function startScan() {
    const scanner = document.getElementById('scannerEffect');
    const status = document.getElementById('bioStatus');
    const selectedEmpId = document.getElementById('bioDemoSelect').value;

    scanner.classList.add('scanning');
    status.textContent = 'Scanning...';

    scanTimer = setTimeout(() => {
        scanner.classList.remove('scanning');

        if (selectedEmpId) {
            const emp = employees.find(e => e.id == selectedEmpId);
            processLogin(emp);
        } else {
            status.textContent = 'Fingerprint Not Recognized';
            status.style.color = 'var(--danger)';
            scanner.classList.add('scan-error');
            setTimeout(() => {
                scanner.classList.remove('scan-error');
                status.textContent = 'Press and hold to scan';
                status.style.color = 'var(--text-muted)';
            }, 1500);
        }
    }, 1500); // 1.5s scan duration
}

function endScan() {
    clearTimeout(scanTimer);
    const scanner = document.getElementById('scannerEffect');
    if (scanner.classList.contains('scanning')) {
        scanner.classList.remove('scanning');
        document.getElementById('bioStatus').textContent = 'Scan Cancelled';
        setTimeout(() => {
            document.getElementById('bioStatus').textContent = 'Press and hold to scan';
        }, 1000);
    }
}


// --- EMPLOYEE MANAGEMENT ---
function saveEmployee(e) {
    e.preventDefault();

    const id = document.getElementById('editEmployeeId').value;
    const name = document.getElementById('empName').value;
    const phone = document.getElementById('empPhone').value;
    const email = document.getElementById('empEmail').value;
    const wage = parseFloat(document.getElementById('empWage').value);
    const passcode = document.getElementById('empPasscode').value;
    const hasBio = document.getElementById('empHasBio').checked;

    if (id) {
        // Edit
        const idx = employees.findIndex(emp => emp.id == id);
        employees[idx] = { ...employees[idx], name, phone, email, wage, passcode, hasBio };
    } else {
        // Add New
        const newEmp = {
            id: Date.now().toString(),
            name, phone, email, wage, passcode, hasBio,
            createdAt: new Date().toISOString()
        };
        employees.push(newEmp);
    }

    saveData();
    closeModal('employeeModal');
    renderEmployeeTable();
    renderDashboard();
}

function deleteEmployee(id) {
    if (confirm('Are you sure you want to remove this employee?')) {
        employees = employees.filter(e => e.id != id);
        saveData();
        renderEmployeeTable();
        renderDashboard();
    }
}

function renderEmployeeTable() {
    const tbody = document.getElementById('employeeTable');
    tbody.innerHTML = employees.map(emp => `
        <tr>
            <td>${emp.name}</td>
            <td>${emp.phone}</td>
            <td>${emp.email || '-'}</td>
            <td>$${emp.wage}/hr</td>
            <td><span style="filter: blur(4px);">${emp.passcode}</span></td>
            <td>
                <button class="btn btn-outline" style="padding: 0.4rem;" onclick="deleteEmployee('${emp.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// --- DASHBOARD ---
function renderDashboard() {
    document.getElementById('totalEmployees').textContent = employees.length;

    // Active Employees (No Checkout time on their last active log)
    const activeLogs = attendanceLogs.filter(log => !log.checkOut);
    document.getElementById('activeEmployees').textContent = activeLogs.length;

    // On Time (Clocked in today before SHIFT_START_HOUR)
    const today = new Date().toDateString();
    const onTimeCount = attendanceLogs.filter(log => {
        const logDate = new Date(log.checkIn);
        return logDate.toDateString() === today && logDate.getHours() < SHIFT_START_HOUR;
    }).length;
    document.getElementById('onTimeEmployees').textContent = onTimeCount;

    // Live Table
    const liveTbody = document.getElementById('liveAttendanceTable');
    if (activeLogs.length === 0) {
        liveTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted)">No employees currently working</td></tr>`;
    } else {
        liveTbody.innerHTML = activeLogs.map(log => {
            const emp = employees.find(e => e.id === log.empId);
            if (!emp) return '';
            const checkInTime = new Date(log.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                <tr>
                    <td>${emp.name}</td>
                    <td>Barista/Staff</td>
                    <td>${checkInTime}</td>
                    <td><span class="status-badge status-active">Clocked In</span></td>
                </tr>
            `;
        }).join('');
    }
}

// --- PAYROLL ---
function calculatePayroll() {
    const startStr = document.getElementById('payrollStart').value;
    const endStr = document.getElementById('payrollEnd').value;

    if (!startStr || !endStr) {
        alert("Please select both start and end dates.");
        return;
    }

    const start = new Date(startStr);
    const end = new Date(endStr);
    // Set end to end of day
    end.setHours(23, 59, 59);

    const tbody = document.getElementById('payrollTable');

    // Group logs by employee
    const report = {};

    employees.forEach(emp => {
        report[emp.id] = {
            name: emp.name,
            wage: emp.wage,
            totalMs: 0
        };
    });

    attendanceLogs.forEach(log => {
        const logIn = new Date(log.checkIn);
        // Only count checks fully or partially within range? 
        // For simplicity, we check if checkIn is within range.
        if (logIn >= start && logIn <= end && log.checkOut) {
            const duration = new Date(log.checkOut) - logIn;
            if (report[log.empId]) {
                report[log.empId].totalMs += duration;
            }
        }
    });

    let html = '';
    for (const empId in report) {
        const data = report[empId];
        const hours = data.totalMs / (1000 * 60 * 60);
        const totalPay = hours * data.wage;

        // Only show if hours > 0
        if (hours > 0) {
            html += `
                <tr>
                    <td>${data.name}</td>
                    <td>${hours.toFixed(2)} hrs</td>
                    <td>$${data.wage}/hr</td>
                    <td style="color: var(--success); font-weight: bold;">$${totalPay.toFixed(2)}</td>
                </tr>
            `;
        }
    }

    if (html === '') {
        html = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted)">No completed shifts found in this range</td></tr>`;
    }

    tbody.innerHTML = html;
}

// --- DATA PERSISTENCE ---
function saveData() {
    localStorage.setItem('haraz_employees', JSON.stringify(employees));
    localStorage.setItem('haraz_attendance', JSON.stringify(attendanceLogs));
}
