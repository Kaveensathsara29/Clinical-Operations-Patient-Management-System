/**
 * MASTER Health Super Clinic System - Single Page Application (SPA) Engine
 */

let clinicChartInstance = null;
let reportData = null;
let currentReportSec = 'allBills';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initLiveClock();
    checkAuthSession();
    initLoginForm();
    initLogout();

    // Event listeners for SPA Router
    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('popstate', handleRoute);

    // Global delegation for navigation links with href starting with #
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a[href^="#"]');
        if (link) {
            const href = link.getAttribute('href');
            if (href && href.length > 1 && href !== '#') {
                const targetView = href.substring(1);
                const validViews = ['dashboard', 'patients', 'appointments', 'billing', 'doctors', 'reports'];
                if (validViews.includes(targetView)) {
                    e.preventDefault();
                    window.location.hash = href;
                }
            }
        }
    });

    // Initialize module form event handlers
    initPatientsPage();
    initAppointmentsPage();
    initBillingPage();
    initDoctorsPage();
    initReportsPage();
});

/* ==========================================================================
   SPA ROUTER & NAVIGATION ENGINE
   ========================================================================== */
function handleRoute() {
    const user = localStorage.getItem('loggedInUser');
    if (!user) return; // Authentication guard

    let hash = window.location.hash.replace('#', '').trim();
    const validViews = ['dashboard', 'patients', 'appointments', 'billing', 'doctors', 'reports'];

    if (!hash || !validViews.includes(hash)) {
        hash = 'dashboard';
    }

    navigateTo(hash);
}

function navigateTo(viewName) {
    // 1. Update Active Sidebar Link
    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === `#${viewName}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // 2. Hide all view sections and show requested view section
    const views = document.querySelectorAll('.spa-view');
    views.forEach(v => v.classList.remove('active'));

    const targetViewEl = document.getElementById(`view-${viewName}`);
    if (targetViewEl) {
        targetViewEl.classList.add('active');
    }

    // 3. Update Top Header Titles
    const titleHeading = document.getElementById('pageTitleHeading');
    const titleSub = document.getElementById('pageTitleSub');

    const viewTitles = {
        'dashboard': { title: 'Clinic Overview', sub: 'Real-time analytics and today\'s schedule' },
        'patients': { title: 'Patient Registry', sub: 'Register, inspect, and manage patient medical records' },
        'appointments': { title: 'Appointments Booking', sub: 'Schedule consultations and track patient visits' },
        'billing': { title: 'Billing & Invoices', sub: 'Generate medical receipts and manage clinic accounts' },
        'doctors': { title: 'Doctor Schedules & Roster', sub: 'Manage medical specialists, room assignments, and duty availability' },
        'reports': { title: 'Reports & Analytics', sub: 'Generate and download daily reports for patients, appointments, revenue and billing' }
    };

    if (viewTitles[viewName]) {
        if (titleHeading) titleHeading.textContent = viewTitles[viewName].title;
        if (titleSub) titleSub.textContent = viewTitles[viewName].sub;
    }

    // 4. Trigger View-Specific Data Refresh
    switch (viewName) {
        case 'dashboard':
            initDashboardPage();
            break;
        case 'patients':
            loadPatientsTable();
            break;
        case 'appointments':
            populatePatientDropdowns();
            populateDoctorDropdowns();
            loadAppointmentsTable('all');
            break;
        case 'billing':
            populatePatientDropdowns();
            loadBillingTable();
            break;
        case 'doctors':
            loadDoctorsTable();
            break;
        case 'reports':
            initReportsPage();
            break;
    }
}

/* ==========================================================================
   TOAST NOTIFICATION ENGINE
   ========================================================================== */
function showToast(message, type = 'success', duration = 3500) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconClass = 'fa-circle-check';
    if (type === 'error') iconClass = 'fa-circle-xmark';
    if (type === 'info') iconClass = 'fa-circle-info';

    toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

/* ==========================================================================
   THEME SWITCHER & LIVE CLOCK
   ========================================================================== */
function initTheme() {
    const savedTheme = localStorage.getItem('MASTER_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        updateThemeIcon(themeToggleBtn, savedTheme);
        themeToggleBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('MASTER_theme', newTheme);
            updateThemeIcon(themeToggleBtn, newTheme);
            showToast(`Switched to ${newTheme} mode`, 'info', 2000);
            
            if (clinicChartInstance) {
                const revData = clinicChartInstance.data.datasets[0].data;
                const aptData = clinicChartInstance.data.datasets[1].data;
                renderAnalyticsChart(revData, aptData);
            }
        });
    }
}

function updateThemeIcon(btn, theme) {
    btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun" style="color: #f59e0b;"></i>' : '<i class="fa-solid fa-moon"></i>';
}

function initLiveClock() {
    const clockEl = document.getElementById('liveClock');
    if (!clockEl) return;

    function tick() {
        const now = new Date();
        clockEl.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    tick();
    setInterval(tick, 1000);
}

/* ==========================================================================
   AUTHENTICATION CHECK & SESSION ENGINE
   ========================================================================== */
function checkAuthSession() {
    const user = localStorage.getItem('loggedInUser');
    const loginView = document.getElementById('login-view');
    const appView = document.getElementById('app-view');

    if (!user) {
        if (loginView) loginView.style.display = 'block';
        if (appView) appView.style.display = 'none';
        return;
    }

    if (loginView) loginView.style.display = 'none';
    if (appView) appView.style.display = 'block';

    const userFullNameEl = document.getElementById('userFullName');
    const userAvatarEl = document.getElementById('userAvatar');
    if (userFullNameEl) {
        const fullName = localStorage.getItem('userFullName') || 'Administrator';
        userFullNameEl.textContent = fullName;
        if (userAvatarEl) {
            const initials = fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            userAvatarEl.textContent = initials || 'AD';
        }
    }

    handleRoute();
}

/* ==========================================================================
   LOGIN & LOGOUT HANDLERS
   ========================================================================== */
function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value.trim();
        const errorBox = document.getElementById('error-box');

        try {
            const response = await fetch('login.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({ username: usernameInput, password: passwordInput })
            });

            const data = await response.json();

            if (data.status === 'success') {
                localStorage.setItem('loggedInUser', data.data.username || usernameInput);
                localStorage.setItem('userFullName', data.data.full_name || 'Administrator');
                showToast('Login successful! Entering clinic portal...', 'success');
                
                checkAuthSession();
                window.location.hash = '#dashboard';
                return;
            } else {
                throw new Error(data.message || 'Invalid Credentials');
            }
        } catch (err) {
            if (errorBox) {
                errorBox.style.display = 'flex';
                errorBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <span>${err.message || 'Incorrect Username or Password!'}</span>`;
            }
            showToast('Incorrect Username or Password!', 'error');
        }
    });
}

