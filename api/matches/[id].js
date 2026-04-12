const connectDB = require('../db');
const { Match } = require('../models');
const { seedMatchesIfEmpty } = require('../utils');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedMatchesIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    const { id } = req.query;
    const { score, link, goals } = req.body;
    const match = await Match.findOne({ id });
    if (!match) {
      return res.status(404).send('Maç bulunamadı');
    }

    match.score = score;
    match.link = link || match.link || null;
    match.goals = Array.isArray(goals) ? goals : [];
    match.status = 'past';
    await match.save();

    return res.status(200).json(match);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
