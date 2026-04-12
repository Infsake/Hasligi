const connectDB = require('../db');
const { Match } = require('../models');
const { seedMatchesIfEmpty } = require('../utils');

module.exports = async (req, res) => {
  try {
    await connectDB();
    await seedMatchesIfEmpty();

    if (req.method === 'GET') {
      const matches = await Match.find().lean();
      return res.status(200).json(matches);
    }

    if (req.method === 'POST') {
      const { home, away, date, time, place, link } = req.body;
      if (!home || !away || !date) {
        return res.status(400).json({ error: 'home, away ve date alanlar� gerekli' });
      }
      const count = await Match.countDocuments();
      const id = `match${count + 1}`;
      const newMatch = new Match({
        id,
        home,
        away,
        date,
        time,
        place,
        link: link || null,
        status: 'future',
        score: null,
        goals: []
      });
      await newMatch.save();
      return res.status(201).json(newMatch);
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).end('Method not allowed');
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};
