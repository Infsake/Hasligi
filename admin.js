const ADMIN_PASSWORD = '!HL!20_26&!a';

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

function showAdminControls() {
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-controls').classList.remove('hidden');
}

function showLogin() {
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-controls').classList.add('hidden');
}

function selectTab(tabId) {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
    document.querySelectorAll('.admin-tab-content').forEach(section => {
        section.classList.toggle('hidden', section.id !== tabId);
    });
}

async function loadTeamOptions() {
    const teams = await fetchJson('/api/teams', '/teams.json');
    const team1 = document.getElementById('team1');
    const team2 = document.getElementById('team2');
    const playerTeam = document.getElementById('player-team');
    const editPlayerTeam = document.getElementById('edit-player-team');
    team1.innerHTML = '<option value="" disabled selected>Takım seç</option>';
    team2.innerHTML = '<option value="" disabled selected>Takım seç</option>';
    playerTeam.innerHTML = '<option value="" disabled selected>Takım seç</option>';
    editPlayerTeam.innerHTML = '<option value="" disabled selected>Takım seç</option>';
    teams.forEach(team => {
        const option1 = document.createElement('option');
        option1.value = team.name;
        option1.textContent = team.name;
        team1.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = team.name;
        option2.textContent = team.name;
        team2.appendChild(option2);

        const option3 = document.createElement('option');
        option3.value = team.id;
        option3.textContent = team.name;
        playerTeam.appendChild(option3);

        const option4 = document.createElement('option');
        option4.value = team.id;
        option4.textContent = team.name;
        editPlayerTeam.appendChild(option4);
    });
}

async function loadMatchOptions() {
    const matches = await fetchJson('/api/matches', '/matches.json');
    const matchSelect = document.getElementById('match-select');
    matchSelect.innerHTML = '<option value="" disabled selected>Maç seç</option>';
    matches.filter(match => match.status !== 'past').forEach(match => {
        const option = document.createElement('option');
        option.value = match.id;
        const timeText = match.time ? ` ${match.time}` : '';
        option.textContent = `${match.date}${timeText} • ${match.home} vs ${match.away}`;
        option.dataset.home = match.home;
        option.dataset.away = match.away;
        matchSelect.appendChild(option);
    });
    updateResultLabels();
}

function updateResultLabels() {
    const matchSelect = document.getElementById('match-select');
    const selectedOption = matchSelect.options[matchSelect.selectedIndex];
    const label1 = document.getElementById('score1-label');
    const label2 = document.getElementById('score2-label');
    if (!selectedOption || !selectedOption.value) {
        label1.textContent = 'Takım 1 Skoru';
        label2.textContent = 'Takım 2 Skoru';
        return;
    }
    const homeName = selectedOption.dataset.home || 'Birinci Takım';
    const awayName = selectedOption.dataset.away || 'İkinci Takım';
    label1.textContent = `${homeName} Skoru`;
    label2.textContent = `${awayName} Skoru`;
}

document.getElementById('login-form').onsubmit = (e) => {
    e.preventDefault();
    const password = document.getElementById('admin-password').value.trim();
    if (password === ADMIN_PASSWORD) {
        sessionStorage.setItem('hasleagueAdminAuth', 'true');
        showAdminControls();
        loadTeamOptions();
        loadMatchOptions();
        alert('Giriş başarılı. Admin paneline erişebilirsiniz.');
    } else {
        alert('Yanlış şifre. Tekrar deneyin.');
    }
};

if (sessionStorage.getItem('hasleagueAdminAuth') === 'true') {
    showAdminControls();
    loadTeamOptions();
    loadMatchOptions();
} else {
    showLogin();
}

selectTab('team-tab');

document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
});

document.getElementById('match-select').addEventListener('change', updateResultLabels);

// Global variables for photo base64
let playerPhotoBase64 = null;
let editPlayerPhotoBase64 = null;

// Function to convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// Add event listeners for photo inputs
document.getElementById('player-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            playerPhotoBase64 = await fileToBase64(file);
        } catch (error) {
            console.error('Photo conversion error:', error);
            playerPhotoBase64 = null;
        }
    } else {
        playerPhotoBase64 = null;
    }
});

document.getElementById('edit-player-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        try {
            editPlayerPhotoBase64 = await fileToBase64(file);
        } catch (error) {
            console.error('Photo conversion error:', error);
            editPlayerPhotoBase64 = null;
        }
    } else {
        editPlayerPhotoBase64 = null;
    }
});

