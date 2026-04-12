const db = require('../db');
const { connectDB, hasMongoURI } = db;
const { Match } = require('../models');
const { seedMatchesIfEmpty } = require('../utils');

module.exports = async (req, res) => {
  try {
    if (!hasMongoURI) {
      return res.status(500).send('MONGO_URI environment variable is not set on Vercel');
    }
    await connectDB();
    await seedMatchesIfEmpty();

    if (req.method !== 'PUT') {
      res.setHeader('Allow', 'PUT');
      return res.status(405).end('Method not allowed');
    }

    // Get id from query or URL path
    let id = req.query.id;
    
    // If not in query, try to parse from URL path
    if (!id && req.url) {
      const urlMatch = req.url.match(/\/api\/matches\/([^/?]+)/);
      if (urlMatch) {
        id = urlMatch[1];
      }
    }

    if (!id) {
      return res.status(400).send('Maç ID\'si bulunamadı');
    }

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
