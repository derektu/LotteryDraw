/**
 * Created by derektu on 1/11/15.
 */

var Game = require('../lib/game.js');
var assert = require('assert');
var _ = require('lodash');

describe("Test Game", function() {

    function oneRun2() {
        var options = {dataFolder:'./data/'};
        var game = new Game();
        game.init(options);
        game.reset();

        var winnerMap = {};
        var totalWinnerList = [];

        function getFirstPrizeIndex(game) {
            var i;
            for (i = 0; i < game.prizeList.length; i++) {
                var prize = game.prizeList[i];
                var winnerList = game.winners.getWinners(prize.id);
                if (prize && prize.count > 0 && prize.count > winnerList.length)
                    return i;
            }
            return -1;
        }

        var winnerMap = {};
        var totalWinnerList = [];

        while (true) {
            var game = new Game();
            game.init(options);

            var idx = getFirstPrizeIndex(game);
            if (idx < 0)
                break;

            var prize = game.prizeList[idx];
            var winnerList = game.drawPrize(prize.id, 10);
            _.each(winnerList, function(winner) {
                var key = winner.depart + ':' + winner.name;
                if (winnerMap[key]) {
                    console.log('duplicate ID: ' + winner.depart + ':' + winner.name);
                    assert.fail();
                }
                winnerMap[key] = winner;
                totalWinnerList.push(winner);
            });
        }

        console.log('total draw count = ' + totalWinnerList.length);

        return totalWinnerList;
    }

    function oneRun() {
        var options = {dataFolder:'./data/'};
        var game = new Game();
        game.init(options);
        game.reset();

        var winnerMap = {};
        var totalWinnerList = [];

        _.each(game.prizeList, function(prize) {
            while (true) {
                var winnerList = game.drawPrize(prize.id, 10);
                _.each(winnerList, function(winner) {
                    var key = winner.depart + ':' + winner.name;
                    if (winnerMap[key]) {
                        console.log('duplicate ID: ' + winner.depart + ':' + winner.name);
                        assert.fail();
                    }
                    winnerMap[key] = winner;
                    totalWinnerList.push(winner);
                });

                if (winnerList.length < 10)
                    break;
            }
        });

        console.log('total draw count = ' + totalWinnerList.length);

        return totalWinnerList;
    }

    it.skip("test", function(done) {
        oneRun();
        done();
    });

    it.skip("testOneRunLoop", function(done) {
        var COUNT = 500;
        var list = [];
        for (var i = 0; i < COUNT; i++) {
            var winnerList = oneRun();
            list.push(winnerList[winnerList.length-1]);
        }

        var map = _.map(_.countBy(list, function(winner) { return winner.depart + ':' + winner.name; }), function(value, key) {
            return { id:key, count:value};
        });

        var sorted = _.sortBy(map, 'count');

        console.log('=====================================================');
        console.log('TOTAL TEST=' + COUNT + ' reduced to=' + sorted.length);
        console.log(sorted);
    });

    it.skip("test2", function(done) {
        oneRun2();
        done();
    });

    it("testOneRun2Loop", function(done) {
        var COUNT = 500;
        var list = [];
        for (var i = 0; i < COUNT; i++) {
            var winnerList = oneRun2();
            list.push(winnerList[winnerList.length-1]);
        }

        var map = _.map(_.countBy(list, function(winner) { return winner.depart + ':' + winner.name; }), function(value, key) {
            return { id:key, count:value};
        });

        var sorted = _.sortBy(map, 'count');

        console.log('=====================================================');
        console.log('TOTAL TEST=' + COUNT + ' reduced to=' + sorted.length);
        console.log(sorted);
    });


    it.skip("test init", function(done) {

        var prizeId = 4;
        var prizeTotal = 3;

        var options = {dataFolder:'./data/'};
        var game = new Game();
        game.init(options);

        var winners = [];
        while (true) {
            var list = game.drawPrize(prizeId, 1);
            if (list.length == 0)
                break;
            else
                winners = winners.concat(list);
        }

        assert.equal(winners.length, prizeTotal);

        console.log(winners);

        var giveup = game.giveUp(prizeId, winners);

        console.log(giveup);

        assert.equal(giveup.length, prizeTotal);

        done();
    });
});

