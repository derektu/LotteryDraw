/**
 * Created by derektu on 1/6/15.
 */

var Lottery = require('../lib/lottery.js');

describe("Test Lottery", function() {

    it.skip("test init Lottery", function(done) {
        var lottery = new Lottery();

        var options = {dataFolder:'./data/'};
        lottery.init(options);

        console.log('Candidates in the game:' + lottery.getMaxDrawCount());

        for (var i = 0; i < 2; i++) {
            var winners = lottery.drawWinner(5);
            console.log(winners);
            lottery.giveup([winners[0]]);
        }

        done();
    });
});
