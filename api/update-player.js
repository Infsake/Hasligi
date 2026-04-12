const connectDB = require('./db');
const { Team } = require('./models');
const { seedTeamsIfEmpty } = require('./utils');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedTeamsIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { teamId, playerIndex, player } = req.body;
    if (!teamId || typeof playerIndex === 'undefined' || !player) {
      return res.status(400).send('teamId, playerIndex ve player gereklidir');
    }

    const index = parseInt(playerIndex, 10);
    if (Number.isNaN(index)) {
      return res.status(400).send('Geçersiz oyuncu indeksi');
    }

    const team = await Team.findOne({ id: teamId });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
    }

    if (!Array.isArray(team.players) || index < 0 || index >= team.players.length) {
      return res.status(404).send('Oyuncu bulunamadı');
    }

    team.players[index] = player;
    await team.save();

    return res.status(200).json(team);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
