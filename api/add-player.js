const { connectDB } = require('./db');
const { Team } = require('./models');
const { seedTeamsIfEmpty } = require('./utils');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { teamId, player } = req.body;
    if (!teamId || !player || typeof player !== 'object') {
      return res.status(400).send('teamId ve player gereklidir');
    }

    await connectDB();
    await seedTeamsIfEmpty();

    const team = await Team.findOne({ id: teamId });
    if (!team) {
      return res.status(404).send('Takım bulunamadı');
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