export default class GameController {
  constructor(game, gameView) {
    this.game = game;
    this.gameView = gameView;

    // Server sends updates at 20 ticks per second
    this.SERVER_TICK_RATE = 20;
    // Duration between two server ticks in milliseconds
    this.SERVER_INTERVAL = 1000 / this.SERVER_TICK_RATE;
    this.lastServerUpdate = performance.now();

    const userData = JSON.parse(localStorage.getItem("jsArenaPlayer"));
    this.pseudo = userData.pseudo;
    this.serverUrl = userData.serverUrl;
    this.skinPath = userData.skinPath;

    this.socket = new WebSocket(this.serverUrl);

    this.inputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      attack: false
    };

    this.initSocket();
    this.initInput();
    this.startInputSender();

    // Permanently bind "this" at the instance of the GameController class
    this.loop = this.loop.bind(this);
    // Regulates framerate to keep 60fps
    requestAnimationFrame(this.loop);
  }

  // === Main render loop ===
  loop(timestamp) {
    // Temps écoulé depuis la dernière update serveur
    const elapsed = timestamp - this.lastServerUpdate;

    // Progression entre deux ticks serveur
    let alpha = elapsed / this.SERVER_INTERVAL;
    alpha = Math.min(alpha, 1); // sécurité

    // On transmet alpha au jeu (ou directement aux joueurs)
    for (let playerId in this.game.players) {
      this.game.players[playerId].interpolate(alpha);
    }

    this.gameView.render();
    requestAnimationFrame(this.loop);

    // === Partie 7 : Boucle de rendu ===
    // Affichage des informations de l'état du jeu
    // console.group("État du jeu");
    // console.log("Chronomètre:", this.game.timer);
    // console.log("Jeu en cours:", this.game.isRunning);
    // console.log("Jeu terminé:", this.game.isOver);
    // console.log("Joueurs:", this.game.players);
    // console.groupEnd();
  }

  initSocket() {
    this.socket.onopen = () => {
      console.log("Connexion WebSocket établie avec le backend");
      this.socket.send(JSON.stringify({
        name: this.pseudo,
        skinPath: this.skinPath
      }));
    };

    this.socket.onmessage = (event) => {
      const gameStateFromServer = JSON.parse(event.data);
      //console.log(gameStateFromServer);

      // On note le moment exact de l’update serveur
      this.lastServerUpdate = performance.now();
      this.game.update(gameStateFromServer);
    };
  }

  initInput() {
    document.addEventListener("keydown", (event) => {
      switch (event.key) {
        case "z":
        case "ArrowUp":
          this.inputState.up = true;
          break;
        case "s":
        case "ArrowDown":
          this.inputState.down = true;
          break;
        case "d":
        case "ArrowRight":
          this.inputState.right = true;
          break;
        case "q":
        case "ArrowLeft":
          this.inputState.left = true;
          break;
      }
      //console.log(this.inputState);
    });

    document.addEventListener("keyup", (event) => {
      switch (event.key) {
        case "z":
        case "ArrowUp":
          this.inputState.up = false;
          break;
        case "s":
        case "ArrowDown":
          this.inputState.down = false;
          break;
        case "d":
        case "ArrowRight":
          this.inputState.right = false;
          break;
        case "q":
        case "ArrowLeft":
          this.inputState.left = false;
          break;
      }
      //console.log(this.inputState);
    });

    window.addEventListener("mousedown", (event) => {
      if (event.button === 0) {
        this.inputState.attack = true;
      }
      //console.log(this.inputState);
    });

    window.addEventListener("mouseup", (event) => {
      if (event.button === 0) {
        this.inputState.attack = false;
      }
    });

    // Empêche le menu contextuel par défaut au clic droit
    window.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      //console.log(this.inputState);
    });
  }

  startInputSender() {
    setInterval(() => {
      if (this.socket.readyState !== WebSocket.OPEN) return;

      const message = {
        type: "input",
        input: this.inputState
      };
      this.socket.send(JSON.stringify(message));
    }, this.SERVER_INTERVAL);
  }
}
// === Start the game controller by instantiating the GameController class ===
// This line will execute the constructor (e.g, launch the frontend)
