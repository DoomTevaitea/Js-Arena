document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("game");
    const ctx = canvas.getContext("2d");

    const SPRITE_WIDTH = 64;
    const SPRITE_HEIGHT = 64;
    const HOVER_SCALE = 1.3; 
    const sprites = [];
    const spritePositions = [];

    let selectedSpriteIndex = null;
    let hoveredSpriteIndex = null;

    for (let i = 1; i < 30; i++) {
        const img = new Image();
        img.src = `assets/${i}.png`;
        sprites.push(img);
    }

    sprites[0].onload = () => {
        drawSprites();
    };

    function drawSprites() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        let x = 15;
        let y = 0;

        sprites.forEach((sprite, index) => {

            const isHovered = hoveredSpriteIndex === index;
            const isSelected = selectedSpriteIndex === index;

            const scale = isHovered || isSelected ? HOVER_SCALE : 1;
            const drawWidth = SPRITE_WIDTH * scale;
            const drawHeight = SPRITE_HEIGHT * scale;

            const drawX = x + (SPRITE_WIDTH - drawWidth) / 2;
            const drawY = y + (SPRITE_HEIGHT - drawHeight) / 2;

            ctx.drawImage(
                sprite,
                0, 128,
                SPRITE_WIDTH, SPRITE_HEIGHT,
                drawX, drawY,
                drawWidth, drawHeight
            );

            spritePositions[index] = {
                x,
                y,
                width: SPRITE_WIDTH,
                height: SPRITE_HEIGHT,
                index
            };

            x += SPRITE_WIDTH;
            if (x + SPRITE_WIDTH > canvas.width) {
                x = 15;
                y += SPRITE_HEIGHT;
            }
        });
    }

    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        const hovered = spritePositions.find(pos =>
            mouseX >= pos.x &&
            mouseX <= pos.x + pos.width &&
            mouseY >= pos.y &&
            mouseY <= pos.y + pos.height
        );

        hoveredSpriteIndex = hovered ? hovered.index : null;
        canvas.style.cursor = hovered ? "pointer" : "default";

        drawSprites();
    });

    canvas.addEventListener("click", (event) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        const clicked = spritePositions.find(pos =>
            clickX >= pos.x &&
            clickX <= pos.x + pos.width &&
            clickY >= pos.y &&
            clickY <= pos.y + pos.height
        );

        if (clicked) {
            selectedSpriteIndex = clicked.index; 
            console.log(`Sprite sélectionné : ${clicked.index + 1}.png`);
            drawSprites();
        }
    });

    const playBtn = document.getElementById("playBtn");

    playBtn.addEventListener("click", () => {

    const pseudo = document.getElementById("pseudo").value.trim();
    const serverUrl = document.getElementById("serverUrl").value.trim();

    if (!pseudo || !serverUrl) {
        alert("Veuillez remplir tous les champs !");
        return;
    }

    if (selectedSpriteIndex === null) {
        alert("Veuillez sélectionner un sprite !");
        return;
    }

    const skinPath = `assets/${selectedSpriteIndex + 1}.png`;

    const playerData = {
    pseudo: pseudo,
    serverUrl: serverUrl,
    skinPath: skinPath,
    };
    localStorage.setItem("jsArenaPlayer", JSON.stringify(playerData));

    console.log("Connexion validée :", playerData);
    window.location.href = "game.html";

    });

});