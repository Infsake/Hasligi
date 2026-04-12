const urlParams = new URLSearchParams(window.location.search);
const teamId = urlParams.get('team');
const playerIndex = parseInt(urlParams.get('index'));

async function loadPlayerDetails() {
    const [teamsRes, matchesRes] = await Promise.all([
        fetch('./teams.json'),
        fetch('./matches.json')
    ]);
    const teams = await teamsRes.json();
    const matches = await matchesRes.json();

    const team = teams.find(t => t.id === teamId);
    if (!team || !team.players || playerIndex < 0 || playerIndex >= team.players.length) {
        document.body.innerHTML = '<div class="page-shell"><h1>Oyuncu bulunamadı</h1></div>';
        return;
    }

    const player = team.players[playerIndex];
    if (typeof player === 'string') {
        // Eski format, basit bilgi
        document.getElementById('player-name').textContent = player;
        document.getElementById('player-number').textContent = 'Bilinmiyor';
        document.getElementById('player-position').textContent = 'Bilinmiyor';
        document.getElementById('player-photo').src = '';
    } else {
        document.getElementById('player-name').textContent = player.name;
        document.getElementById('player-number').textContent = player.number;
        document.getElementById('player-position').textContent = player.position;
        document.getElementById('player-photo').src = player.photo || '';
    }

    document.getElementById('player-team').textContent = team.name;

    // Gol ve asist istatistikleri
    let totalGoals = 0;
    let totalAssists = 0;
    const playerName = typeof player === 'string' ? player : player.name;

    matches.forEach(match => {
        if (match.goals) {
            match.goals.forEach(goal => {
                if (goal.scorer === playerName) totalGoals++;
                if (goal.assister === playerName) totalAssists++;
            });
        }
    });

    document.getElementById('total-goals').textContent = totalGoals;
    document.getElementById('total-assists').textContent = totalAssists;

    // Gol krallığı sıralaması
    const playerStats = {};
    teams.forEach(t => {
        if (t.players) {
            t.players.forEach(p => {
                const name = typeof p === 'string' ? p : p.name;
                if (!playerStats[name]) playerStats[name] = { goals: 0 };
            });
        }
    });

    matches.forEach(match => {
        if (match.goals) {
            match.goals.forEach(goal => {
                if (playerStats[goal.scorer]) playerStats[goal.scorer].goals++;
            });
        }
    });

    const sortedPlayers = Object.entries(playerStats)
        .sort((a, b) => b[1].goals - a[1].goals);

    const ranking = sortedPlayers.findIndex(([name]) => name === playerName) + 1;
    document.getElementById('goals-ranking').textContent = ranking || 'Sıralama dışı';

    const playerCard = document.querySelector('.player-card');
    if (playerCard) {
        playerCard.classList.remove('gold', 'silver', 'bronze');
        if (ranking === 1) playerCard.classList.add('gold');
        else if (ranking === 2) playerCard.classList.add('silver');
        else if (ranking === 3) playerCard.classList.add('bronze');
    }

    // Gol/asist yaptığı maçlar
    const relevantMatches = matches.filter(match =>
        match.status === 'past' && match.goals &&
        match.goals.some(goal => goal.scorer === playerName || goal.assister === playerName)
    );

    const matchesContainer = document.getElementById('player-matches-list');
    if (relevantMatches.length === 0) {
        matchesContainer.innerHTML = '<p>Henüz gol veya asist yapılan maç yok.</p>';
        return;
    }

    relevantMatches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-card';
        const [homeScore, awayScore] = match.score.split('-').map(Number);
        let homeClass = 'team-name';
        let awayClass = 'team-name';
        if (homeScore > awayScore) homeClass += ' winner';
        else if (homeScore < awayScore) awayClass += ' winner';

        const playerGoals = match.goals.filter(goal => goal.scorer === playerName).length;
        const playerAssists = match.goals.filter(goal => goal.assister === playerName).length;

        const contributionRows = [];
        match.goals.forEach(goal => {
            if (goal.scorer === playerName) {
                const minuteText = goal.minute ? ` ${goal.minute}'` : '';
                contributionRows.push(`<div class="player-action">Gol${minuteText}</div>`);
            }
            if (goal.assister === playerName) {
                const minuteText = goal.minute ? ` ${goal.minute}'` : '';
                contributionRows.push(`<div class="player-action">Asist${minuteText}</div>`);
            }
        });

        const matchLinkHtml = match.link ? `<div class="match-video"><a href="${match.link}" target="_blank" class="watch-btn">Maç Videosunu İzle</a></div>` : '';

        card.innerHTML = `
            <div class="match-teams">
                <span class="${homeClass}">${match.home}</span>
                <span class="score">${match.score}</span>
                <span class="${awayClass}">${match.away}</span>
            </div>
            <div class="match-details">
                <span class="match-date">${match.date}</span>
                <span class="match-place">${match.place}</span>
            </div>
            <div class="player-contribution">
                <span>Gol: ${playerGoals}</span>
                <span>Asist: ${playerAssists}</span>
            </div>
            <div class="player-actions">
                ${contributionRows.join('')}
            </div>
            ${matchLinkHtml}
        `;
        matchesContainer.appendChild(card);
    });
}

loadPlayerDetails();