function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await fetch('logout.php');
        } catch (e) { /* ignore */ }
        localStorage.removeItem('loggedInUser');
        localStorage.removeItem('userFullName');
        showToast('Logged out successfully', 'info');
        window.location.hash = '';
        checkAuthSession();
    });
}

/* ==========================================================================
   DASHBOARD PAGE LOGIC & CHARTS
   ========================================================================== */
async function initDashboardPage() {
    if (!document.getElementById('statPatients')) return;

    let stats = {};

    try {
        const res = await fetch('get_stats.php');
        const data = await res.json();
        if (data.status === 'success' && data.data) {
            stats = data.data;
        }
    } catch (e) {
        console.error('Could not load stats from database.');
    }

    document.getElementById('statPatients').textContent = (stats.total_patients || 0).toLocaleString();
    document.getElementById('statAppointments').textContent = (stats.today_appointments || 0).toLocaleString();
    document.getElementById('statDoctors').textContent = (stats.active_doctors || 0).toLocaleString();
    document.getElementById('statRevenue').textContent = `Rs. ${(stats.today_revenue || 0).toLocaleString()}`;

    renderDoctorWidget();
    renderDashboardSchedule();
    renderAnalyticsChart(stats.revenue_trend, stats.appointment_trend);
}

async function renderDoctorWidget() {
    const widget = document.getElementById('doctorWidgetList');
    if (!widget) return;

    let doctors = [];
    try {
        const res = await fetch('get_doctors.php');
        const data = await res.json();
        if (data.status === 'success' && data.data) doctors = data.data;
    } catch (e) {
        doctors = [];
    }

    if (doctors.length === 0) {
        widget.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 10px;">No doctors available</div>`;
        return;
    }

    widget.innerHTML = doctors.slice(0, 4).map(doc => {
        let badgeClass = 'badge-success';
        if (doc.status === 'In Surgery') badgeClass = 'badge-pending';
        if (doc.status === 'On Leave' || doc.status === 'Off Duty') badgeClass = 'badge-danger';
        const initials = doc.full_name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return `
            <div class="doctor-item">
                <div class="doc-profile">
                    <div class="doc-avatar">${initials}</div>
                    <div>
                        <div class="doc-name">${doc.full_name}</div>
                        <div class="doc-spec">${doc.specialty} (${doc.room_no})</div>
                    </div>
                </div>
                <span class="badge ${badgeClass}">${doc.status}</span>
            </div>
        `;
    }).join('');
}

