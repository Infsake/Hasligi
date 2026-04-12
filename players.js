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
            fetchJson('/api/teams', './teams.json'),
            fetchJson('/api/matches', './matches.json')
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

    sortPlayers(players);

    const tbody = document.getElementById('players-body');
    tbody.innerHTML = '';
    players.forEach((player, index) => {
        const row = document.createElement('tr');
        let rowClass = '';
    if (currentSort === 'gol' || currentSort === 'asist') {
        if (index === 0) rowClass = 'gold';
        else if (index === 1) rowClass = 'silver';
        else if (index === 2) rowClass = 'bronze';
    }

        row.className = rowClass;
        row.innerHTML = `
            <td>${index + 1}</td>
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

function sortPlayers(players) {
    players.sort((a, b) => {
        if (currentSort === 'gol') {
            return b.goals - a.goals;
        } else if (currentSort === 'asist') {
            return b.assists - a.assists;
        } else if (currentSort === 'takim') {
            return a.team.localeCompare(b.team);
        }
        return 0;
    });
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