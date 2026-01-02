const authModal = new bootstrap.Modal(document.getElementById('authModal'));
let mode = 'login';

function showToast() {
    const t = document.getElementById('customAlert');
    t.classList.remove('hidden');
    setTimeout(() => t.classList.add('hidden'), 3000);
}

function openAuth(role) {
    document.getElementById('authRole').value = role;
    document.getElementById('authTitle').innerText = role === 'admin' ? 'Admin Access' : 'User Access';
    document.getElementById('authTabs').style.display = role === 'admin' ? 'none' : 'block';
    setMode('login');
    authModal.show();
}

function setMode(m) {
    mode = m;
    document.getElementById('authBtn').innerText = mode === 'login' ? 'Sign In' : 'Sign Up';
}

function toggleHistory() {
    const c = document.getElementById('historyContainer');
    c.classList.toggle('hidden');
    if (!c.classList.contains('hidden')) loadUserHistory();
}

async function checkSession() {
    const res = await fetch('/api/session');
    const { role } = await res.json();
    document.getElementById('selectionScreen').classList.toggle('hidden', role !== null);
    document.getElementById('userSection').classList.toggle('hidden', role !== 'user');
    document.getElementById('adminSection').classList.toggle('hidden', role !== 'admin');
    document.getElementById('logoutBtn').classList.toggle('hidden', role === null);
    if (role === 'admin') loadAdminData();
    if (role === 'user') loadUserHistory();
}

document.getElementById('authForm').onsubmit = async (e) => {
    e.preventDefault();
    const role = document.getElementById('authRole').value;
    const url = mode === 'login' ? '/api/login' : '/api/register';
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authUser.value, password: authPass.value, role })
    });
    if (res.ok) {
        if (mode === 'reg') { alert("Account Created!"); setMode('login'); }
        else { authModal.hide(); checkSession(); }
    } else { alert("Error checking credentials"); }
};

document.getElementById('complaintForm').onsubmit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName.value, email: cEmail.value, description: cDesc.value })
    });
    if (res.ok) { e.target.reset(); showToast(); loadUserHistory(); }
};

async function loadUserHistory() {
    const res = await fetch('/api/my-complaints');
    const { data } = await res.json();
    document.getElementById('userHistoryTable').innerHTML = data.map(i => `
        <tr>
            <td><small>${i.date_only}</small></td>
            <td>${i.description}</td>
            <td><span class="badge ${i.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${i.status}</span></td>
            <td>
                <button class="btn-delete" onclick="deleteItem(${i.id}, 'user')" title="Delete Complaint">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        </tr>
    `).join('') || '<tr><td colspan="4" class="text-center text-muted">No history found.</td></tr>';
}

async function loadAdminData() {
    const res = await fetch('/api/admin/complaints');
    const { data } = await res.json();
    document.getElementById('adminTable').innerHTML = data.map(i => `
        <tr>
            <td><small>${i.date_only}</small></td>
            <td><strong>${i.name}</strong></td>
            <td>${i.description}</td>
            <td><span class="badge ${i.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${i.status}</span></td>
            <td>
                <button class="btn btn-sm btn-success me-1" onclick="update(${i.id})" ${i.status === 'Completed' ? 'disabled' : ''}>
                    <i class="fas fa-check"></i> Solve
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${i.id}, 'admin')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function deleteItem(id, role) {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    const res = await fetch(`/api/complaints/${id}`, { method: 'DELETE' });
    if (res.ok) {
        showToast();
        role === 'admin' ? loadAdminData() : loadUserHistory();
    }
}

async function update(id) { 
    await fetch(`/api/complaints/${id}`, { method: 'PUT' }); 
    showToast();
    loadAdminData(); 
}

async function logout() { await fetch('/api/logout', { method: 'POST' }); window.location.reload(); }
checkSession();