async function renderDashboardSchedule() {
    const tbody = document.getElementById('dashAppointmentTable');
    if (!tbody) return;

    let appointments = [];
    try {
        const res = await fetch('get_appointments.php');
        const data = await res.json();
        if (data.status === 'success' && data.data) appointments = data.data;
    } catch (e) {
        appointments = [];
    }

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">No appointments scheduled today</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.slice(0, 6).map(apt => {
        let badgeClass = 'badge-pending';
        if (apt.status === 'Confirmed') badgeClass = 'badge-success';
        if (apt.status === 'Active') badgeClass = 'badge-info';
        if (apt.status === 'Completed') badgeClass = 'badge-success';
        if (apt.status === 'Cancelled') badgeClass = 'badge-danger';

        const canCancel = apt.status !== 'Cancelled' && apt.status !== 'Completed';

        return `
            <tr>
                <td><strong>#APT-${apt.id}</strong></td>
                <td>${apt.patient_name || 'Patient #' + apt.patient_id}</td>
                <td>${apt.doctor_name}</td>
                <td>${apt.appointment_date} (${apt.appointment_time})</td>
                <td><span class="badge ${badgeClass}">${apt.status}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${apt.status !== 'Cancelled' ? `
                            <button onclick="toggleAppointmentStatus(${apt.id}, '${apt.status}')" class="btn-sm btn-outline" title="Advance State">
                                <i class="fa-solid fa-arrow-rotate-right"></i> Next State
                            </button>
                        ` : ''}
                        ${canCancel ? `
                            <button onclick="cancelAppointment(${apt.id})" class="btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;" title="Cancel Appointment">
                                <i class="fa-solid fa-ban"></i> Cancel
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderAnalyticsChart(revenueTrend, appointmentTrend) {
    const canvas = document.getElementById('clinicTrendChart');
    if (!canvas) return;

    if (clinicChartInstance) {
        clinicChartInstance.destroy();
        clinicChartInstance = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(226, 232, 240, 0.6)';

    const revenueData = (revenueTrend && revenueTrend.length === 7) ? revenueTrend : [12000, 19000, 15000, 22000, 28000, 24000, 31000];
    const aptData = (appointmentTrend && appointmentTrend.length === 7) ? appointmentTrend : [25, 30, 28, 42, 38, 45, 50];

    const ctx = canvas.getContext('2d');

    const revGrad = ctx.createLinearGradient(0, 0, 0, 280);
    revGrad.addColorStop(0, 'rgba(37, 99, 235, 0.25)');
    revGrad.addColorStop(1, 'rgba(37, 99, 235, 0.01)');

    const aptGrad = ctx.createLinearGradient(0, 0, 0, 280);
    aptGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
    aptGrad.addColorStop(1, 'rgba(16, 185, 129, 0.01)');

    clinicChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['6 Days Ago', '5 Days Ago', '4 Days Ago', '3 Days Ago', '2 Days Ago', 'Yesterday', 'Today'],
            datasets: [
                {
                    label: 'Revenue (Rs.)',
                    data: revenueData,
                    borderColor: '#2563eb',
                    backgroundColor: revGrad,
                    borderWidth: 2.5,
                    tension: 0.45,
                    fill: true,
                    pointBackgroundColor: '#2563eb',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    yAxisID: 'y'
                },
                {
                    label: 'Appointments',
                    data: aptData,
                    borderColor: '#10b981',
                    backgroundColor: aptGrad,
                    borderWidth: 2.5,
                    tension: 0.45,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { size: 12, family: 'Inter, sans-serif' }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1e293b' : '#ffffff',
                    titleColor: isDark ? '#f1f5f9' : '#0f172a',
                    bodyColor: isDark ? '#94a3b8' : '#475569',
                    borderColor: isDark ? '#334155' : '#e2e8f0',
                    borderWidth: 1,
                    padding: 12,
                    callbacks: {
                        label: function (ctx) {
                            if (ctx.datasetIndex === 0) {
                                return ` Revenue: Rs. ${ctx.parsed.y.toLocaleString()}`;
                            }
                            return ` Appointments: ${ctx.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { color: gridColor }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    ticks: {
                        color: textColor,
                        font: { size: 11 },
                        callback: (v) => 'Rs.' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v)
                    },
                    grid: { color: gridColor }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    ticks: { color: textColor, font: { size: 11 } },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

/* ==========================================================================
   PATIENTS PAGE LOGIC
   ========================================================================== */
function initPatientsPage() {
    const patientForm = document.getElementById('patientForm');
    const searchInput = document.getElementById('patientSearchInput');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            loadPatientsTable(e.target.value.trim().toLowerCase());
        });
    }

    if (patientForm) {
        patientForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('fullName').value.trim();
            const age = parseInt(document.getElementById('age').value);
            const gender = document.getElementById('gender').value;
            const bloodGroup = document.getElementById('bloodGroup').value;
            const phone = document.getElementById('phone').value.trim();
            const email = document.getElementById('email').value.trim();
            const address = document.getElementById('address').value.trim();
            const medicalHistory = document.getElementById('medicalHistory').value.trim();

            if (!fullName) { showToast('Full Name is required!', 'error'); return; }
            if (!phone) { showToast('Phone Number is required!', 'error'); return; }
            if (!gender) { showToast('Please select a Gender!', 'error'); return; }
            if (!address) { showToast('Residential Address is required!', 'error'); return; }
            if (!age || age < 1 || age > 120) { showToast('Enter a valid age (1-120)!', 'error'); return; }

            const newPatientData = { fullName, age, gender, bloodGroup, phone, email, address, medicalHistory };

            try {
                const res = await fetch('add_patient.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(newPatientData)
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast('Patient Registered & Saved to Database!', 'success');
                } else {
                    showToast('Error: ' + (data.message || 'Could not register patient'), 'error');
                    return;
                }
            } catch (fetchErr) {
                showToast('Database connection error!', 'error');
                return;
            }

            patientForm.reset();
            loadPatientsTable();
        });
    }
}

async function loadPatientsTable(query = '') {
    const tbody = document.getElementById('patientTableBody');
    if (!tbody) return;

    let patients = [];
    try {
        const res = await fetch(`get_patients.php?search=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.status === 'success') patients = data.data;
    } catch (e) {
        patients = [];
    }

    if (patients.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No patient records found</td></tr>`;
        return;
    }

    tbody.innerHTML = patients.map(p => `
        <tr>
            <td><strong>#P-${p.id}</strong></td>
            <td><strong>${p.full_name}</strong></td>
            <td>${p.age} yrs (${p.gender})</td>
            <td><div>${p.phone}</div><small style="color: var(--text-muted);">${p.email || 'N/A'}</small></td>
            <td><span class="badge badge-info">${p.blood_group || 'O+'}</span></td>
            <td>${p.address}</td>
            <td><small style="color: var(--text-secondary);">${p.medical_history || 'None'}</small></td>
        </tr>
    `).join('');
}

async function removePatientRecord(id) {
    if (!confirm('Are you sure you want to delete this patient record?')) return;

    id = parseInt(id);

    try {
        const res = await fetch('delete_patient.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id })
        });
        const data = await res.json();
        if (data.status !== 'success') {
            showToast('Error deleting: ' + (data.message || 'Server error'), 'error');
            return;
        }
        showToast('Patient record deleted from Database', 'success');
    } catch (e) {
        showToast('Server error while deleting record', 'error');
    }
    loadPatientsTable();
}

/* ==========================================================================
   APPOINTMENTS PAGE LOGIC
   ========================================================================== */
function initAppointmentsPage() {
    const form = document.getElementById('appointmentForm');
    const searchInput = document.getElementById('appointmentSearchInput');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            const activeFilter = document.querySelector('.filter-apt-btn.active')?.getAttribute('data-filter') || 'all';
            loadAppointmentsTable(activeFilter, e.target.value.trim().toLowerCase());
        });
    }

    const filterBtns = document.querySelectorAll('.filter-apt-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            const searchVal = document.getElementById('appointmentSearchInput')?.value.trim().toLowerCase() || '';
            loadAppointmentsTable(e.target.getAttribute('data-filter'), searchVal);
        });
    });

    if (form) {
        const dateInput = document.getElementById('appointmentDate');
        if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patientSelect = document.getElementById('patientSelect');
            const doctorSelect = document.getElementById('doctorSelect');
            const date = document.getElementById('appointmentDate').value;
            const time = document.getElementById('appointmentTime').value;
            const notes = document.getElementById('notes').value.trim();

            const patientId = patientSelect.value;
            const doctorName = doctorSelect.value;

            try {
                const res = await fetch('add_appointment.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ patientSelect: patientId, doctorSelect: doctorName, appointmentDate: date, appointmentTime: time, notes })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast('Appointment Saved to Database!', 'success');
                } else {
                    showToast('Error: ' + (data.message || 'Could not book appointment'), 'error');
                    return;
                }
            } catch (fetchErr) {
                showToast('Database connection error!', 'error');
                return;
            }

            form.reset();
            if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
            loadAppointmentsTable('all');
        });
    }
}

async function populatePatientDropdowns() {
    const patientSelects = [document.getElementById('patientSelect'), document.getElementById('billPatient')].filter(Boolean);
    if (patientSelects.length === 0) return;

    let patients = [];
    try {
        const res = await fetch('get_patients.php');
        const data = await res.json();
        if (data.status === 'success') patients = data.data;
    } catch (e) {
        patients = [];
    }

    patientSelects.forEach(sel => {
        sel.innerHTML = `<option value="">Select Registered Patient</option>` +
            patients.map(p => `<option value="${p.id}">${p.full_name} (${p.phone})</option>`).join('');
    });
}

async function populateDoctorDropdowns() {
    const docSelect = document.getElementById('doctorSelect');
    if (!docSelect) return;

    let doctors = [];
    try {
        const res = await fetch('get_doctors.php');
        const data = await res.json();
        if (data.status === 'success') doctors = data.data;
    } catch (e) {
        doctors = [];
    }

    docSelect.innerHTML = `<option value="">Select Specialist Doctor</option>` +
        doctors.map(d => `<option value="${d.full_name}">${d.full_name} - ${d.specialty} (${d.room_no})</option>`).join('');
}

async function loadAppointmentsTable(filter = 'all', searchQuery = '') {
    const tbody = document.getElementById('appointmentTableBody');
    if (!tbody) return;

    let appointments = [];
    try {
        const res = await fetch(`get_appointments.php?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.status === 'success') appointments = data.data;
    } catch (e) {
        appointments = [];
    }

    if (filter !== 'all') {
        appointments = appointments.filter(a => a.status === filter);
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        appointments = appointments.filter(a => {
            const pName = (a.patient_name || '').toLowerCase();
            const pPhone = (a.phone || '').toLowerCase();
            const docName = (a.doctor_name || '').toLowerCase();
            const aptId = (a.id || '').toString();
            return pName.includes(q) || pPhone.includes(q) || docName.includes(q) || aptId.includes(q);
        });
    }

    if (appointments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No appointments found matching search/filter</td></tr>`;
        return;
    }

    tbody.innerHTML = appointments.map(apt => {
        let badgeClass = 'badge-pending';
        if (apt.status === 'Confirmed') badgeClass = 'badge-success';
        if (apt.status === 'Active') badgeClass = 'badge-info';
        if (apt.status === 'Completed') badgeClass = 'badge-success';
        if (apt.status === 'Cancelled') badgeClass = 'badge-danger';

        const canCancel = apt.status !== 'Cancelled' && apt.status !== 'Completed';

        return `
            <tr>
                <td><strong>#APT-${apt.id}</strong></td>
                <td>
                    <strong>${apt.patient_name || 'Patient #' + apt.patient_id}</strong>
                    ${apt.phone ? `<div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="font-size: 0.75rem;"></i> ${apt.phone}</div>` : ''}
                </td>
                <td>${apt.doctor_name}</td>
                <td>${apt.appointment_date} (${apt.appointment_time})</td>
                <td><small style="color: var(--text-secondary);">${apt.notes || 'Routine Consultation'}</small></td>
                <td><span class="badge ${badgeClass}">${apt.status}</span></td>
                <td>
                    <div style="display: flex; gap: 6px;">
                        ${apt.status !== 'Cancelled' ? `
                            <button onclick="toggleAppointmentStatus(${apt.id}, '${apt.status}')" class="btn-sm btn-outline" title="Advance State">
                                <i class="fa-solid fa-arrow-rotate-right"></i> Next State
                            </button>
                        ` : ''}
                        ${canCancel ? `
                            <button onclick="cancelAppointment(${apt.id})" class="btn-sm btn-outline" style="color: #ef4444; border-color: #fca5a5;" title="Cancel Appointment">
                                <i class="fa-solid fa-ban"></i> Cancel
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function toggleAppointmentStatus(id, currentStatus) {
    const nextStatusMap = {
        'Pending': 'Confirmed',
        'Confirmed': 'Active',
        'Active': 'Completed',
        'Completed': 'Completed',
    };

    const nextStatus = nextStatusMap[currentStatus] || 'Confirmed';
    id = parseInt(id);

    try {
        const res = await fetch('update_appointment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id, status: nextStatus })
        });
        const data = await res.json();
        if (data.status !== 'success') {
            showToast('Update failed: ' + (data.message || 'Server error'), 'error');
            return;
        }
    } catch (e) {
        showToast('Server error during status update', 'error');
        return;
    }

    showToast(`Appointment status updated to ${nextStatus}`, 'success');
    refreshAppointmentViews();
}

async function cancelAppointment(id) {
    id = parseInt(id);

    try {
        const res = await fetch('update_appointment.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id, status: 'Cancelled' })
        });
        const data = await res.json();
        if (data.status !== 'success') {
            showToast('Cancellation failed: ' + (data.message || 'Server error'), 'error');
            return;
        }
    } catch (e) {
        showToast('Server error during cancellation', 'error');
        return;
    }

    showToast(`Appointment #APT-${id} has been Cancelled`, 'info');
    refreshAppointmentViews();
}

function refreshAppointmentViews() {
    if (document.getElementById('statAppointments')) {
        fetch('get_stats.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.data) {
                    document.getElementById('statAppointments').textContent = (data.data.today_appointments || 0).toLocaleString();
                }
            })
            .catch(() => { });
    }

    if (document.getElementById('dashAppointmentTable')) {
        renderDashboardSchedule();
    }

    if (document.getElementById('appointmentTableBody')) {
        const activeFilter = document.querySelector('.filter-apt-btn.active')?.getAttribute('data-filter') || 'all';
        const searchVal = document.getElementById('appointmentSearchInput')?.value.trim().toLowerCase() || '';
        loadAppointmentsTable(activeFilter, searchVal);
    }
}

/* ==========================================================================
   BILLING PAGE LOGIC
   ========================================================================== */
function initBillingPage() {
    const billingForm = document.getElementById('billingForm');
    const searchInput = document.getElementById('billingSearchInput');

    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            loadBillingTable(e.target.value.trim().toLowerCase());
        });
    }

    if (billingForm) {
        const docFeeInput = document.getElementById('doctorFee');
        const medFeeInput = document.getElementById('medicationFee');
        const labFeeInput = document.getElementById('labFee');
        const discountInput = document.getElementById('discount');

        const calculateTotal = () => {
            const docFee = parseFloat(docFeeInput?.value) || 0;
            const medFee = parseFloat(medFeeInput?.value) || 0;
            const labFee = parseFloat(labFeeInput?.value) || 0;
            const discount = parseFloat(discountInput?.value) || 0;
            const net = Math.max(0, (docFee + medFee + labFee) - discount);

            const displayEl = document.getElementById('billTotalDisplay');
            if (displayEl) {
                displayEl.textContent = `Rs. ${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            }
        };

        [docFeeInput, medFeeInput, labFeeInput, discountInput].forEach(inp => {
            if (inp) inp.addEventListener('input', calculateTotal);
        });
        calculateTotal();

        billingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const patientId = document.getElementById('billPatient').value;
            const doctorFee = parseFloat(docFeeInput.value) || 0;
            const medicationFee = parseFloat(medFeeInput.value) || 0;
            const labFee = parseFloat(labFeeInput.value) || 0;
            const discount = parseFloat(discountInput.value) || 0;
            const paymentMethod = document.getElementById('paymentMethod').value;

            if (!patientId || patientId <= 0) {
                showToast('Please select a valid registered patient!', 'error');
                return;
            }

            const netTotal = Math.max(0, (doctorFee + medicationFee + labFee) - discount);

            try {
                const res = await fetch('add_bill.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ billPatient: patientId, doctorFee, medicationFee, labFee, discount, paymentMethod })
                });
                const data = await res.json();
                if (data.status === 'success' && data.data) {
                    showToast('Invoice Processed & Saved to Database!', 'success');
                    openInvoiceModal(data.data);
                } else {
                    showToast('Error: ' + (data.message || 'Could not process invoice'), 'error');
                    return;
                }
            } catch (err) {
                showToast('Database connection error!', 'error');
                return;
            }

            billingForm.reset();
            calculateTotal();
            const searchVal = document.getElementById('billingSearchInput')?.value.trim().toLowerCase() || '';
            loadBillingTable(searchVal);
        });
    }
}

async function loadBillingTable(searchQuery = '') {
    const tbody = document.getElementById('billingTableBody');
    if (!tbody) return;

    let bills = [];
    try {
        const res = await fetch(`get_bills.php?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.status === 'success') bills = data.data;
    } catch (e) {
        bills = [];
    }

    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        bills = bills.filter(b => {
            const pName = (b.patient_name || '').toLowerCase();
            const pPhone = (b.phone || '').toLowerCase();
            const invId = (b.id || '').toString();
            const payMethod = (b.payment_method || '').toLowerCase();
            return pName.includes(q) || pPhone.includes(q) || invId.includes(q) || payMethod.includes(q);
        });
    }

    if (bills.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No billing invoices found matching search</td></tr>`;
        return;
    }

    tbody.innerHTML = bills.map(b => {
        const docFee = parseFloat(b.doctor_fee) || 0;
        const medFee = parseFloat(b.medication_fee) || 0;
        const labFee = parseFloat(b.lab_fee) || 0;
        const netTotal = parseFloat(b.total_amount) || 0;

        const safeObj = {
            id: b.id,
            patient_id: b.patient_id,
            patient_name: b.patient_name || ('Patient #' + b.patient_id),
            created_at: b.created_at || new Date().toISOString(),
            payment_method: b.payment_method || 'Cash',
            doctor_fee: docFee,
            medication_fee: medFee,
            lab_fee: labFee,
            discount: parseFloat(b.discount) || 0,
            total_amount: netTotal
        };

        const jsonStr = JSON.stringify(safeObj).replace(/"/g, '&quot;');

        return `
            <tr>
                <td><strong>#INV-${b.id}</strong></td>
                <td>
                    <strong>${b.patient_name || 'Patient #' + b.patient_id}</strong>
                    ${b.phone ? `<div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-phone" style="font-size: 0.75rem;"></i> ${b.phone}</div>` : ''}
                </td>
                <td>Rs. ${docFee.toLocaleString()}</td>
                <td>Rs. ${medFee.toLocaleString()}</td>
                <td>Rs. ${labFee.toLocaleString()}</td>
                <td><strong style="color: var(--primary);">Rs. ${netTotal.toLocaleString()}</strong></td>
                <td><span class="badge badge-info">${b.payment_method || 'Cash'}</span></td>
                <td><span class="badge badge-success">${b.status || 'Paid'}</span></td>
                <td>
                    <button onclick="openInvoiceModalFromData(this)" data-invoice="${jsonStr}" class="btn-sm btn-outline">
                        <i class="fa-solid fa-print"></i> Receipt
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function openInvoiceModalFromData(btn) {
    const jsonStr = btn.getAttribute('data-invoice');
    if (jsonStr) {
        try {
            const data = JSON.parse(jsonStr);
            openInvoiceModal(data);
        } catch (e) {
            console.error('Error parsing invoice data', e);
        }
    }
}

function openInvoiceModal(bill) {
    const modal = document.getElementById('printableInvoiceModal');
    if (!modal) return;

    document.getElementById('invRef').textContent = `#INV-${bill.id}`;
    document.getElementById('invPatient').textContent = bill.patient_name || `Patient #${bill.patient_id}`;
    document.getElementById('invDate').textContent = bill.created_at ? bill.created_at.split(' ')[0] : new Date().toISOString().split('T')[0];
    document.getElementById('invMethod').textContent = bill.payment_method || 'Cash';

    const docFee = parseFloat(bill.doctor_fee) || 0;
    const medFee = parseFloat(bill.medication_fee) || 0;
    const labFee = parseFloat(bill.lab_fee) || 0;
    const discount = parseFloat(bill.discount) || 0;
    const grandTotal = parseFloat(bill.total_amount) || 0;

    document.getElementById('invDocFee').textContent = docFee.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('invMedFee').textContent = medFee.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('invLabFee').textContent = labFee.toLocaleString('en-US', { minimumFractionDigits: 2 });
    document.getElementById('invDiscount').textContent = `- ${discount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
    document.getElementById('invGrandTotal').textContent = `Rs. ${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    modal.classList.add('active');
}

function closeInvoiceModal() {
    const modal = document.getElementById('printableInvoiceModal');
    if (modal) modal.classList.remove('active');
}

/* ==========================================================================
   DOCTORS PAGE LOGIC
   ========================================================================== */
function initDoctorsPage() {
    const addDocForm = document.getElementById('addDoctorForm');
    if (addDocForm) {
        addDocForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('docFullName').value.trim();
            const specialty = document.getElementById('docSpecialty').value.trim();
            const qualification = document.getElementById('docQualification').value.trim();
            const phone = document.getElementById('docPhone').value.trim();
            const roomNo = document.getElementById('docRoom').value.trim();
            const status = document.getElementById('docStatus').value;

            if (!fullName || !specialty || !phone) {
                showToast('Name, Specialty, and Phone are required!', 'error');
                return;
            }

            try {
                const res = await fetch('add_doctor.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ fullName, specialty, qualification, phone, roomNo, status })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast('Doctor Specialist Added Successfully!', 'success');
                } else {
                    showToast('Error: ' + (data.message || 'Could not add doctor'), 'error');
                    return;
                }
            } catch (err) {
                showToast('Database connection error!', 'error');
                return;
            }

            closeAddDoctorModal();
            addDocForm.reset();
            loadDoctorsTable();
        });
    }
}

async function loadDoctorsTable() {
    const tbody = document.getElementById('doctorsTableBody');
    if (!tbody) return;

    let doctors = [];
    try {
        const res = await fetch('get_doctors.php');
        const data = await res.json();
        if (data.status === 'success') doctors = data.data;
    } catch (e) {
        doctors = [];
    }

    if (doctors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No doctors found in directory</td></tr>`;
        return;
    }

    tbody.innerHTML = doctors.map(doc => {
        let badgeClass = 'badge-success';
        if (doc.status === 'In Surgery') badgeClass = 'badge-pending';
        if (doc.status === 'On Leave' || doc.status === 'Off Duty') badgeClass = 'badge-danger';

        const initials = doc.full_name.replace('Dr. ', '').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

        return `
            <tr>
                <td><strong>#DOC-${doc.id}</strong></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="doc-avatar">${initials}</div>
                        <div>
                            <strong>${doc.full_name}</strong>
                        </div>
                    </div>
                </td>
                <td>
                    <div><strong>${doc.specialty}</strong></div>
                    <small style="color: var(--text-secondary);">${doc.qualification}</small>
                </td>
                <td><span class="badge badge-info"><i class="fa-solid fa-door-open"></i> ${doc.room_no}</span></td>
                <td>${doc.phone}</td>
                <td><span class="badge ${badgeClass}">${doc.status}</span></td>
                <td>
                    <button onclick="cycleDoctorStatus(${doc.id}, '${doc.status}')" class="btn-sm btn-outline" title="Change Duty Status">
                        <i class="fa-solid fa-arrows-rotate"></i> Cycle Status
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function cycleDoctorStatus(id, currentStatus) {
    const statusCycle = {
        'Available': 'In Surgery',
        'In Surgery': 'On Leave',
        'On Leave': 'Off Duty',
        'Off Duty': 'Available'
    };

    const nextStatus = statusCycle[currentStatus] || 'Available';
    id = parseInt(id);

    try {
        const res = await fetch('update_doctor_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id, status: nextStatus })
        });
        const data = await res.json();
        if (data.status !== 'success') {
            showToast('Status update failed: ' + (data.message || 'Server error'), 'error');
            return;
        }
    } catch (e) {
        showToast('Server error during status update', 'error');
        return;
    }

    showToast(`Doctor status changed to ${nextStatus}`, 'info');
    loadDoctorsTable();
}

function openAddDoctorModal() {
    const modal = document.getElementById('addDoctorModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeAddDoctorModal() {
    const modal = document.getElementById('addDoctorModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

/* ==========================================================================
   REPORTS & ANALYTICS MODULE LOGIC
   ========================================================================== */
function initReportsPage() {
    const datePicker = document.getElementById('reportDatePicker');
    const loadBtn = document.getElementById('loadReportBtn');
    const downloadFullBtn = document.getElementById('downloadFullPdfBtn');
    const downloadCurrentBtn = document.getElementById('downloadCurrentPdfBtn');

    if (!datePicker) return;

    if (!datePicker.value) {
        datePicker.value = new Date().toISOString().split('T')[0];
    }

    if (loadBtn && !loadBtn.getAttribute('data-init')) {
        loadBtn.setAttribute('data-init', 'true');
        loadBtn.addEventListener('click', fetchReports);
    }

    if (downloadFullBtn && !downloadFullBtn.getAttribute('data-init')) {
        downloadFullBtn.setAttribute('data-init', 'true');
        downloadFullBtn.addEventListener('click', () => downloadPdf('all'));
    }

    if (downloadCurrentBtn && !downloadCurrentBtn.getAttribute('data-init')) {
        downloadCurrentBtn.setAttribute('data-init', 'true');
        downloadCurrentBtn.addEventListener('click', () => downloadPdf(currentReportSec));
    }

    const reportTabs = document.querySelectorAll('.report-tab');
    reportTabs.forEach(tab => {
        if (!tab.getAttribute('data-init')) {
            tab.setAttribute('data-init', 'true');
            tab.addEventListener('click', (e) => {
                reportTabs.forEach(t => t.classList.remove('active'));
                const btn = e.currentTarget;
                btn.classList.add('active');
                currentReportSec = btn.getAttribute('data-sec');
                renderReportTable(currentReportSec);
            });
        }
    });

    if (!reportData) {
        fetchReports();
    }
}

async function fetchReports() {
    const datePicker = document.getElementById('reportDatePicker');
    const dateVal = datePicker ? datePicker.value : new Date().toISOString().split('T')[0];

    try {
        const res = await fetch(`get_reports.php?date=${encodeURIComponent(dateVal)}`);
        const data = await res.json();
        if (data.status === 'success' && data.data) {
            reportData = data.data;
        } else {
            throw new Error();
        }
    } catch (e) {
        reportData = null;
        showToast('Could not load report data. Please check the database connection.', 'error');
        return;
    }

    updateReportSummaryKPIs();
    renderReportTable(currentReportSec);
    showToast(`Loaded reports for ${dateVal}`, 'success', 2000);
}

function updateReportSummaryKPIs() {
    if (!reportData || !reportData.summary) return;

    const s = reportData.summary;
    const patEl = document.getElementById('reportKpiPatients');
    const aptEl = document.getElementById('reportKpiAppointments');
    const revEl = document.getElementById('reportKpiRevenue');
    const billEl = document.getElementById('reportKpiBills');

    if (patEl) patEl.textContent = (s.patients || 0).toLocaleString();
    if (aptEl) aptEl.textContent = (s.appointments || 0).toLocaleString();
    if (revEl) revEl.textContent = 'Rs. ' + parseFloat(s.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
    if (billEl) billEl.textContent = (s.bills || 0).toLocaleString();
}

function renderReportTable(section) {
    const titleEl = document.getElementById('reportSectionTitle');
    const thead = document.getElementById('reportTableHead');
    const tbody = document.getElementById('reportTableBody');
    const totBox = document.getElementById('reportSummaryBox');
    const totVal = document.getElementById('reportSummaryTotalVal');

    if (!tbody || !reportData) return;

    if (totBox) totBox.style.display = 'none';

    if (section === 'allBills') {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-database"></i> All Billing Records (Database Total)`;
        if (thead) thead.innerHTML = `
            <tr>
                <th>Invoice</th><th>Patient Name</th><th>Consult Fee</th>
                <th>Pharmacy</th><th>Lab Fee</th><th>Discount</th>
                <th>Net Total</th><th>Payment</th><th>Date</th>
            </tr>`;
        const list = reportData.all_bills || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 24px;">No billing records found</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(b => `
            <tr>
                <td><strong>#INV-${b.id}</strong></td>
                <td><strong>${b.patient_name || 'N/A'}</strong></td>
                <td>Rs. ${parseFloat(b.doctor_fee || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(b.medication_fee || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(b.lab_fee || 0).toLocaleString()}</td>
                <td>Rs. ${parseFloat(b.discount || 0).toLocaleString()}</td>
                <td><strong style="color: var(--primary);">Rs. ${parseFloat(b.total_amount || 0).toLocaleString()}</strong></td>
                <td><span class="badge badge-info">${b.payment_method || 'Cash'}</span></td>
                <td><small style="color: var(--text-muted);">${(b.created_at || '').split(' ')[0]}</small></td>
            </tr>`).join('');
    } else if (section === 'dailyPatients') {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-users"></i> Patient Registrations on Selected Date`;
        if (thead) thead.innerHTML = `
            <tr>
                <th>ID</th><th>Full Name</th><th>Age & Gender</th>
                <th>Blood</th><th>Phone</th><th>Address</th><th>Registered At</th>
            </tr>`;
        const list = reportData.patients || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No patient registrations recorded on this date</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(p => `
            <tr>
                <td><strong>#P-${p.id}</strong></td>
                <td><strong>${p.full_name}</strong></td>
                <td>${p.age} yrs (${p.gender})</td>
                <td><span class="badge badge-info">${p.blood_group || '—'}</span></td>
                <td>${p.phone}</td>
                <td>${p.address || '—'}</td>
                <td><small style="color: var(--text-muted);">${(p.created_at || '').replace('T', ' ').substring(0, 16)}</small></td>
            </tr>`).join('');
    } else if (section === 'dailyAppointments') {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-calendar-day"></i> Appointment Register on Selected Date`;
        if (thead) thead.innerHTML = `
            <tr>
                <th>Ref ID</th><th>Patient Name</th><th>Assigned Doctor</th>
                <th>Scheduled Date</th><th>Time</th><th>Status</th><th>Notes</th>
            </tr>`;
        const list = reportData.appointments || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No appointments scheduled for this date</td></tr>`;
            return;
        }
        tbody.innerHTML = list.map(a => {
            let bClass = 'badge-pending';
            if (a.status === 'Confirmed' || a.status === 'Completed') bClass = 'badge-success';
            if (a.status === 'Active') bClass = 'badge-info';
            if (a.status === 'Cancelled') bClass = 'badge-danger';
            return `
                <tr>
                    <td><strong>#APT-${a.id}</strong></td>
                    <td><strong>${a.patient_name || 'N/A'}</strong></td>
                    <td>${a.doctor_name || '—'}</td>
                    <td>${a.appointment_date}</td>
                    <td>${a.appointment_time || '—'}</td>
                    <td><span class="badge ${bClass}">${a.status}</span></td>
                    <td><small style="color: var(--text-secondary);">${a.notes || 'Routine Consultation'}</small></td>
                </tr>`;
        }).join('');
    } else if (section === 'dailyRevenue') {
        if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-sack-dollar"></i> Daily Revenue Invoices on Selected Date`;
        if (thead) thead.innerHTML = `
            <tr>
                <th>Invoice</th><th>Patient Name</th><th>Consult Fee</th>
                <th>Pharmacy</th><th>Lab Fee</th><th>Discount</th>
                <th>Net Total</th><th>Method</th>
            </tr>`;
        const list = reportData.bills || [];
        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No revenue bills generated on this date</td></tr>`;
            return;
        }
        let grand = 0;
        tbody.innerHTML = list.map(b => {
            const net = parseFloat(b.total_amount || 0);
            grand += net;
            return `
                <tr>
                    <td><strong>#INV-${b.id}</strong></td>
                    <td><strong>${b.patient_name || 'N/A'}</strong></td>
                    <td>Rs. ${parseFloat(b.doctor_fee || 0).toLocaleString()}</td>
                    <td>Rs. ${parseFloat(b.medication_fee || 0).toLocaleString()}</td>
                    <td>Rs. ${parseFloat(b.lab_fee || 0).toLocaleString()}</td>
                    <td>Rs. ${parseFloat(b.discount || 0).toLocaleString()}</td>
                    <td><strong style="color: var(--primary);">Rs. ${net.toLocaleString()}</strong></td>
                    <td><span class="badge badge-info">${b.payment_method || 'Cash'}</span></td>
                </tr>`;
        }).join('');

        if (totBox && totVal) {
            totBox.style.display = 'flex';
            totVal.textContent = 'Rs. ' + grand.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }
}

/* ==========================================================================
   PDF GENERATION ENGINE
   ========================================================================== */
function downloadPdf(section) {
    if (!reportData && section !== 'all') {
        showToast('No data loaded yet. Click "Load Report Data" first.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const datePicker = document.getElementById('reportDatePicker');
    const date = (datePicker && datePicker.value) ? datePicker.value : new Date().toISOString().split('T')[0];
    const clinicName = 'MASTER HEALTHCARE (PVT) LTD';

    function addHeader(title, pageDate) {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 297, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13); doc.setFont(undefined, 'bold');
        doc.text(clinicName, 14, 10);
        doc.setFontSize(9); doc.setFont(undefined, 'normal');
        doc.text('Super Clinic & Diagnostic Center | No 124, Healthcare Blvd, Colombo 03', 14, 16);
        doc.setFontSize(10); doc.setFont(undefined, 'bold');
        doc.text(title, 297 - 14, 10, { align: 'right' });
        doc.setFontSize(8); doc.setFont(undefined, 'normal');
        doc.text('Date: ' + pageDate, 297 - 14, 16, { align: 'right' });
        doc.setTextColor(0, 0, 0);
    }

    function addSummaryBox(y) {
        const s = reportData.summary || { patients: 0, appointments: 0, revenue: 0, bills: 0 };
        const items = [
            ['New Patients', s.patients],
            ['Appointments', s.appointments],
            ['Total Revenue', 'Rs. ' + parseFloat(s.revenue || 0).toLocaleString()],
            ['Invoices', s.bills]
        ];
        doc.setFillColor(239, 246, 255);
        doc.roundedRect(14, y, 269, 18, 3, 3, 'F');
        items.forEach((item, i) => {
            const x = 14 + i * 67 + 10;
            doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont(undefined, 'normal');
            doc.text(item[0], x, y + 7);
            doc.setFontSize(11); doc.setTextColor(15, 23, 42); doc.setFont(undefined, 'bold');
            doc.text(String(item[1]), x, y + 14);
        });
        doc.setTextColor(0, 0, 0);
        return y + 22;
    }

    let pageCount = 0;

    function addPage(title) {
        if (pageCount > 0) doc.addPage();
        addHeader(title, date);
        pageCount++;
        return addSummaryBox(26);
    }

    if (section === 'all' || section === 'allBills') {
        const startY = addPage('All Billing Records');
        const bills = reportData.all_bills || [];
        if (bills.length > 0) {
            doc.autoTable({
                startY,
                head: [['Invoice', 'Patient', 'Consult (Rs.)', 'Pharmacy (Rs.)', 'Lab (Rs.)', 'Discount (Rs.)', 'Total (Rs.)', 'Payment', 'Date']],
                body: bills.map(b => [
                    '#INV-' + b.id,
                    b.patient_name || 'N/A',
                    parseFloat(b.doctor_fee || 0).toLocaleString(),
                    parseFloat(b.medication_fee || 0).toLocaleString(),
                    parseFloat(b.lab_fee || 0).toLocaleString(),
                    parseFloat(b.discount || 0).toLocaleString(),
                    'Rs. ' + parseFloat(b.total_amount || 0).toLocaleString(),
                    b.payment_method || 'Cash',
                    (b.created_at || '').split(' ')[0]
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 14, right: 14 }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(148, 163, 184);
            doc.text('No billing records found.', 14, startY + 10);
        }
    }

    if (section === 'all' || section === 'dailyPatients') {
        const startY = addPage('Daily Patient Registrations — ' + date);
        const patients = reportData.patients || [];
        if (patients.length > 0) {
            doc.autoTable({
                startY,
                head: [['Patient ID', 'Full Name', 'Age', 'Gender', 'Blood Group', 'Phone', 'Address', 'Registered At']],
                body: patients.map(p => [
                    '#P-' + p.id, p.full_name, p.age + ' yrs', p.gender,
                    p.blood_group || '—', p.phone, p.address || '—',
                    (p.created_at || '').replace('T', ' ').substring(0, 16)
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [240, 253, 244] },
                margin: { left: 14, right: 14 }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(148, 163, 184);
            doc.text('No patient registrations for this date.', 14, startY + 10);
        }
    }

    if (section === 'all' || section === 'dailyAppointments') {
        const startY = addPage('Daily Appointment Register — ' + date);
        const apts = reportData.appointments || [];
        if (apts.length > 0) {
            doc.autoTable({
                startY,
                head: [['Ref ID', 'Patient Name', 'Doctor', 'Date', 'Time', 'Status', 'Notes']],
                body: apts.map(a => [
                    '#APT-' + a.id, a.patient_name || 'N/A', a.doctor_name || '—',
                    a.appointment_date, a.appointment_time || '—', a.status,
                    a.notes || 'Routine Consultation'
                ]),
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [139, 92, 246], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [245, 243, 255] },
                margin: { left: 14, right: 14 }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(148, 163, 184);
            doc.text('No appointments scheduled for this date.', 14, startY + 10);
        }
    }

    if (section === 'all' || section === 'dailyRevenue') {
        const startY = addPage('Daily Revenue Summary — ' + date);
        const bills = reportData.bills || [];
        if (bills.length > 0) {
            let grand = 0;
            const rows = bills.map(b => {
                const net = parseFloat(b.total_amount || 0);
                grand += net;
                return [
                    '#INV-' + b.id, b.patient_name || 'N/A',
                    'Rs. ' + parseFloat(b.doctor_fee || 0).toLocaleString(),
                    'Rs. ' + parseFloat(b.medication_fee || 0).toLocaleString(),
                    'Rs. ' + parseFloat(b.lab_fee || 0).toLocaleString(),
                    '- Rs. ' + parseFloat(b.discount || 0).toLocaleString(),
                    'Rs. ' + net.toLocaleString(),
                    b.payment_method || 'Cash'
                ];
            });
            rows.push(['', 'GRAND TOTAL', '', '', '', '', 'Rs. ' + grand.toLocaleString('en-US', { minimumFractionDigits: 2 }), '']);

            doc.autoTable({
                startY,
                head: [['Invoice', 'Patient', 'Consult', 'Pharmacy', 'Lab', 'Discount', 'Net Total', 'Method']],
                body: rows,
                styles: { fontSize: 8, cellPadding: 3 },
                headStyles: { fillColor: [245, 158, 11], textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [255, 251, 235] },
                bodyStyles: { textColor: [15, 23, 42] },
                didParseCell: (data) => {
                    if (data.row.index === rows.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [146, 64, 14];
                    }
                },
                margin: { left: 14, right: 14 }
            });
        } else {
            doc.setFontSize(10); doc.setTextColor(148, 163, 184);
            doc.text('No revenue recorded for this date.', 14, startY + 10);
        }
    }

    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7); doc.setTextColor(148, 163, 184);
        doc.text('MASTER Healthcare (Pvt) Ltd — Confidential Medical Report', 14, 207);
        doc.text(`Page ${i} of ${totalPages} | Generated: ${new Date().toLocaleString()}`, 297 - 14, 207, { align: 'right' });
    }

    const fileName = section === 'all'
        ? `MASTER-full-report-${date}.pdf`
        : `MASTER-${section}-${date}.pdf`;

    doc.save(fileName);
    showToast('PDF downloaded: ' + fileName, 'success');
}