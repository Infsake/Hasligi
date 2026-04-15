const db = require('../db');
const { connectDB, hasMongoURI } = db;
const { Match } = require('../models');
const { seedMatchesIfEmpty, readJsonFile, writeJsonFile } = require('../utils');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      if (hasMongoURI) {
        try {
          await connectDB();
          await seedMatchesIfEmpty();
          const matches = await Match.find().lean();
          if (matches.length > 0) {
            return res.status(200).json(matches);
          }
        } catch (err) {
          console.error('Matches DB failed, falling back to matches.json', err);
        }
      }
      const matches = await readJsonFile('matches.json');
      return res.status(200).json(matches);
    }

    if (!hasMongoURI) {
      return res.status(500).send('MONGO_URI environment variable is not set on Vercel');
    }

    if (req.method === 'POST') {
      const { home, away, date, time, place, link } = req.body;
      if (!home || !away || !date) {
        return res.status(400).json({ error: 'home, away ve date alanları gerekli' });
      }

      if (!hasMongoURI) {
        const matches = await readJsonFile('matches.json');
        const id = `match${matches.length + 1}`;
        const newMatch = {
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
        };
        matches.push(newMatch);
        await writeJsonFile('matches.json', matches);
        return res.status(201).json(newMatch);
      }

      await connectDB();
      await seedMatchesIfEmpty();
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
