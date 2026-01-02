const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;
const dbPath = path.resolve(__dirname, 'complaints.db');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'final_enterprise_cms_2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));

const db = new sqlite3.Database(dbPath, (err) => {
    db.serialize(() => {
        db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)`);
        db.run(`CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            user_id INTEGER, 
            name TEXT, 
            email TEXT, 
            description TEXT, 
            status TEXT DEFAULT 'Pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
        const adminHash = bcrypt.hashSync('admin', 10);
        db.run(`INSERT OR IGNORE INTO admins (username, password) VALUES ('admin', ?)`, [adminHash]);
    });
});

// AUTH
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    const hash = bcrypt.hashSync(password, 10);
    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hash], (err) => {
        if (err) return res.status(400).json({ error: "Exists" });
        res.json({ success: true });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    const table = role === 'admin' ? 'admins' : 'users';
    db.get(`SELECT * FROM ${table} WHERE username = ?`, [username], (err, row) => {
        if (row && bcrypt.compareSync(password, row.password)) {
            req.session.role = role; req.session.userId = row.id;
            return res.json({ success: true, role });
        }
        res.status(401).json({ error: "Invalid" });
    });
});

app.get('/api/session', (req, res) => res.json({ role: req.session.role || null }));
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

// TICKETS
app.post('/api/complaints', (req, res) => {
    if (req.session.role !== 'user') return res.status(401).json({ error: "Unauthorized" });
    const { name, email, description } = req.body;
    db.run(`INSERT INTO complaints (user_id, name, email, description) VALUES (?, ?, ?, ?)`, 
        [req.session.userId, name, email, description], () => res.json({ success: true }));
});

app.get('/api/my-complaints', (req, res) => {
    if (req.session.role !== 'user') return res.status(401).json({ error: "Unauthorized" });
    db.all("SELECT *, date(created_at) as date_only FROM complaints WHERE user_id = ? ORDER BY id DESC", [req.session.userId], (err, rows) => {
        res.json({ data: rows || [] });
    });
});

app.get('/api/admin/complaints', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    db.all("SELECT *, date(created_at) as date_only FROM complaints ORDER BY id DESC", (err, rows) => {
        res.json({ data: rows || [] });
    });
});

app.put('/api/complaints/:id', (req, res) => {
    if (req.session.role !== 'admin') return res.status(403).json({ error: "Forbidden" });
    db.run(`UPDATE complaints SET status = 'Completed' WHERE id = ?`, [req.params.id], () => res.json({ success: true }));
});

// DELETE ROUTE
app.delete('/api/complaints/:id', (req, res) => {
    const { role, userId } = req.session;
    if (!role) return res.status(401).json({ error: "Unauthorized" });

    let query = "DELETE FROM complaints WHERE id = ?";
    let params = [req.params.id];

    if (role === 'user') {
        query += " AND user_id = ?";
        params.push(userId);
    }

    db.run(query, params, function(err) {
        if (this.changes === 0) return res.status(404).json({ error: "Not found" });
        res.json({ success: true });
    });
});

app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));