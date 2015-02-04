/**
 * Created by derektu on 1/6/15.
 */

/*
    The main lottery manager
 */
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');

var EmployeeLoader = require('./employeeloader.js');

var Lottery = function(options) {
    /*
        init()
        - load employee data
        - load winner result
        - get ready to play

        drawWinner(n)
        - return the next n winners
        - update winner result

        reset()
        - reset winner result

     */

    var self = this;

    self.employeeList = [];
    self.winnerList = [];
    self.candidates = [];

    self.winnerFile = '';

    /**
     * Initialize (loading data etc.)
     *
     * options = {
     *   dataFolder:'..'
     * }
     */
    self.init = function(options) {
        options = options || {};
        options.dataFolder = options.dataFolder || '.';

        self.winnerFile = options.dataFolder + 'winner.json';
        self.employeeList = EmployeeLoader.load(options.dataFolder + 'employee.xlsx');
        self.winnerList = self.loadWinner();

        self.candidates = self.buildCandidates();
    };

    /**
     * Draw the next N winners
     * @param count
     */
    self.drawWinner = function(count) {
        var ret = [];
        for (var i = 0; i < count && self.candidates.length > 0; i++) {
            self.candidates = _.shuffle(self.candidates);
            var iWinner = _.random(0, self.candidates.length - 1);
            var winner = self.candidates[iWinner];
            ret.push(winner);
            self.winnerList.push(winner);
            self.candidates.splice(iWinner, 1);
        }

        self.saveWinner(self.winnerList);

        return ret;
    };

    /**
     * Undo last draw: put back winners
     * @param winners
     */
    self.undoDraw = function(winners) {
        var withDrawed = self.giveup(winners);
        _.each(withDrawed, function(w) {
            self.candidates.push(w);
        });

        self.candidates = _.shuffle(self.candidates);

        self.saveWinner(self.winnerList);
    };

    /**
     * Whoever wins, and decides to give up
     * @param employees list of winner that are willing to give up
     */
    self.giveup = function(winners) {
        var ret = [];
        _.each(winners, function(winner) {
            var removed = _.remove(self.winnerList, function(w) {
               return w.depart == winner.depart && w.name == winner.name;
            });

            if (removed && removed.length > 0) {
                ret.push(removed[0]);
            }
        });

        self.saveWinner(self.winnerList);

        return ret;
    };

    /**
     * Reset the whole game
     */
    self.reset = function() {
        self.winnerList = [];
        self.candidates = self.buildCandidates();

        self.saveWinner(self.winnerList);
    };

    /**
     * Return # of winners so far
     */
    self.getWinnerCount = function() {
        return self.winnerList.length;
    };

    /**
     * Return # of candidates that are still in the game.
     */
    self.getMaxDrawCount = function() {
        return self.candidates.length;
    };

    self.buildCandidates = function() {
        var map = {};
        _.each(self.employeeList, function(employee) {
            map[employee.depart + ':' + employee.name] =employee;
        });

        _.each(self.winnerList, function(winner) {
            delete map[winner.depart + ':' + winner.name];
        });

        var temp = _.map(map, function(value) { return value; });

        // Let's shuffle !!
        //
        for (var i = 0; i < 10; i++) {
            temp = _.shuffle(temp);
        }

        return temp;
    };

    self.loadWinner = function() {
        if (fs.existsSync(self.winnerFile)) {
            var data = fs.readFileSync(self.winnerFile);
            return JSON.parse(data);
        }
        else {
            return [];
        }
    };

    self.saveWinner = function(winnerList) {
        var data = JSON.stringify(winnerList);
        fs.writeFileSync(self.winnerFile, data);
    }
};

module.exports = Lottery;
