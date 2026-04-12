const url = require('url');
const { connectDB, hasMongoURI } = require('../../../db');
const { Team } = require('../../../models');
const { seedTeamsIfEmpty } = require('../../../utils');

function getTeamIdFromRequest(req) {
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

    const { player } = req.body;
    if (!player || typeof player !== 'object') {
      return res.status(400).send('Oyuncu verisi gerekli');
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
