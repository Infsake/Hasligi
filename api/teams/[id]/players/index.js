const connectDB = require('../../../db');
const { Team } = require('../../../models');

module.exports = async (req, res) => {
  try {
    await connectDB();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { id } = req.query;
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