// Edit player functionality
document.getElementById('edit-player-team').addEventListener('change', async (e) => {
    const teamId = e.target.value;
    const playerSelect = document.getElementById('edit-player-select');
    playerSelect.innerHTML = '<option value="" disabled selected>Oyuncu seç</option>';
    
    if (!teamId) return;
    
    const teams = await fetchJson('/api/teams', '/teams.json');
    const team = teams.find(t => t.id === teamId);
    
    if (team && team.players.length > 0) {
        team.players.forEach((player, index) => {
            const option = document.createElement('option');
            option.value = index;
            if (typeof player === 'string') {
                option.textContent = player;
                option.dataset.playerData = JSON.stringify({ name: player });
            } else {
                option.textContent = `${player.name} (${player.position})`;
                option.dataset.playerData = JSON.stringify(player);
            }
            playerSelect.appendChild(option);
        });
    }
});

document.getElementById('edit-player-select').addEventListener('change', (e) => {
    const playerData = JSON.parse(e.target.options[e.target.selectedIndex].dataset.playerData || '{}');
    document.getElementById('edit-player-number').value = playerData.number || '';
    document.getElementById('edit-player-position').value = playerData.position || '';
    // Photo is handled in form submission
});

document.getElementById('edit-player-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamId = formData.get('team');
    const playerIndex = formData.get('player');
    const playerSelect = document.getElementById('edit-player-select');
    const selectedOption = playerSelect.options[playerSelect.selectedIndex];
    const playerData = JSON.parse(selectedOption.dataset.playerData || '{}');
    
    const updatedPlayer = {
        name: playerData.name,
        number: parseInt(formData.get('number')),
        position: formData.get('position')
    };
    
    // Add photo if exists
    if (editPlayerPhotoBase64) {
        updatedPlayer.photoBase64 = editPlayerPhotoBase64;
    }
    
    try {
        const response = await fetch(`/api/teams/${teamId}/players/${playerIndex}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: updatedPlayer })
        });
        if (response.ok) {
            alert('Oyuncu başarıyla güncellendi!');
            e.target.reset();
            document.getElementById('edit-player-select').innerHTML = '<option value="" disabled selected>Oyuncu seç</option>';
            editPlayerPhotoBase64 = null; // Reset
        } else {
            alert('Hata: ' + await response.text());
        }
    } catch (error) {
        alert('Bağlantı hatası: ' + error.message);
    }
};

function updateGoalDetails() {
    const score1 = parseInt(document.getElementById('score1').value) || 0;
    const score2 = parseInt(document.getElementById('score2').value) || 0;
    const totalGoals = score1 + score2;
    const container = document.getElementById('goals-container');
    container.innerHTML = '';

    if (totalGoals > 0) {
        document.getElementById('goal-details').classList.remove('hidden');
        const matchSelect = document.getElementById('match-select');
        const selectedOption = matchSelect.options[matchSelect.selectedIndex];
        if (!selectedOption || !selectedOption.value) return;

        const homeTeam = selectedOption.dataset.home;
        const awayTeam = selectedOption.dataset.away;

        // Get players for both teams
        fetchJson('/api/teams', '/teams.json').then(teams => {
            const homePlayers = teams.find(t => t.name === homeTeam)?.players || [];
            const awayPlayers = teams.find(t => t.name === awayTeam)?.players || [];

            for (let i = 0; i < totalGoals; i++) {
                const isHomeGoal = i < score1;
                const teamName = isHomeGoal ? homeTeam : awayTeam;
                const goalDiv = document.createElement('div');
                goalDiv.className = 'goal-item';
                const scorerPlayers = isHomeGoal ? homePlayers : awayPlayers;
                goalDiv.innerHTML = `
                    <h4>${teamName} Takımının ${isHomeGoal ? (i + 1) : (i - score1 + 1)}. Golü</h4>
                    <label>Golü Atan Oyuncu</label>
                    <select name="scorer-${i}" required>
                        <option value="">Seç</option>
                        ${scorerPlayers.map(p => `<option value="${typeof p === 'string' ? p : p.name}">${typeof p === 'string' ? p : p.name}</option>`).join('')}
                    </select>
                    <label>Asist Yapan Oyuncu</label>
                    <select name="assister-${i}">
                        <option value="">Yok</option>
                        ${scorerPlayers.map(p => `<option value="${typeof p === 'string' ? p : p.name}">${typeof p === 'string' ? p : p.name}</option>`).join('')}
                    </select>
                    <label>
                        <input type="checkbox" name="has-minute-${i}"> Dakikası var mı?
                    </label>
                    <input type="number" name="minute-${i}" min="1" max="120" placeholder="Dakika" style="display: none;">
                `;
                const checkbox = goalDiv.querySelector(`input[name="has-minute-${i}"]`);
                const minuteInput = goalDiv.querySelector(`input[name="minute-${i}"]`);
                checkbox.addEventListener('change', () => {
                    minuteInput.style.display = checkbox.checked ? 'block' : 'none';
                    minuteInput.required = checkbox.checked;
                });
                container.appendChild(goalDiv);
            }
        });
    } else {
        document.getElementById('goal-details').classList.add('hidden');
    }
}

document.getElementById('team-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamData = {
        name: formData.get('name'),
        logo: formData.get('logo'),
        founded: formData.get('founded'),
        players: formData.get('players').split(',').map(p => p.trim()).filter(p => p)
    };
    try {
        const response = await fetch('/api/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(teamData)
        });
        if (response.ok) {
            alert('Takım başarıyla eklendi!');
            e.target.reset();
            loadTeamOptions();
        } else {
            alert('Hata: ' + await response.text());
        }
    } catch (error) {
        alert('Bağlantı hatası: ' + error.message);
    }
};

document.getElementById('player-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const teamId = formData.get('team');
    const playerData = {
        name: formData.get('player'),
        number: parseInt(formData.get('number')),
        position: formData.get('position')
    };
    
    // Add photo if exists
    if (playerPhotoBase64) {
        playerData.photoBase64 = playerPhotoBase64;
    }
    
    try {
        const response = await fetch(`/api/teams/${teamId}/players`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player: playerData })
        });
        if (response.ok) {
            alert('Oyuncu başarıyla eklendi!');
            e.target.reset();
            playerPhotoBase64 = null; // Reset
        } else {
            alert('Hata: ' + await response.text());
        }
    } catch (error) {
        alert('Bağlantı hatası: ' + error.message);
    }
};

document.getElementById('match-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const matchData = {
        home: formData.get('home'),
        away: formData.get('away'),
        date: formData.get('date'),
        time: formData.get('time'),
        place: formData.get('place')
    };
    try {
        const response = await fetch('/api/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchData)
        });
        if (response.ok) {
            alert('Maç başarıyla eklendi!');
            e.target.reset();
            loadMatchOptions();
        } else {
            alert('Hata: ' + await response.text());
        }
    } catch (error) {
        alert('Bağlantı hatası: ' + error.message);
    }
};

document.getElementById('result-form').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const matchId = formData.get('match');
    const score = formData.get('score1') + '-' + formData.get('score2');
    const link = formData.get('link') || null;

    // Get match details to know which team is home/away
    const matches = await fetchJson('/api/matches', '/matches.json');
    const match = matches.find(m => m.id === matchId);
    const homeTeam = match.home;
    const awayTeam = match.away;

    // Collect goal details
    const goals = [];
    const totalGoals = (parseInt(formData.get('score1')) || 0) + (parseInt(formData.get('score2')) || 0);
    const score1 = parseInt(formData.get('score1')) || 0;
    
    for (let i = 0; i < totalGoals; i++) {
        const scorer = formData.get(`scorer-${i}`);
        const assister = formData.get(`assister-${i}`) || null;
        const hasMinute = formData.get(`has-minute-${i}`) === 'on';
        const minute = hasMinute ? parseInt(formData.get(`minute-${i}`)) : null;
        const isHomeGoal = i < score1;
        const team = isHomeGoal ? 'home' : 'away';
        
        if (scorer) {
            goals.push({ team, scorer, assister, minute });
        }
    }

    try {
        const response = await fetch(`/api/matches/${matchId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score, link, goals })
        });
        if (response.ok) {
            alert('Maç sonucu başarıyla güncellendi!');
            e.target.reset();
            document.getElementById('goal-details').classList.add('hidden');
            loadMatchOptions();
        } else {
            alert('Hata: ' + await response.text());
        }
    } catch (error) {
        alert('Bağlantı hatası: ' + error.message);
    }
};