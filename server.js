const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- 1. THE MISSING PIECE: THE HOME PAGE ---
app.get('/', (req, res) => {
    res.send(`
        <h1 style="color:green; font-family:sans-serif; text-align:center; margin-top:50px;">
            ✅ CricBeat Server is ONLINE!
        </h1>
        <p style="text-align:center;">
            Go to <a href="/admin">/admin</a> to control the score.
        </p>
    `);
});

// --- DATABASE ---
let matches = {
    'm1': {
        id: 'm1',
        title: "IND vs AUS (2nd T20I)",
        type: 'live',
        teamA: { name: "IND", score: 0, wickets: 0, overs: 0, ball: 0 },
        teamB: { name: "AUS", score: 0, wickets: 0, overs: 0, ball: 0 },
        info: "Match Started. Pitch looking dry.",
        battingTeam: 'A',
        market: { back: "90", lay: "92" },
        session: { label: "6 Over", open: "45", current: "48" },
        commentary: "Waiting for first ball..."
    }
};

// --- API ENDPOINTS ---
app.get('/api/matches', (req, res) => res.json(matches));

app.post('/api/admin/update', (req, res) => {
    const { password, matchId, type, value } = req.body;
    if (password !== "cricpulse_secret") return res.status(403).json({ error: "Auth Failed" });
    
    const match = matches[matchId];
    if (!match) return res.status(404).json({ error: "Match not found" });

    let team = match.battingTeam === 'A' ? match.teamA : match.teamB;

    // Update Logic
    if (type === 'RUNS') {
        team.score += parseInt(value);
        match.commentary = `${value} Runs!`;
        incrementBall(team);
    } else if (type === 'WICKET') {
        team.wickets += 1;
        match.commentary = "WICKET! Gone.";
        incrementBall(team);
    } else if (type === 'WIDE' || type === 'NOBALL') {
        team.score += 1;
        match.commentary = type === 'WIDE' ? "Wide Ball" : "No Ball";
    } else if (type === 'MARKET') {
        match.market = value; 
    } else if (type === 'SESSION') {
        match.session = value; 
    } else if (type === 'SWITCH') {
        match.battingTeam = match.battingTeam === 'A' ? 'B' : 'A';
        match.commentary = "Innings Break";
    }

    io.emit('matchUpdate', match); 
    res.json({ success: true, match });
});

function incrementBall(team) {
    team.ball += 1;
    if (team.ball === 6) { team.ball = 0; team.overs += 1; }
}

// Serve Admin Panel
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Connection
io.on('connection', (socket) => {
    console.log('User Connected');
    socket.emit('matchesUpdate', matches);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
