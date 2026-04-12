const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function getTeamIdFromRequest(req) {
  if (req.body && req.body.teamId) {
    return req.body.teamId;
  }
  if (req.query && req.query.id) {
    return req.query.id;
  }
  const parsed = url.parse(req.url || '', true);
  if (!parsed.pathname) return null;
  const segments = parsed.pathname.split('/').filter(Boolean);
  const playersIndex = segments.indexOf('players');
  if (playersIndex > 0) {
    return segments[playersIndex - 1];
  }
  return null;
}

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedTeamsIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const id = getTeamIdFromRequest(req);
    if (!id) {
      return res.status(400).send('Takım idsi eksik');
    }

    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
    }

    let { player } = req.body;
    if (typeof player === 'string') {
        player = JSON.parse(player);
    }
    if (!player || typeof player !== 'object') {
      return res.status(400).send('Oyuncu verisi gerekli');
    }

    // Handle photo upload
    if (req.files && req.files.photo) {
      const photo = req.files.photo;
      const uploadDir = path.join(process.cwd(), 'img/oyuncular/takımlar', team.name);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate filename
      const ext = path.extname(photo.name);
      const filename = `${player.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Process and save image
      await sharp(photo.data)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      player.photo = `/img/oyuncular/takımlar/${team.name}/${filename}`;
    }

    team.players = Array.isArray(team.players) ? team.players : [];
    team.players.push(player);
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
