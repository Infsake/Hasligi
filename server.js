const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fileupload = require('express-fileupload');
const sharp = require('sharp');
const bcrypt = require('bcrypt');
require('dotenv').config();
const { connectDB } = require('./api/db');
const { Admin } = require('./api/models');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(fileupload());
app.use(express.static(path.join(__dirname)));

const readData = (file) => new Promise((resolve, reject) => {
  fs.readFile(path.join(__dirname, file), 'utf8', (err, data) => {
    if (err) reject(err);
    else resolve(JSON.parse(data));
  });
});

const writeData = (file, data) => new Promise((resolve, reject) => {
  fs.writeFile(path.join(__dirname, file), JSON.stringify(data, null, 2), (err) => {
    if (err) reject(err);
    else resolve();
  });
});

app.get('/api/teams', async (req, res) => {
  try {
    const teams = await readData('teams.json');
    res.json(teams);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/teams', async (req, res) => {
  try {
    const teams = await readData('teams.json');
    const { name, logo, founded, players } = req.body;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newTeam = {
      id,
      name,
      logo,
      founded,
      ranking: teams.length + 1,
      players,
      matches: []
    };
    teams.push(newTeam);
    await writeData('teams.json', teams);
    res.json(newTeam);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/api/teams/:id/players', async (req, res) => {
  try {
    const teams = await readData('teams.json');
    const team = teams.find((t) => t.id === req.params.id);
    if (!team) return res.status(404).send('Takım bulunamadı');
    const player = req.body.player;
    if (!Array.isArray(team.players)) {
      team.players = [];
    }
    team.players.push(player);

    // Handle photo upload
    if (req.files && req.files.photo) {
      const photo = req.files.photo;
      const teamDir = path.join(__dirname, 'img', 'oyuncular', 'takımlar', team.name);
      if (!fs.existsSync(teamDir)) {
        fs.mkdirSync(teamDir, { recursive: true });
      }
      const photoPath = path.join(teamDir, `${player.number}.jpg`);
      await sharp(photo.data)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toFile(photoPath);
      player.photo = `img/oyuncular/takımlar/${team.name}/${player.number}.jpg`;
    }

    await writeData('teams.json', teams);
    res.json(team);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/api/teams/:id/players/:index', async (req, res) => {
  try {
    const teams = await readData('teams.json');
    const team = teams.find((t) => t.id === req.params.id);
    if (!team) return res.status(404).send('Takım bulunamadı');
    const playerIndex = parseInt(req.params.index);
    if (playerIndex < 0 || playerIndex >= team.players.length) {
      return res.status(404).send('Oyuncu bulunamadı');
    }
    const updatedPlayer = req.body;

    // Handle photo upload
    if (req.files && req.files.photo) {
      const photo = req.files.photo;
      const teamDir = path.join(__dirname, 'img', 'oyuncular', 'takımlar', team.name);
      if (!fs.existsSync(teamDir)) {
        fs.mkdirSync(teamDir, { recursive: true });
      }
      const photoPath = path.join(teamDir, `${updatedPlayer.number}.jpg`);
      await sharp(photo.data)
        .resize(200, 200, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 80 })
        .toFile(photoPath);
      updatedPlayer.photo = `img/oyuncular/takımlar/${team.name}/${updatedPlayer.number}.jpg`;
    }

    team.players[playerIndex] = updatedPlayer;
    await writeData('teams.json', teams);
    res.json(team);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/api/update-player', async (req, res) => {
  try {
    const teams = await readData('teams.json');
    const { teamId, playerIndex, player } = req.body;
    if (!teamId || typeof playerIndex === 'undefined' || !player) {
      return res.status(400).send('teamId, playerIndex ve player gereklidir');
    }

    const team = teams.find((t) => t.id === teamId);
    if (!team) return res.status(404).send('Takım bulunamadı');

    const index = parseInt(playerIndex, 10);
    if (Number.isNaN(index) || index < 0 || index >= team.players.length) {
      return res.status(404).send('Oyuncu bulunamadı');
    }

    team.players[index] = player;
    await writeData('teams.json', teams);
    res.json(team);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/api/matches', async (req, res) => {
  try {
    const matches = await readData('matches.json');
    res.json(matches);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/api/matches', async (req, res) => {
  try {
    const matches = await readData('matches.json');
    const { home, away, date, time, place, link } = req.body;
    const newMatch = {
      id: `match${matches.length + 1}`,
      home,
      away,
      date,
      time,
      place,
      link: link || null,
      status: 'future',
      score: null
    };
    matches.push(newMatch);
    await writeData('matches.json', matches);
    res.json(newMatch);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/api/matches/:id', async (req, res) => {
  try {
    const matches = await readData('matches.json');
    const match = matches.find((m) => m.id === req.params.id);
    if (!match) return res.status(404).send('Match not found');
    const { score, link, goals } = req.body;
    match.score = score;
    match.link = link || match.link || null;
    match.goals = goals || [];
    match.status = 'past';
    await writeData('matches.json', matches);
    res.json(match);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/league', (req, res) => {
  res.sendFile(path.join(__dirname, 'league.html'));
});

app.get('/players', (req, res) => {
  res.sendFile(path.join(__dirname, 'players.html'));
});

app.get('/team/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'team.html'));
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, 'player.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin login endpoint
app.post('/api/admin/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Şifre gereklidir' });
    }

    // Try MongoDB first
    try {
      await connectDB();
      const admin = await Admin.findOne({ username: 'admin' });
      if (admin && await bcrypt.compare(password, admin.password)) {
        return res.json({ success: true });
      }
    } catch (dbError) {
      console.log('MongoDB not available, using fallback');
    }

    // Fallback to hardcoded password if DB not available
    const ADMIN_PASSWORD = '!HL!qy_yp&!2026i';
    if (password === ADMIN_PASSWORD) {
      return res.json({ success: true });
    }

    res.status(401).json({ error: 'Yanlış şifre' });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});