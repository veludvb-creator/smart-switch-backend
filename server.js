const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Setup
const db = new sqlite3.Database('./smart_switch.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);
    }
});

// State of the switches
let switchState = {
    switch1: false,
    switch2: false
};

// API: Get current state
app.get('/api/status', (req, res) => {
    res.json(switchState);
});

// API: Toggle a switch
app.post('/api/toggle', (req, res) => {
    const { id } = req.body; // Expecting { "id": 1 } or { "id": 2 }

    if (id === 1) {
        switchState.switch1 = !switchState.switch1;
        logAction('Switch 1', switchState.switch1);
    } else if (id === 2) {
        switchState.switch2 = !switchState.switch2;
        logAction('Switch 2', switchState.switch2);
    } else {
        return res.status(400).json({ error: "Invalid Switch ID" });
    }

    res.json({ state: switchState, message: `Success` });
});

function logAction(switchName, isOn) {
    const action = `${switchName} turned ${isOn ? 'ON' : 'OFF'}`;
    db.run(`INSERT INTO logs (action) VALUES (?)`, [action], function (err) {
        if (err) console.error(err.message);
        else console.log(action);
    });
}

// API: Get History
app.get('/api/history', (req, res) => {
    db.all("SELECT * FROM logs ORDER BY timestamp DESC LIMIT 10", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ history: rows });
    });
});

// API: Get Firmware Version
app.get('/api/firmware/version', (req, res) => {
    const versionPath = path.join(__dirname, 'public', 'firmware', 'version.json');
    fs.readFile(versionPath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading version file:', err);
            return res.json({ version: 0 });
        }
        try {
            const versionData = JSON.parse(data);
            res.json(versionData);
        } catch (e) {
            console.error('Error parsing version file:', e);
            res.json({ version: 0 });
        }
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
