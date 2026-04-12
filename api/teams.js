const connectDB = require('./db');
const { Team } = require('./models');

module.exports = async (req, res) => {
  try {
    await connectDB();

    if (req.method === 'GET') {
      const teams = await Team.find().sort({ ranking: 1 }).lean();
      return res.status(200).json(teams);
    }

    if (req.method === 'POST') {
      const { name, logo, founded, players } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Takım adı gerekli' });
      }
      const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const count = await Team.countDocuments();
      const newTeam = new Team({
        id,
        name,
        logo,
        founded,
        ranking: count + 1,
        players: Array.isArray(players) ? players : [],
        matches: []
      });
      await newTeam.save();
      return res.status(201).json(newTeam);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method not allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
