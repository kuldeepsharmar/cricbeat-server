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

// --- DATA ---
let matches = {
    'm1': { id: 'm1', title: "IND vs AUS", teamA: {name:"IND", score:0, wickets:0, overs:0, ball:0}, teamB: {name:"AUS", score:0, wickets:0, overs:0, ball:0}, battingTeam: 'A', commentary: "Live" }
};

// --- API ---
app.get('/api/matches', (req, res) => res.json(matches));
app.post('/api/admin/update', (req, res) => {
    const { password, matchId, type, value } = req.body;
    if (password !== "cric123") return res.status(403).json({error:"Wrong Pass"});
    const match = matches[matchId];
    let team = match.battingTeam === 'A' ? match.teamA : match.teamB;
    if(type==='RUNS') { team.score += parseInt(value); match.commentary = value + " Runs"; }
    if(type==='WICKET') { team.wickets += 1; match.commentary = "Wicket!"; }
    team.ball++; if(team.ball===6){team.ball=0; team.overs++;}
    io.emit('matchUpdate', match);
    res.json({success:true});
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
io.on('connection', (socket) => socket.emit('matchesUpdate', matches));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server on ${PORT}`));