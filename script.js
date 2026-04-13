// Hamburger menü toggle
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', function() {
            navLinks.classList.toggle('open');
        });

        // Menü dışına tıklandığında kapat
        document.addEventListener('click', function(event) {
            if (!hamburger.contains(event.target) && !navLinks.contains(event.target)) {
                navLinks.classList.remove('open');
            }
        });
    }
});

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

async function loadTeams() {
    const [teams, matches] = await Promise.all([
        fetchJson('/api/teams', '/teams.json'),
        fetchJson('/api/matches', '/matches.json')
    ]);
    const teamList = document.getElementById('team-list');
    teamList.innerHTML = '';

    teams.forEach(team => {
        const teamCard = document.createElement('a');
        teamCard.className = 'team-card';
        teamCard.href = `./team.html?id=${team.id}`;
        teamCard.innerHTML = `
            <img src="${normalizeLogoPath(team.logo)}" alt="${team.name} Logo">
            <h3>${team.name}</h3>
            <p>Kuruluş Yılı ${team.founded}</p>
        `;
        teamList.appendChild(teamCard);
    });

    loadTopPlayers(teams, matches);
    loadNextMatch(teams, matches);
}

function normalizeLogoPath(logoPath) {
    if (!logoPath) return '';
    return logoPath.replace(/^\.\.\//, '');
}

function getTeamLogo(teams, teamName) {
    const team = teams.find(t => t.name === teamName);
    return team ? normalizeLogoPath(team.logo) : '';
}

function parseMatchDate(match) {
    const datePart = match.date || '';
    const timePart = match.time ? match.time.trim() : '00:00';
    return new Date(`${datePart}T${timePart}:00`);
}

function formatTimeUnit(value) {
    return value.toString().padStart(2, '0');
}

function isSameDate(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function loadNextMatch(teams, matches) {
    const now = new Date();
    const upcomingMatches = matches
        .filter(match => match.status === 'future')
        .map(match => ({ match, date: parseMatchDate(match) }))
        .filter(item => item.date > now)
        .sort((a, b) => a.date - b.date);

    const nextMatchContainer = document.getElementById('next-match');
    if (!nextMatchContainer) return;

    if (upcomingMatches.length === 0) {
        nextMatchContainer.innerHTML = '<div class="next-match-content"><p>Henüz planlanan maç yok.</p></div>';
        return;
    }

    const closestDate = upcomingMatches[0].date;
    const sameDayMatches = upcomingMatches.filter(item => isSameDate(item.date, closestDate));
    const matchDate = sameDayMatches[0].date;

    const countdownItems = sameDayMatches.map((item, index) => ({
        id: `next-match-countdown-${index}`,
        date: item.date,
        match: item.match
    }));

    const matchCardsHtml = sameDayMatches.map((item, index) => {
        const match = item.match;
        const homeLogo = getTeamLogo(teams, match.home);
        const awayLogo = getTeamLogo(teams, match.away);
        const countdownId = countdownItems[index].id;
        return `
            <div class="next-match-entry">
                <div class="next-match-teams">
                    <div class="next-match-team">
                        ${homeLogo ? `<img src="${homeLogo}" alt="${match.home} logo">` : ''}
                        <span>${match.home}</span>
                    </div>
                    <span class="next-match-vs">vs</span>
                    <div class="next-match-team">
                        ${awayLogo ? `<img src="${awayLogo}" alt="${match.away} logo">` : ''}
                        <span>${match.away}</span>
                    </div>
                </div>
                <div class="next-match-details small">
                    <div><strong>Saat:</strong> ${match.time || 'Bilinmiyor'}</div>
                    <div><strong>Yer:</strong> ${match.place || 'Bilinmiyor'}</div>
                </div>
                <div class="next-match-timer" id="${countdownId}"></div>
            </div>
        `;
    }).join('');

    nextMatchContainer.innerHTML = `
        <div class="next-match-content">
            <div class="next-match-header">
                <div><strong>Tarih:</strong> ${sameDayMatches[0].match.date}</div>
                <div><strong>Maç Sayısı:</strong> ${sameDayMatches.length}</div>
            </div>
            <div class="next-match-list">
                ${matchCardsHtml}
            </div>
        </div>
    `;

    const updateCountdowns = () => {
        const now = new Date();
        countdownItems.forEach(item => {
            const countdownElement = document.getElementById(item.id);
            if (!countdownElement) return;
            const diffMs = item.date - now;
            if (diffMs <= 0) {
                countdownElement.textContent = 'Maç başladı!';
                return;
            }

            if (isSameDate(now, item.date)) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                countdownElement.textContent = `${formatTimeUnit(hours)}:${formatTimeUnit(minutes)}:${formatTimeUnit(seconds)}`;
            } else {
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                countdownElement.textContent = `${diffDays} GÜN`;
            }
        });
    };

    updateCountdowns();
    setInterval(updateCountdowns, 1000);
}

function comparePlayerStats(a, b) {
    if (b.goals !== a.goals) return b.goals - a.goals;
    if (b.assists !== a.assists) return b.assists - a.assists;
    if (b.teamPoints !== a.teamPoints) return b.teamPoints - a.teamPoints;
    if (b.teamGoals !== a.teamGoals) return b.teamGoals - a.teamGoals;
    if (a.teamGoalsAgainst !== b.teamGoalsAgainst) return a.teamGoalsAgainst - b.teamGoalsAgainst;
    return a.name.localeCompare(b.name);
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

function loadTopPlayers(teams, matches) {
    const playerStats = {};
    const teamStats = calculateTeamStats(teams, matches);

    teams.forEach(team => {
        if (team.players && Array.isArray(team.players)) {
            team.players.forEach((player, playerIndex) => {
                const playerName = typeof player === 'string' ? player : player.name;
                playerStats[playerName] = {
                    name: playerName,
                    logo: team.logo,
                    team: team.name,
                    teamId: team.id,
                    playerIndex,
                    photo: typeof player === 'object' ? player.photo || '' : '',
                    goals: 0,
                    assists: 0,
                    teamPoints: teamStats[team.name]?.points || 0,
                    teamGoals: teamStats[team.name]?.gf || 0,
                    teamGoalsAgainst: teamStats[team.name]?.ga || 0
                };
            });
        }
    });

    matches.filter(match => match.status === 'past' && match.goals).forEach(match => {
        match.goals.forEach(goal => {
            if (playerStats[goal.scorer]) playerStats[goal.scorer].goals++;
            if (goal.assister && playerStats[goal.assister]) playerStats[goal.assister].assists++;
        });
    });

    const topPlayers = Object.values(playerStats)
        .sort(comparePlayerStats)
        .slice(0, 3);

    const topPlayersEl = document.getElementById('top-players');
    topPlayersEl.innerHTML = '';

    if (topPlayers.length === 0) {
        topPlayersEl.innerHTML = '<p>Henüz veri yok.</p>';
        return;
    }

    topPlayers.forEach((player, index) => {
        const card = document.createElement('a');
        card.href = `./player.html?team=${encodeURIComponent(player.teamId)}&index=${player.playerIndex}`;
        card.className = `top-player-card ${index === 0 ? 'gold' : index === 1 ? 'silver' : 'bronze'}`;
        card.innerHTML = `
            <div class="top-player-rank">#${index + 1}</div>
            <div class="top-player-meta">
                <div class="top-player-photo">
                    <img src="${player.photo || normalizeLogoPath(player.logo)}" alt="${player.name}">
                </div>
                <div class="top-player-info">
                    <h3>${player.name}</h3>
                    <p>${player.team}</p>
                </div>
            </div>
            <div class="top-player-stats">
                <span>Gol: ${player.goals}</span>
                <span>Asist: ${player.assists}</span>
            </div>
        `;
        topPlayersEl.appendChild(card);
    });
}

loadTeams();