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

async function loadStandings() {
    const [teams, matches] = await Promise.all([
        fetchJson('/api/teams', './teams.json'),
        fetchJson('/api/matches', './matches.json')
    ]);

    const standings = teams.map(team => {
        let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, ga = 0;
        matches.filter(match => match.status === 'past' && (match.home === team.name || match.away === team.name)).forEach(match => {
            const [homeScore, awayScore] = match.score.split('-').map(Number);
            if (match.home === team.name) {
                gf += homeScore;
                ga += awayScore;
                if (homeScore > awayScore) won++;
                else if (homeScore === awayScore) drawn++;
                else lost++;
            } else {
                gf += awayScore;
                ga += homeScore;
                if (awayScore > homeScore) won++;
                else if (awayScore === homeScore) drawn++;
                else lost++;
            }
            played++;
        });
        const points = won * 3 + drawn;
        return { ...team, played, won, drawn, lost, gf, ga, gd: gf - ga, points };
    });

    standings.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.gd !== a.gd) return b.gd - a.gd;
        return b.gf - a.gf;
    });

    const tbody = document.getElementById('standings-body');
    standings.forEach((team, index) => {
        const row = document.createElement('tr');
        if (index < 3) row.classList.add('top-rank');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><a class="team-link" style="text-decoration: none; " href="./team.html?id=${team.id}"><img src="${team.logo}" alt="${team.name} logo" style="width: 32px; height: 32px; object-fit: contain; border-radius: 8px;">${team.name}</a></td>
            <td>${team.played}</td>
            <td>${team.won}</td>
            <td>${team.drawn}</td>
            <td>${team.lost}</td>
            <td>${team.gf}</td>
            <td>${team.ga}</td>
            <td>${team.gd}</td>
            <td>${team.points}</td>
        `;
        tbody.appendChild(row);
    });
}

function createMatchCard(match, teams) {
    const card = document.createElement('div');
    card.className = 'match-card';
    const isPast = match.status === 'past';
    const [homeScore, awayScore] = match.score ? match.score.split('-').map(Number) : [null, null];
    let homeClass = 'team-name';
    let awayClass = 'team-name';
    if (isPast && homeScore != null && awayScore != null) {
        if (homeScore > awayScore) homeClass += ' winner';
        else if (homeScore < awayScore) homeClass += ' loser';
        if (awayScore > homeScore) awayClass += ' winner';
        else if (awayScore < homeScore) awayClass += ' loser';
    }
    const scoreText = isPast ? `${homeScore} - ${awayScore}` : 'VS';
    const locationHtml = !isPast && match.place ? `<div class="match-location">${match.place}</div>` : '';
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
        const assisterHtml = goal.assister ? `<p class="assister-info">${goal.assister}</p>` : '';
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
        const assisterHtml = goal.assister ? `<p class="assister-info">${goal.assister}</p>` : '';
        const minuteText = goal.minute ? ` ${goal.minute}'` : '';
        awayGoalHtml += `
            <div class="goal-info">
                <p class="scorer-info">${goal.scorer}${minuteText}</p>
                ${assisterHtml}
            </div>
        `;
    });
    
    card.innerHTML = `
        <div class="match-header">
            <div class="match-date">${match.date}</div>
            <div class="match-time">${match.time || ''}</div>
        </div>
        <div class="match-team">
            <div class="team-header">
                ${homeLogoHtml}
            </div>
            <p class="team-name ${homeClass}">${match.home}</p>
            <div class="goals">${homeGoalHtml}</div>
        </div>
        <div class="score">${scoreText}${locationHtml}</div>
        <div class="match-team">
            <div class="team-header">
                ${awayLogoHtml}
            </div>
            <p class="team-name ${awayClass}">${match.away}</p>
            <div class="goals">${awayGoalHtml}</div>
        </div>
        <div class="match-footer">
            ${watchButtonHtml}
        </div>
    `;
    if (!isPast) card.classList.add('upcoming');
    return card;
}

async function loadMatches() {
    const [matches, teams] = await Promise.all([
        fetchJson('/api/matches', './matches.json'),
        fetchJson('/api/teams', './teams.json')
    ]);
    const pastDiv = document.getElementById('past-matches');
    const futureDiv = document.getElementById('future-matches');
    const pastMatches = matches.filter(match => match.status === 'past');
    const futureMatches = matches.filter(match => match.status !== 'past');

    pastMatches.forEach(match => pastDiv.appendChild(createMatchCard(match, teams)));
    futureMatches.forEach(match => futureDiv.appendChild(createMatchCard(match, teams)));
}

function showMatchDetails(matchId) {
    fetchJson('/api/matches', './matches.json').then(matches => {
        const match = matches.find(m => m.id === matchId);
        if (!match || !match.goals) return;
        let details = `Maç: ${match.home} vs ${match.away}\nSkor: ${match.score}\n\nGol Detayları:\n`;
        match.goals.forEach((goal, index) => {
            const assisterText = goal.assister ? ` (Asist: ${goal.assister})` : '';
            const minuteText = goal.minute ? ` - ${goal.minute}. dakika` : '';
            details += `${index + 1}. Gol: ${goal.scorer}${assisterText}${minuteText}\n`;
        });
        if (match.link) {
            details += `\nMaç Videosu: ${match.link}`;
        }
        alert(details);
    });
}

loadStandings();
loadMatches();