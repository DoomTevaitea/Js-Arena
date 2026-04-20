// import { game } from "./main.js";
let playersStats = [];

function loadPlayers() {
    const button = document.getElementById("connectBtn");
    button.addEventListener("click", async () => {
        const address = document.getElementById("serverAddress").value.trim();
        if (!address) {
            alert("Veuillez entrer une adresse serveur (IP:PORT)");
            return;
        }


        try {
            const url = `http://${address}/api/listPlayers`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error("Erreur HTTP : " + response.status);
            }

            const data = await response.json();
            // noms des joueurs actuellement sur le serveur
            const serverPlayerNames = data.map(p => p.name);

            // supprimer les joueurs qui ne sont plus sur le serveur
            playersStats = playersStats.filter(p => serverPlayerNames.includes(p.name));

            let players = [];
            for (let i = 0; i < data.length; i++) {
                players.push(data[i]);
            }
            document.getElementById("serverAddress").style.display = "none";
            document.getElementById("connectBtn").style.display = "none";
            document.querySelector('label[for="serverAddress"]').style.display = "none";
            players = players.filter(player => player !== undefined && player !== null);

            players.sort((a, b) => a.name.localeCompare(b.name));
            // console.log(players);
            if (players.length === 0) {
                removeRankingContainerIfEmpty();
                alert("Aucun joueur trouvé");
                return;
            }

            showPlayers(players);
            createRankingContainer(players);
            // console.log(players);
            // console.log("Nom :", data.name);
            // console.log("Nom :", data.name);
        } catch (error) {
            console.log("Erreur lors du chargement :", error);
            // alert("Echec de la connection au serveur");
        }

        // console.log(url);
    })


}

