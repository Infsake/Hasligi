let currentSort = 'gol'; // default sort by gol

async function fetchJson(url, fallbackUrl) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(response.status);
        return await response.json();
    } catch (err) {
        if (!fallbackUrl) throw err;
        const fallbackResponse = await fetch(fallbackUrl);
        if (!fallbackResponse.ok) throw err;
        return await fallbackResponse.json();
    }
}

async function loadPlayers() {
    try {
        const [teams, matches] = await Promise.all([
            fetchJson('/api/teams', '/teams.json'),
            fetchJson('/api/matches', '/matches.json')
        ]);

    const playerStats = {};

    // Initialize player stats
    teams.forEach(team => {
        if (team.players && Array.isArray(team.players)) {
            team.players.forEach((player, playerIndex) => {
                const playerName = typeof player === 'string' ? player : player.name;
                if (!playerStats[playerName]) {
                    playerStats[playerName] = {
                        name: playerName,
                        logo: team.logo,
                        team: team.name,
                        teamId: team.id,
                        playerIndex: playerIndex,
                        position: typeof player === 'object' ? player.position || 'Bilinmiyor' : 'Bilinmiyor',
                        photo: typeof player === 'object' ? player.photo || '' : '',
                        goals: 0,
                        assists: 0
                    };
                }
            });
        }
    });

    // Calculate stats from matches
    matches.filter(match => match.status === 'past' && match.goals).forEach(match => {
        match.goals.forEach(goal => {
            if (playerStats[goal.scorer]) {
                playerStats[goal.scorer].goals++;
            }
            if (goal.assister && playerStats[goal.assister]) {
                playerStats[goal.assister].assists++;
            }
        });
    });

    const players = Object.values(playerStats);
    const teamStats = calculateTeamStats(teams, matches);

    players.forEach(player => {
        player.teamPoints = teamStats[player.team]?.points || 0;
        player.teamGoals = teamStats[player.team]?.gf || 0;
        player.teamGoalsAgainst = teamStats[player.team]?.ga || 0;
    });

    sortPlayers(players);
    players.forEach((player, index) => {
        player.rank = index === 0 ? 1 : comparePlayerStats(player, players[index - 1]) === 0 ? players[index - 1].rank : index + 1;
    });

    const tbody = document.getElementById('players-body');
    tbody.innerHTML = '';
    players.forEach(player => {
        const row = document.createElement('tr');
        let rowClass = '';
        if (currentSort === 'gol' || currentSort === 'asist') {
            if (player.rank === 1) rowClass = 'gold';
            else if (player.rank === 2) rowClass = 'silver';
            else if (player.rank === 3) rowClass = 'bronze';
        }

        row.className = rowClass;
        row.innerHTML = `
            <td>${player.rank}</td>
            <td><img class="players-team-logo" src="${player.logo}" alt="${player.team} logo"></td>
            <td>${player.photo ? `<img class="players-player-photo" src="${player.photo}" alt="${player.name}">` : ''} <a href="./player.html?team=${encodeURIComponent(player.teamId)}&index=${player.playerIndex}" class="player-link">${player.name}</a></td>
            <td>${player.position}</td>
            <td>${player.goals}</td>
            <td>${player.assists}</td>
        `;
        tbody.appendChild(row);
    });
    } catch (error) {
        console.error('Oyuncuları yüklerken hata:', error);
        const tbody = document.getElementById('players-body');
        tbody.innerHTML = '<tr><td colspan="7">Oyuncular yüklenirken hata oluştu: ' + error.message + '</td></tr>';
    }
}

function comparePlayerStats(a, b) {
    if (currentSort === 'gol') {
        if (b.goals !== a.goals) return b.goals - a.goals;
        if (b.assists !== a.assists) return b.assists - a.assists;
    } else if (currentSort === 'asist') {
        if (b.assists !== a.assists) return b.assists - a.assists;
        if (b.goals !== a.goals) return b.goals - a.goals;
    } else if (currentSort === 'takim') {
        return a.team.localeCompare(b.team);
    }
    if (b.teamPoints !== a.teamPoints) return b.teamPoints - a.teamPoints;
    if (b.teamGoals !== a.teamGoals) return b.teamGoals - a.teamGoals;
    if (a.teamGoalsAgainst !== b.teamGoalsAgainst) return a.teamGoalsAgainst - b.teamGoalsAgainst;
    return a.name.localeCompare(b.name);
}

function sortPlayers(players) {
    players.sort(comparePlayerStats);
}

function calculateTeamStats(teams, matches) {
    const stats = {};
    teams.forEach(team => {
        stats[team.name] = { points: 0, gf: 0, ga: 0 };
    });
    matches.filter(match => match.status === 'past' && match.score).forEach(match => {
        const [homeScore, awayScore] = match.score.split('-').map(Number);
        if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return;
        if (!stats[match.home] || !stats[match.away]) return;

        stats[match.home].gf += homeScore;
        stats[match.home].ga += awayScore;
        stats[match.away].gf += awayScore;
        stats[match.away].ga += homeScore;

        if (homeScore > awayScore) {
            stats[match.home].points += 3;
        } else if (homeScore < awayScore) {
            stats[match.away].points += 3;
        } else {
            stats[match.home].points += 1;
            stats[match.away].points += 1;
        }
    });
    return stats;
}

document.getElementById('gol-header').addEventListener('click', () => {
    currentSort = 'gol';
    loadPlayers();
});

document.getElementById('asist-header').addEventListener('click', () => {
    currentSort = 'asist';
    loadPlayers();
});

document.getElementById('takim-header').addEventListener('click', () => {
    currentSort = 'takim';
    loadPlayers();
});

loadPlayers();

document.getElementById('gol-kralligi').addEventListener('click', () => {
    currentSort = 'gol';
    loadPlayers();
});

document.getElementById('asist-kralligi').addEventListener('click', () => {
    currentSort = 'asist';
    loadPlayers();
});

loadPlayers();