const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');

function getTeamAndIndexFromRequest(req) {
  const result = { id: null, index: null };
  if (req.query) {
    if (req.query.id) result.id = req.query.id;
    if (typeof req.query.index !== 'undefined') result.index = req.query.index;
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

    const updatedPlayer = req.body;
    if (!updatedPlayer || typeof updatedPlayer !== 'object') {
      return res.status(400).send('Oyuncu verisi gerekli');
    }

    team.players[playerIndex] = updatedPlayer;
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
