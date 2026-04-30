const params = new URLSearchParams(window.location.search);
const teamId = params.get('id');

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

async function loadTeamDetails() {
    try {
        const teams = await fetchJson('/api/teams', '/teams.json');
        const team = teams.find(t => t.id === teamId);
        if (!team) {
            document.body.innerHTML = '<div class="page-shell"><h1>Takım bulunamadı</h1></div>';
            return;
        }
    document.getElementById('team-name').textContent = team.name;
    document.getElementById('sosyal').href = team.sosyal;
    document.getElementById('team-logo').src = team.logo;
    document.getElementById('founded').textContent = team.founded;
    document.getElementById('misyon').textContent = team.misyon;
    document.getElementById('ranking').textContent = team.ranking;
    
    // Load matches to calculate player stats
    const matches = await fetchJson('/api/matches', '/matches.json');
    
    // Calculate player statistics
    const playerStats = {};
    matches.forEach(match => {
        const isHome = match.home === team.name;
        const isAway = match.away === team.name;
        
        if ((isHome || isAway) && match.goals) {
            match.goals.forEach(goal => {
                const isTeamGoal = (isHome && goal.team === 'home') || (isAway && goal.team === 'away');
                if (isTeamGoal) {
                    if (!playerStats[goal.scorer]) {
                        playerStats[goal.scorer] = { goals: 0, assists: 0 };
                    }
                    playerStats[goal.scorer].goals++;
                    
                    if (goal.assister) {
                        if (!playerStats[goal.assister]) {
                            playerStats[goal.assister] = { goals: 0, assists: 0 };
                        }
                        playerStats[goal.assister].assists++;
                    }
                }
            });
        }
    });
    
    // Display player statistics
    const statsContainer = document.getElementById('player-stats');
    if (Object.keys(playerStats).length > 0) {
        const sortedPlayers = Object.entries(playerStats)
            .sort((a, b) => (b[1].goals + b[1].assists) - (a[1].goals + a[1].assists));
        
        sortedPlayers.forEach(([playerName, stats]) => {
            const statDiv = document.createElement('div');
            statDiv.className = 'player-stat-row';
            statDiv.innerHTML = `
                <span class="stat-player-name">${playerName}</span>
                <span class="stat-numbers"><strong>${stats.goals}</strong>G <strong>${stats.assists}</strong>A</span>
            `;
            statsContainer.appendChild(statDiv);
        });
    } else {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'Henüz istatistik yok';
        emptyMsg.style.color = 'var(--muted)';
        statsContainer.appendChild(emptyMsg);
    }
    
    const playersUl = document.getElementById('players');
    team.players.forEach((player, index) => {
        const li = document.createElement('li');
        if (typeof player === 'string') {
            li.innerHTML = `<a href="./player.html?team=${encodeURIComponent(teamId)}&index=${index}" class="player-link">${player}</a>`;
        } else {
            const photoHtml = player.photo ? `<img src="${player.photo}" alt="${player.name}">` : '';
            li.innerHTML = `${photoHtml}<span class="player-number">${player.number}</span> <a href="./player.html?team=${encodeURIComponent(teamId)}&index=${index}" class="player-link">${player.name}</a> - ${player.position}`;
        }
        playersUl.appendChild(li);
    });

    let teamMatches = matches.filter(m => m.home === team.name || m.away === team.name);

    // Maçları sıralama: gelecek maçlar en üste, geçmiş maçlar en sona
    teamMatches.sort((a, b) => {
        if (a.status === 'future' && b.status !== 'future') return -1;
        if (a.status !== 'future' && b.status === 'future') return 1;
        return new Date(b.date) - new Date(a.date);
    });

    const matchesContainer = document.getElementById('team-matches');
    teamMatches.forEach(match => {
        const card = document.createElement('div');
        card.className = 'match-card';
        const [homeScore, awayScore] = match.score ? match.score.split('-').map(Number) : [null, null];
        let homeClass = 'team-name';
        let awayClass = 'team-name';
        if (match.status === 'past' && homeScore != null && awayScore != null) {
            if (match.home === team.name) {
                homeClass += homeScore > awayScore ? ' winner' : homeScore < awayScore ? ' loser' : '';
                awayClass += awayScore > homeScore ? ' winner' : awayScore < homeScore ? ' loser' : '';
            } else {
                awayClass += awayScore > homeScore ? ' winner' : awayScore < homeScore ? ' loser' : '';
                homeClass += homeScore > awayScore ? ' winner' : homeScore < awayScore ? ' loser' : '';
            }
        }
        const scoreText = match.score || `${match.date} ${match.time || ''}`;
        const timeText = match.time ? ` • ${match.time}` : '';
        const watchButtonHtml = match.link ? `<a href="${match.link}" target="_blank" class="watch-btn">Maç İzle</a>` : '';
        
        // Get team logos
        const homeTeam = teams.find(t => t.name === match.home);
        const awayTeam = teams.find(t => t.name === match.away);
        const homeLogoHtml = homeTeam ? `<img src="${homeTeam.logo}" alt="${match.home}" class="team-logo">` : '';
        const awayLogoHtml = awayTeam ? `<img src="${awayTeam.logo}" alt="${match.away}" class="team-logo">` : '';
        
        // Get goals for each team
        const homeGoals = match.goals ? match.goals.filter(g => g.team === 'home') : [];
        const awayGoals = match.goals ? match.goals.filter(g => g.team === 'away') : [];
        
        // Create goal HTML for home team
        let homeGoalHtml = '';
        homeGoals.forEach(goal => {
            const assisterHtml = goal.assister ? `<p class="assister-info">Asist: ${goal.assister}</p>` : '';
            const minuteText = goal.minute ? ` ${goal.minute}'` : '';
            homeGoalHtml += `
                <div class="goal-info">
                    <p class="scorer-info">${goal.scorer}${minuteText}</p>
                    ${assisterHtml}
                </div>
            `;
        });
        
        // Create goal HTML for away team
        let awayGoalHtml = '';
        awayGoals.forEach(goal => {
            const assisterHtml = goal.assister ? `<p class="assister-info">Asist: ${goal.assister}</p>` : '';
            const minuteText = goal.minute ? ` ${goal.minute}'` : '';
            awayGoalHtml += `
                <div class="goal-info">
                    <p class="scorer-info">${goal.scorer}${minuteText}</p>
                    ${assisterHtml}
                </div>
            `;
        });
        
        let headerHtml = '';
        if (match.status !== 'future') {
            headerHtml = `
            <div class="match-header">
                <div class="match-date">${match.date}</div>
                <div class="match-time">${match.time || ''}</div>
            </div>`;
        }
        
        card.innerHTML = `
            ${headerHtml}
            <div class="match-team">
                <div class="team-header">
                    ${homeLogoHtml}
                </div>
                <p class="team-name ${homeClass}">${match.home}</p>
                ${homeGoalHtml}
            </div>
            <div class="score">${scoreText}</div>
            <div class="match-team">
                <div class="team-header">
                    ${awayLogoHtml}
                </div>
                <p class="team-name ${awayClass}">${match.away}</p>
                ${awayGoalHtml}
            </div>
            <div class="match-footer">
                ${watchButtonHtml}
            </div>
        `;
        matchesContainer.appendChild(card);
    });
    } catch (error) {
        console.error('Takım detayları yüklenirken hata:', error);
        document.body.innerHTML = '<div class="page-shell"><h1>Hata: ' + error.message + '</h1></div>';
    }
}

loadTeamDetails();