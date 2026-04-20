export default class GameView {
    constructor(game) {
        this.game = game;
        this.canvas = document.getElementById("canvas");
        this.ranking = document.getElementById("ranking");

        this.canvas.width = 900;
        this.canvas.height = 900;

        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.ctx = this.canvas.getContext("2d");
        this.FRAME_SIZE = 64;

        // === CONFIGURATION DES TAILLES D'ATTAQUE ===
        // Liste des skins qui ont des attaques TRÈS GRANDES (192x192)
        // Ajoutez ici les noms de vos fichiers (ex: "4.png", "boss.png")
        this.LARGE_ATTACK_SKINS = [
            "1.png",
            "2.png",
            "3.png",
            "4.png",
            "5.png",
            "6.png",
            "8.png",
            "9.png",
            "10.png",
            "11.png",
            "12.png",
            "14.png",
            "15.png",
            "16.png",
            "17.png",
            "19.png",
            "20.png",
            "22.png",
            "23.png",
            "25.png",
            "27.png",
            "28.png",
        ];



        this.spriteCache = {};
        this.drawBackground();
        this.clear();

    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawBackground() {
        const ctx = this.ctx;

        // === FOND DÉGRADÉ ===
        const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, "#1e1e2f");
        gradient.addColorStop(1, "#0f0f1a");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);

        // === GRILLE DISCRÈTE ===
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;

        const gridSize = 64;

        for (let x = 0; x <= this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // === CADRE DE L’ARÈNE ===
        ctx.strokeStyle = "#ff0000";
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, this.width, this.height);

        // === EFFET LUMIÈRE CENTRALE ===
        const light = ctx.createRadialGradient(
            this.width / 2,
            this.height / 2,
            50,
            this.width / 2,
            this.height / 2,
            this.width / 1.2
        );

        light.addColorStop(0, "rgba(255,255,255,0.05)");
        light.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = light;
        ctx.fillRect(0, 0, this.width, this.height);
    }


    render() {
        this.clear();
        this.drawBackground();

        for (let id in this.game.players) {
            this.drawPlayer(this.game.players[id]);
        }
        this.drawAliveIndicator();
        this.drawRanking(this.game);
        if (this.game.isOver) {
            const alivePlayers = Object.values(this.game.players).filter(p => !p.isDying && !p.isDead);
            console.log(alivePlayers);
            if (alivePlayers.length === 1) {
                const winner = alivePlayers[0];
                this.showWinner(winner);
            }
        }
    }


    drawPlayer(player) {
        if (player.isDying) return;

        // 1. GESTION DU CACHE
        let sprite = this.spriteCache[player.skinPath];
        if (!sprite) {
            sprite = new Image();
            sprite.src = player.skinPath;
            this.spriteCache[player.skinPath] = sprite;
            return;
        }

        if (!sprite.complete || sprite.naturalWidth === 0) return;

        // Conversion position
        let canvasX, canvasY;
        if (Array.isArray(player.position)) {
            canvasX = player.renderX * this.width;
            canvasY = player.renderY * this.height;
        }

        // Animation logic
        if (player.animate) player.animate();

        // --- LOGIQUE D'AFFICHAGE ---
        let frameX = 0;
        let frameY = 0;

        let sourceWidth = 64;
        let sourceHeight = 64;
        let destWidth = 64;
        let destHeight = 64;

        // Position de dessin par défaut
        let drawX = canvasX;
        let drawY = canvasY;

        const direction = player.direction;
        const directionMap = { 0: 0, 1: 3, 2: 2, 3: 1 };

        if (direction !== undefined && directionMap[direction] !== undefined) {
            const mappedDir = directionMap[direction];

            // === CAS 0 : MORT (Priorité absolue) ===
            if (player.isDying) {
                // La ligne 20 correspond généralement à l'animation "Hurt/Collapse" sur les sprites LPC
                frameY = 20 * this.FRAME_SIZE;

                if (player.deathSpriteIndex !== undefined) {
                    frameX = player.deathSpriteIndex * this.FRAME_SIZE;
                }
                // On garde la taille standard 64x64 pour la mort
            }

            // === CAS 1 : ATTAQUE ===
            else if (
                player.isAttacking ||
                player.attackSpriteIndex > 0 ||
                player.attackFrameCounter > 0
            ) {
                const skinName = player.skinPath.split("/").pop();
                const isLarge = this.LARGE_ATTACK_SKINS.includes(skinName);

                if (isLarge) {
                    // 192x192
                    const size = 192;
                    sourceWidth = size;
                    sourceHeight = size;
                    destWidth = size;
                    destHeight = size;

                    const attackRows = { 0: 54, 1: 63, 2: 60, 3: 57 };
                    frameY = (attackRows[direction] || 60) * this.FRAME_SIZE;

                    drawX = canvasX - 64;
                    drawY = canvasY - 64;

                    if (player.attackSpriteIndex !== undefined)
                        frameX = player.attackSpriteIndex * size;
                } else {
                    // 128x128
                    const size = 128;
                    sourceWidth = size;
                    sourceHeight = size;
                    destWidth = size;
                    destHeight = size;

                    const attackRows = { 0: 54, 1: 60, 2: 58, 3: 56 };
                    frameY = (attackRows[direction] || 58) * this.FRAME_SIZE;

                    drawX = canvasX - 32;
                    drawY = canvasY - 32;

                    if (player.attackSpriteIndex !== undefined)
                        frameX = player.attackSpriteIndex * size;
                }
            }
            // === CAS 2 : MARCHE ===
            else if (player.isWalking) {
                frameY = (mappedDir + 8) * this.FRAME_SIZE;
                if (player.walkSpriteIndex !== undefined) {
                    frameX = player.walkSpriteIndex * this.FRAME_SIZE;
                }
            }
            // === CAS 3 : IDLE ===
            else {
                frameY = mappedDir * this.FRAME_SIZE;
            }
        }

        // 1. Dessiner le personnage
        this.ctx.drawImage(
            sprite,
            frameX,
            frameY,
            sourceWidth,
            sourceHeight,
            drawX,
            drawY,
            destWidth,
            destHeight,
        );
        // 2. Dessiner la barre de vie (Si le joueur n'est pas mort)
        if (!player.isDying && player.hp > 0) {
            const barWidth = 40;
            const barHeight = 5;
            const cdHeight = 3;
            const barX = canvasX + (64 - barWidth) / 2; // Centré sur la case de 64px
            const barY = canvasY - 3; // Au-dessus de la tête
            const cdY = barY + barHeight + 1;

            // Fond rouge (dégâts/vide)
            this.ctx.fillStyle = "rgba(255, 0, 0, 0.7)";
            this.ctx.fillRect(barX, barY, barWidth, barHeight);

            // Barre verte (vie actuelle)
            const hpPercent = Math.max(0, player.hp / player.maxHp); // S'assurer que ça ne descend pas sous 0
            this.ctx.fillStyle = "#00ff00";
            this.ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
            const levelX = barX - 10; // Décalé à gauche de la barre
            const levelY = barY + 4;
            // Fond du badge (Cercle sombre)
            this.ctx.beginPath();
            this.ctx.arc(levelX, levelY, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = "#222";
            this.ctx.fill();

            // Bordure dorée
            this.ctx.strokeStyle = "#ffd700"; // Or
            this.ctx.lineWidth = 1.5;
            this.ctx.stroke();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "bold 8px Arial";
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            this.ctx.fillText(player.lvl, levelX, levelY);


            // Petite bordure noire pour faire propre (optionnel)
            this.ctx.strokeStyle = "black";
            this.ctx.lineWidth = 0.5;
            this.ctx.strokeRect(barX, barY, barWidth, barHeight);

            // --- Barre de Cooldown ---
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            this.ctx.fillRect(barX, cdY, barWidth, cdHeight);

            let cdRatio = 1;
            if (player.attackCooldown > 0) {
                const current = player.currentAttackCooldown || 0;
                cdRatio = 1 - (current / player.attackCooldown);
            }
            cdRatio = Math.max(0, Math.min(1, cdRatio));

            this.ctx.fillStyle = "#00d2ff";
            this.ctx.fillRect(barX, cdY, barWidth * cdRatio, cdHeight);
            this.ctx.strokeRect(barX, cdY, barWidth, cdHeight);


        }



        // 3. Dessiner le Pseudo
        this.ctx.fillStyle = "#ffffff";
        this.ctx.font = "14px Arial";
        this.ctx.textAlign = "center";
        this.ctx.fillText(player.name, canvasX + 32, canvasY + 80);

        // timer
        this.ctx.font = "16px Arial";
        this.ctx.textAlign = "center";
        this.ctx.textBaseline = "top";
        this.ctx.fillText(this.game.getElapsedTime(), this.canvas.width / 2, 20);

        //nombre de joueurs vivant 


    }
    drawAliveIndicator() {
        const { alive, total } = this.game.getAlivePlayersCount();

        this.ctx.font = "14px Arial";
        this.ctx.fillStyle = "#ffffff";
        this.ctx.textAlign = "left";
        this.ctx.textBaseline = "top";

        const text = `${alive} / ${total} joueurs en vie`;

        this.ctx.fillText(text, 12, 12);
    }
    drawRanking(game) {
        game.getRanking();
        // Nettoyer l'affichage
        this.ranking.innerHTML = "";

        let position = 1;
        if (Object.keys(game.players).length > 0) {
            this.ranking.style.padding = "1rem";
            this.ranking.style.border = "2px solid #0008f5";
            this.ranking.style.borderRadius = "2px";
        }


        // === JOUEURS VIVANTS ===
        for (let i = 0; i < game.ranking.isAlive.length; i++) {
            const player = game.ranking.isAlive[i];

            const line = document.createElement("div");
            line.textContent = `${position}. 🟢 ${player.name} (Lvl ${player.lvl})`;
            this.ranking.appendChild(line);

            position++;
        }

        // === JOUEURS MORTS ===
        for (let i = 0; i < game.ranking.isDying.length; i++) {
            const player = game.ranking.isDying[i];

            const line = document.createElement("div");

            // numéro (normal)
            const number = document.createElement("span");
            number.textContent = `${position}. 🔴 `;

            // nom (rouge)
            const name = document.createElement("span");
            name.textContent = `${player.name} (Lvl ${player.lvl})`;
            name.style.color = "red"; // 👈 uniquement le nom

            line.appendChild(number);
            line.appendChild(name);

            this.ranking.appendChild(line);
            position++;
        }

    }
    showWinner(winner) {
        const ctx = this.ctx;

        // 1. Effacer le canvas
        this.clear();
        this.drawBackground();

        // 2. Afficher un message "Victoire"
        ctx.fillStyle = "#ffd700";
        ctx.font = "bold 40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText("🏆 VAINQUEUR 🏆", this.width / 2, 50);

        // 3. Afficher le nom du vainqueur
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 30px Arial";
        ctx.textBaseline = "top";
        ctx.fillText(winner.name, this.width / 2, 120);

        // 4. Afficher le skin du vainqueur
        let sprite = new Image();
        sprite.src = winner.skinPath;
        console.log(winner.skinPath);
        sprite.onload = () => {
            const FRAME = 64;

            // Idle sud (ligne 2 sur LPC)
            const frameX = 0;
            const frameY = 2 * FRAME;

            const spriteSize = 128;

            ctx.drawImage(
                sprite,
                frameX, frameY,
                FRAME, FRAME,
                (this.width - spriteSize) / 2,
                200,
                spriteSize,
                spriteSize
            );
        };


        // 5. Optionnel : ajouter un halo ou effet
        const gradient = ctx.createRadialGradient(this.width / 2, 250, 10, this.width / 2, 250, 150);
        gradient.addColorStop(0, "rgba(255, 215, 0, 0.6)");
        gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.width, this.height);
    }

}