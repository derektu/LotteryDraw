/**
 * Created by derektu on 1/11/15.
 */

/*
    Party抽獎遊戲engine
 */
"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs');

var EmployeeLoader = require('./employeeloader.js');
var PrizeLoader = require('./prizeloader.js');
var EmployeeTTSSvc = require('./employeetts.js');

var logger = require('./logger').getLogger('[game]');

var Game = function() {
    /*
        init()
        - load employee data
        - load prize data
        - load winner data
        - get ready to play

        reset()
        - reset winner result
     */

    var self = this;

    /**
     * Internal helper class to hold extra prize (加碼)
     * @param pzFile
     * @constructor
     */
    var PrizeExtra = function(pzFile) {
        var self = this;

        self.file = pzFile;

        /*
            a map of (prizeId, count)
         */
        self.map = load(self.file);

        function load(file) {
            if (fs.existsSync(file)) {
                var data = fs.readFileSync(file);
                return JSON.parse(data);
            }
            else {
                return {};
            }
        }

        function save(file) {
            var data = JSON.stringify(self.map);
            fs.writeFileSync(file, data);
        }

        /**
         * Reset winner records
         */
        self.reset = function() {
            self.map = {};
            save(self.file);
        };

        /**
         * 增加獎項數目 by count
         * @param prizeId
         * @param count
         */
        self.addPrize = function(prizeId, count) {
            var value = self.map[prizeId] || 0;
            value = value + count;
            self.map[prizeId] = value;
            save(self.file);
        };

        /**
         * 回傳獎項的加碼數目
         * @param prizeId
         * @returns {*|number}
         */
        self.getExtraCount = function(prizeId) {
            return self.map[prizeId] || 0;
        }
    };

    /**
     * Internal helper class to hold winner result
     * @param winnerFile
     * @constructor
     */
    var Winner = function(winnerFile) {

        var self = this;

        self.file = winnerFile;

        /*
            a map of (prizeId, list of {depart, name})
         */
        self.map = load(self.file);

        function load(file) {
            if (fs.existsSync(file)) {
                var data = fs.readFileSync(file);
                return JSON.parse(data);
            }
            else {
                return {};
            }
        }

        function save(file) {
            var data = JSON.stringify(self.map);
            fs.writeFileSync(file, data);
        }

        /**
         * Reset winner records
         */
        self.reset = function() {
            self.map = {};
            save(self.file);
        };

        /**
         * Add a list of winners to a particular prize
         * @param prizeId
         * @param employees
         */
        self.addWinner = function(prizeId, employees) {
            var list = self.map[prizeId];
            if (!list) {
                list = [];
                self.map[prizeId] = list;
            }
            if (!_.isArray(employees))
                employees = [ employees ];

            _.each(employees, function(employee) {
                list.push({depart: employee.depart, name:employee.name});
            });

            save(self.file);
        };

        /**
         * Remove a list of winners from a particular prize
         * @param prizeId
         * @param employees
         */
        self.removeWinner = function(prizeId, employees) {
            var reallyRemoved = [];
            var list = self.map[prizeId];
            if (!list)
                return reallyRemoved;

            if (!_.isArray(employees))
                employees = [ employees ];

            _.each(employees, function(employee) {
                var removed = _.remove(list, function(w) {
                   return w.depart == employee.depart && w.name == employee.name;
                });

                if (removed != null)
                    reallyRemoved.push(removed);
            });

            if (reallyRemoved.length > 0)
                save(self.file);

            return reallyRemoved;
        };

        /**
         * Return array of winner information {depart:.., name:..}
         * @param prizeId
         */
        self.getWinners = function(prizeId) {
            return self.map[prizeId] || [];
        };

        /**
         * Return # of winners so far for a particular prize
         * @param prizeId
         */
        self.getWinnerCount = function(prizeId) {
            var list = self.map[prizeId];
            if (!list)
                return 0;
            else
                return list.length;
        };

    };


    self.options = {};
    self.winnerFile = '';
    self.prizeExtraFile = '';
    self.employeeList = []; // array of employee
    self.prizeList = [];    // array of prize { id:.., name:.., desc:.., count:.., group:.. }
    self.prizeMap = {};
    self.winners = null;
    self.prizeExtra = null;

    self.candidates = {};   // map of candidates
                            // key = groupId, value = array of employees

    /**
     * Initialize (loading data etc.)
     *
     * options = {
     *   dataFolder:'..'
     * }
     */
    self.init = function(options) {
        self.options = options || self.options;
        self.options.dataFolder = self.options.dataFolder || '.';
        self.options.ttsFolder = self.options.ttsFolder || '.';

        self.winnerFile = self.options.dataFolder + 'winner.json';
        self.prizeExtraFile = self.options.dataFolder + 'prizeextra.json';
        self.employeeList = EmployeeLoader.load(self.options.dataFolder + 'employee.xlsx');
        self.ttsSvc = new EmployeeTTSSvc(self.options.ttsFolder);
        self.prizeExtra = new PrizeExtra(self.prizeExtraFile);

        self.prizeList = PrizeLoader.load(self.options.dataFolder + 'prize.xlsx');
        self.adjustPrizeCount();

        self.prizeMap = self.buildPrizeMap(self.prizeList);

        self.winners = new Winner(self.winnerFile);
        self.candidates = self.buildCandidates();
    };

    /**
     * Reset game
     */
    self.reset = function() {
        self.winners.reset();
        self.prizeExtra.reset();
        self.init();
    };

    /**
     * 重新載入獎項/人員名單
     */
    self.reload = function() {
        self.init();
    };

    /**
     * 從某個prize內抽出N個winners. Return list of employees.
     * @param prizeId
     * @param count
     */
    self.drawPrize = function(prizeId, count) {
        var list = [];
        var prize = self.prizeMap[prizeId];
        if (!prize)
            return list;

        var toDraw = Math.min(count, prize.count - self.winners.getWinnerCount(prizeId));
        if (toDraw <= 0)
            return list;

        // 把符合資格的candidates抽出來
        //
        var availables = self.getPrizeCandidateList(self.candidates[prize.group], prize);

        logger.debug('[BEFORE DRAW] prize id=' + prize.id + ' candidates=' + self.candidates[prize.group].length + '/' + availables.length);

        for (var i = 0; i < Math.min(toDraw, availables.length); i++) {
            availables = _.shuffle(availables);
            var iWinner = _.random(0, availables.length - 1);
            var winner = availables[iWinner];

            // add TTS sound
            winner.tts = self.ttsSvc.getTTSFileName(winner);

            list.push(winner);
            availables.splice(iWinner, 1);

            var removed = _.remove(self.candidates[prize.group], function(emp) {
                return emp.depart == winner.depart && emp.name == winner.name;
            });

            // ASSERT
            if (!removed || removed.length != 1) {
                logger.error('INTERNAL ERROR: candidates not removed');
            }
        }

        logger.debug('[AFTER DRAW] prize id=' + prize.id + ' this draw=' + list.length + ' candidates=' + self.candidates[prize.group].length + '/' + availables.length);
        _.each(list, function(w) { logger.debug(w.depart + ':' + w.name);});

        self.winners.addWinner(prizeId, list);

        // ASSERT
        //
        self.verifyState();

        return list;
    };

    /**
     * 放棄獎項...
     * @param prizeId
     * @param list
     */
    self.giveUp = function(prizeId, list) {
        return self.winners.removeWinner(prizeId, list);
    };

    /**
     * 增加獎項名額
     * @param prizeId
     * @param count
     */
    self.addPrizeCount = function(prizeId, count) {
        self.prizeExtra.addPrize(prizeId, count);

        var prize = self.prizeMap[prizeId];
        if (prize) {
            prize.count += count;
        }

        return prize;
    };

    /**
     * 回傳emplist內符合prize限制的employees
     * @param emplist
     * @param prize
     * @returns {Array}
     */
    self.getPrizeCandidateList = function(empList, prize) {
        var ret = [];
        _.each(empList, function(emp) {
            if (!prize.tag)
                ret.push(emp);
            else if (emp.hasTag(prize.tag))
                ret.push(emp);
        });

        return ret;
    };

    /**
     * 檢查winner是否符合prize的限制
     * @param winner
     * @param prize
     * @returns {boolean}
     */
    self.checkWinnerRestriction = function(winner, prize) {
        if (!prize.tag)
            return true;

        return _.findIndex(winner.tags, prize.tag) >= 0;
    };

    self.buildCandidates = function() {
        // 把所有的employee 放到n個groups內, group by groudId
        //
        var candidates = {};
        _.each(self.employeeList, function(employee) {
            var list = [];
            _.each(employee.groups, function(groupId) {
                list = candidates[groupId];
                if (!list) {
                    list = [];
                    candidates[groupId] = list;
                }
                list.push(employee);
            });
        });

        // 把已經中獎的, 從對應的group內扣掉
        //
        _.each(self.winners.map, function(records, prizeId) {
            var prize = self.prizeMap[prizeId];
            if (prize) {
                var clist = candidates[prize.group];
                if (clist) {
                    _.each(records, function(record) {
                        // record.depart, record.name
                        //
                        var removed = _.remove(clist, function(employee) {
                            return employee.depart == record.depart && employee.name == record.name;
                        });

                        if (!removed || removed.length == 0) {
                            console.error("INTERNAL ERROR: fail to remove previous winner from candidates.")
                        }
                    });
                }
            }
        });

        _.each(candidates, function(candidate, groupId) {
            for (var i = 0; i < 10; i++)
                candidate = _.shuffle(candidate);

            candidates[groupId] = candidate;
        });

        return candidates;
    };


    self.buildPrizeMap = function(prizeList) {
        var map = {};
        _.each(prizeList, function(prize) {
            map[prize.id] = prize;
        });
        return map;
    };

    self.verifyState = function() {
        // 確認不會重複抽出
        //
        // for each prize in prizeList, 找出prize的group
        // prize.group -> list of prize id
        //
        var prizeGroup = _.groupBy(self.prizeList, function(prize) { return prize.group; });

        _.each(prizeGroup, function(prizeList, key) {
            // value is array of prize
            //
            var winnerList = [];
            _.each(prizeList, function(prize) {
                var winners = self.winners.getWinners(prize.id);

                _.each(winners, function(winner) {
                    // make sure winner is not in winnerList
                    //
                    var dup = _.find(winnerList, function(winnerT) { return winner.depart == winnerT.depart && winner.name == winnerT.name;});
                    if (dup) {
                        logger.error("INTERNAL ERROR: duplicate in winners = " + winner.depart + ':' + winner.name);
                    }
                    else {
                        winnerList.push(winner);
                    }
                });
            });
        });
    };

    /**
     * 根據prizeExtra調整prizeList的獎項個數
     */
    self.adjustPrizeCount = function() {
        _.each(self.prizeList, function(prize) {
            prize.count += self.prizeExtra.getExtraCount(prize.id);
        })
    };

};

module.exports = Game;
