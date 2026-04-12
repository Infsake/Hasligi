const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

function getTeamAndIndexFromRequest(req) {
  const result = { id: null, index: null };
  if (req.body) {
    if (req.body.teamId) result.id = req.body.teamId;
    if (typeof req.body.playerIndex !== 'undefined') result.index = req.body.playerIndex;
  }
  if (req.query) {
    if (!result.id && req.query.id) result.id = req.query.id;
    if (typeof result.index === 'undefined' && typeof req.query.index !== 'undefined') result.index = req.query.index;
  }

  const parsed = url.parse(req.url || '', true);
  if (parsed.pathname) {
    const segments = parsed.pathname.split('/').filter(Boolean);
    const playersIndex = segments.indexOf('players');
    if (playersIndex > 0) {
      if (!result.id) result.id = segments[playersIndex - 1];
      if (typeof result.index === 'undefined' && segments.length > playersIndex + 1) {
        result.index = segments[playersIndex + 1];
      }
    }
  }

  return result;
}

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedTeamsIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { id, index } = getTeamAndIndexFromRequest(req);
    if (!id) {
      return res.status(400).send('Takım idsi eksik');
    }
    const playerIndex = parseInt(index, 10);
    if (Number.isNaN(playerIndex)) {
      return res.status(400).send('Geçersiz oyuncu indeksi');
    }

    const team = await Team.findOne({ id });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
    }

    if (!Array.isArray(team.players) || playerIndex < 0 || playerIndex >= team.players.length) {
      return res.status(404).send('Oyuncu bulunamadı');
    }

    let updatedPlayer = req.body.player || req.body;
    if (typeof updatedPlayer === 'string') {
        updatedPlayer = JSON.parse(updatedPlayer);
    }
    if (!updatedPlayer || typeof updatedPlayer !== 'object' || Array.isArray(updatedPlayer)) {
      return res.status(400).send('Oyuncu verisi gerekli');
    }

    // Handle photo upload
    if (updatedPlayer.photoBase64) {
      const base64Data = updatedPlayer.photoBase64.split(',')[1]; // Remove data:image/jpeg;base64,
      const buffer = Buffer.from(base64Data, 'base64');
      
      const uploadDir = path.join(__dirname, '../../../img/oyuncular/takımlar', team.name);
      
      // Ensure directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate filename
      const ext = '.jpg'; // Since we convert to JPEG
      const filename = `${updatedPlayer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}${ext}`;
      const filepath = path.join(uploadDir, filename);

      // Process and save image
      await sharp(buffer)
        .resize(300, 300, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(filepath);

      updatedPlayer.photo = `/img/oyuncular/takımlar/${team.name}/${filename}`;
      delete updatedPlayer.photoBase64; // Remove base64 from player data
    }

    team.players[playerIndex] = updatedPlayer;
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
