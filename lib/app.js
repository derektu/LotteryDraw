/**
 * Created by derektu on 1/6/15.
 */

/*
    Main app
    - initialize different components and kick off the main web server
 */

var WebServer = require('./webserver.js');

var Game = require('./game.js');

var options = {dataFolder:'./data/', ttsFolder:'./tts'};
game = new Game();
game.init(options);

new WebServer(3000, game).run();
