import Game from "./model/Game.js";
import GameView from "./View/GameView.js";
import GameController from "./Controlleur/GameController.js";

//Model
const game = new Game();
//View
const gameView = new GameView(game);
//Controller (launch game)
const gameController = new GameController(game, gameView); 