async function loadPlayerStats(name) {
    const address = document.getElementById("serverAddress").value.trim();
    if (!address) {
        alert("Veuillez entrer une adresse serveur (IP:PORT)");
        return;
    }

    // console.log(name);

    try {
        const url = `http://${address}/api/stats?name=${name}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Erreur HTTP : " + response.status);
        }

        const data = await response.json();
        // console.log("zgbr", data);
        return data;
        // console.log("Nom :", data.name);
        // console.log("Nom :", data.name);
    } catch (error) {
        console.log("Erreur lors du chargement :", error);
        // alert("Echec de la connection au serveur");
    }

    // console.log(url);

}


function createPlayerSelect() {
    const container = document.getElementById("server-config");

    // Supprimer ancien select et bouton si existants
    const oldSpan = document.getElementById("span");
    if (oldSpan) oldSpan.remove();

    const label = container.querySelector("label[for='playerSelect']");
    if (label) label.remove();

    // Création du nouveau label et select
    const newLabel = document.createElement("label");
    newLabel.setAttribute("for", "playerSelect");
    newLabel.textContent = " 🎮 Voir les stats d'un joueur :";

    const span = document.createElement("span");
    span.id = "span";
    span.innerHTML = "";

    const select = document.createElement("select");
    select.id = "playerSelect";
    select.classList.add("player-select");

    const button = document.createElement("button");
    button.textContent = "Classement général";
    button.id = "generalRanking";

    container.appendChild(newLabel);
    span.appendChild(select);
    span.appendChild(button);
    container.appendChild(span);
}


function showPlayers(players) {
    createPlayerSelect();
    const select = document.getElementById("playerSelect");
    select.innerHTML = "";

    players.forEach(player => {
        if (player === undefined) delete players.player;
        const option = document.createElement("option");
        // console.log(player.name);
        let name = player.name;

        if (name.length > 9) {
            name = name.slice(0, 9) + "...";
        }

        option.value = player.name;
        option.textContent = name;
        select.appendChild(option);

    });


    select.addEventListener("change", () => {
        const selectedPlayerName = select.value;
        // console.log("Joueur sélectionné :", selectedPlayerName);
        loadPlayerStats(selectedPlayerName).then(selectedPlayer => {
            // console.log(selectedPlayer);
            // console.log("Joueur sélectionné :", selectedPlayer);
            showStatsPlayer(selectedPlayer);
        });
        highlightPlayerInTable(selectedPlayerName);

        // const selectedPlayer = await loadPlayerStats(selectedPlayerName);


    });
}

function showStatsPlayer(player) {
    // const rankingPlayer = findRankPlayer(player.name);
    const container = document.getElementById("server-config");
    const stats = document.createElement("div");
    const oldstats = document.getElementById("playerStats");
    if (oldstats) oldstats.remove();
    stats.innerHTML = `
        <strong>${player.name}</strong>
        <ul>
           <li>Parties jouées : <span>${player.gamesPlayed}</span></li>
            <li>Nombre de Kills : <span>${player.totalKills}</span></li>
            <li>Nombre de Morts : <span>${player.totalDeaths}</span></li>
            <li>Ratio K/D : <span>${player.kdRatio}</span></li>
            <li>Position dans le CDP : <span>${player.lastGameRank}</span></li>
            <li>Classement moyen : <span>${player.overallRanking}</span></li>

        </ul>
    `;

    stats.id = "playerStats";
    container.appendChild(stats);

}

let rankingVisible = false;

function createRankingContainer(players) {
    const button = document.getElementById("generalRanking");

    button.addEventListener("click", async () => {

        const rankingDiv = getRankingContainer();

        // Si le tableau est déjà visible → on le supprime
        if (rankingVisible) {
            removeRankingContainerIfEmpty();
            rankingDiv.innerHTML = ""; // supprime tableau + filtre
            rankingVisible = false;
            return;
        }

        // Sinon, on charge les stats si nécessaire
        if (playersStats.length === 0) {
            playersStats = await Promise.all(
                players.map(p => loadPlayerStats(p.name))
            );

            // enlever les joueurs null
            playersStats = playersStats.filter(p => p !== null);
        }

        showGeneralRanking(playersStats);
        sortBy(playersStats);

        rankingVisible = true;
    });
}


function removeRankingContainerIfEmpty() {

    const div = document.getElementById("rankingContainer");
    if (div) div.remove();
    rankingVisible = false;

}



function showGeneralRanking(players, highlightColumn) {
    players = players.filter(p => p && p.name);
    const rankingDiv = getRankingContainer();

    // Supprimer seulement l'ancien tableau
    const oldTable = rankingDiv.querySelector("table");
    if (oldTable) oldTable.remove();

    const table = document.createElement("table");
    table.style.borderCollapse = "collapse";
    table.style.width = "100%";

    table.innerHTML = `
        <thead>
            <tr>
                <th>Position</th>
                <th>Classement Moyen</th>
                <th>Joueur</th>
                <th>Kills</th>
                <th>Morts</th>
                <th>Ratio K/D</th>
                <th>Position CDP</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    players.forEach((player, index) => {
        const tr = document.createElement("tr");
        tr.dataset.playerName = player.name;

        let medal = "";
        if (index === 0) medal = "🥇";
        else if (index === 1) medal = "🥈";
        else if (index === 2) medal = "🥉";

        tr.innerHTML = `
        <td>${medal} ${index + 1}</td>
        <td>${player.overallRanking}</td>
        <td>${player.name}</td>
        <td>${player.totalKills}</td>
        <td>${player.totalDeaths}</td>
        <td>${player.kdRatio}</td>
        <td>${player.lastGameRank}</td>
    `;
        if (highlightColumn !== null && tr.children[highlightColumn]) {
            tr.children[highlightColumn].classList.add("highlight");
        } else {
            tr.children[2].classList.add("highlight");
        }
        tbody.appendChild(tr);

        tr.addEventListener("click", async () => {
            showStatsPlayer(player);
            highlightPlayerInTable(player.name);
            const select = document.getElementById("playerSelect");
            if (select) {
                select.value = player.name;
            }

        })
    });




    rankingDiv.appendChild(table);
}

function highlightPlayerInTable(playerName) {
    const rows = document.querySelectorAll("#rankingContainer table tbody tr");

    rows.forEach(row => {
        row.classList.remove("selected-player");
        if (row.dataset.playerName === playerName) {
            row.classList.add("selected-player");
        }
    });
}



function sortBy(players) {
    const div = getRankingContainer();
    let highlightColumn = null;

    // supprimer ancien select
    const oldSelect = document.getElementById("sortSelect");
    if (oldSelect) oldSelect.remove();

    const filter = document.createElement("select");
    filter.id = "sortSelect";

    const filters = [
        "Pseudo",
        "Classement Moyen",
        "Kills",
        "Morts",
        "Ratio K/D",
        "Position CDP"
    ];

    filters.forEach(f => {
        const option = document.createElement("option");
        option.value = f;
        option.textContent = f;
        filter.appendChild(option);
    });

    div.prepend(filter);

    filter.addEventListener("change", () => {
        let sortedPlayers = [...players];

        switch (filter.value) {
            case "Classement Moyen":
                sortedPlayers.sort((a, b) => a.overallRanking - b.overallRanking);
                highlightColumn = 1;
                break;
            case "Pseudo":
                sortedPlayers.sort((a, b) => a.name.localeCompare(b.name));
                highlightColumn = 2;
                break;
            case "Kills":
                sortedPlayers.sort((a, b) => b.totalKills - a.totalKills);
                highlightColumn = 3;
                break;
            case "Morts":
                sortedPlayers.sort((a, b) => b.totalDeaths - a.totalDeaths);
                highlightColumn = 4;
                break;
            case "Ratio K/D":
                sortedPlayers.sort((a, b) => b.kdRatio - a.kdRatio);
                highlightColumn = 5;
                break;
            case "Position CDP":
                sortedPlayers.sort((a, b) => a.lastGameRank - b.lastGameRank);
                highlightColumn = 6;
                break;
        }

        showGeneralRanking(sortedPlayers, highlightColumn);
    });
}


function getRankingContainer() {
    let div = document.getElementById("rankingContainer");

    if (!div) {
        div = document.createElement("div");
        div.id = "rankingContainer";
        div.style.marginTop = "20px";
        document.body.appendChild(div);
    }

    return div;
}

setInterval(() => {
    loadPlayers();

}, 5000);