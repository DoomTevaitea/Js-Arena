import Player from "./Player.js"
// import { direction } from "./Player.js"
export default class Game {
   constructor(){
      this.isRunning = false;
      this.isOver = false;

      this.timer = 0;

      this.players = {};
      this.ranking = {
        "isAlive" : [],
        "isDying" : []
      }
      setInterval(() => {
            if(this.isRunning && !this.isOver) {
                this.timer++;
            }
        }, 1000);
        
    }
    getElapsedTime() {
        const seconds =  Math.floor(this.timer);
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        const hh = h.toString().padStart(2, '0');
        const mm = m.toString().padStart(2, '0');
        const ss = s.toString().padStart(2, '0');

        return `${hh}:${mm}:${ss}`;
    }


   update(gameStateFromServer) {
        this.isRunning = gameStateFromServer.isRunning;
        this.isOver = gameStateFromServer.isOver;
        this.timer = gameStateFromServer.timer;

        for(let playerId in gameStateFromServer.players) {
            let backendPlayer = gameStateFromServer.players[playerId]
            //console.log(backendPlayer.position);
            if(!this.players[playerId]) {
                this.players[playerId] = new Player (
                    playerId,
                    backendPlayer.name,
                    backendPlayer.skinPath,
                    backendPlayer.position
                )
            } 
            this.players[playerId].update(backendPlayer)

        }


        for (let frontPlayerId in this.players) {
            if (!(frontPlayerId in gameStateFromServer.players)) {
                delete this.players[frontPlayerId];
            }
        }
    }
    getAlivePlayersCount() {
        let alive = 0;
        let total = 0;

        for (let id in this.players) {
            total++;
            if (!this.players[id].isDying && this.players[id].hp > 0) {
                alive++;
            }
        }

        return { alive, total };
    }
    getRanking() {
        // Reset
        this.ranking.isAlive = [];
        this.ranking.isDying = [];

        // Séparation vivants / morts
        for (let id in this.players) {
            const player = this.players[id];

            if (!player.isDying && !player.isDead) {
                this.ranking.isAlive.push(player);
            } else {
                this.ranking.isDying.push(player);
            }
        }

        // Tri des vivants par niveau décroissant
        this.ranking.isAlive.sort((a, b) => b.lvl - a.lvl);
    }


}

