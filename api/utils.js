const fs = require('fs').promises;
const path = require('path');
const { Team, Match } = require('./models');

async function readJsonFile(filename) {
  const filePath = path.join(__dirname, '..', filename);
  const fileContents = await fs.readFile(filePath, 'utf8');
  return JSON.parse(fileContents);
}

async function seedTeamsIfEmpty() {
  const count = await Team.countDocuments();
  if (count > 0) return;
  const teams = await readJsonFile('teams.json');
  if (!Array.isArray(teams)) return;
  await Team.insertMany(teams);
}

async function seedMatchesIfEmpty() {
  const count = await Match.countDocuments();
  if (count > 0) return;
  const matches = await readJsonFile('matches.json');
  if (!Array.isArray(matches)) return;
  await Match.insertMany(matches);
}

module.exports = {
  readJsonFile,
  seedTeamsIfEmpty,
  seedMatchesIfEmpty
};
