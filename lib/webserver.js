/**
 * Created by derektu on 1/6/15.
 */

"use strict";

var fs = require('fs');
var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var _ = require('lodash');

var logger = require('./logger.js').getLogger('[web]');

var WebServer = function(port, game) {
    var self = this;

    self.game = game;

    var app = express();
    var webFolder = __dirname + '/../web';
    app.use(express.static(webFolder));
    app.use(bodyParser.json());

    this.run = function() {
        app.listen(port);
    };

    var router = express.Router();

    /**
     * 回傳prize相關的資料, 格式為
     *  [ prize, prize, .. ],
     *
     *  where each prize is
     *
     *  { name: , desc: , count: .., winners:[..] }
     *
     *  where winners is an array of winner { depart:.., name:.. }
     */
    router.get('/prizedata', function(req, res) {
        var data = self.getPrizeData();
        sendJson(res, data);
    });

    /**
     * 回傳尚未得獎名單, 格式為
     * {
     *  "1" : [ employee, employee, .. ]
     * }
     *
     * key = prize group
     * employee = { depart:.., name:.. }
     */
    router.get('/candidates', function(req, res) {
        var data = self.getCandidates();
        sendJson(res, data);
    });

    /**
     * Draw prize:
     *
     * Post data = {id:.., count:..}
     *
     * Return array of winners: {depart:.., name:..}
     */
    router.post('/drawprize', function(req, res) {
        var data = req.body;
        var ret = self.game.drawPrize(data.id, data.count);
        sendJson(res, ret);
    });

    /**
     * Giveup prize:
     *
     * Post data = {id:.., depart:.., name:.. }
     */
    router.post('/giveupprize', function(req, res) {
        var data = req.body;

        var ret = self.game.giveUp(data.id, {depart:data.depart, name:data.name});
        sendJson(res, ret);
    });

    /**
     * Add prize
     *
     * Post data = {id:..., count:..}
     *
     * Return prize information
     */
    router.post('/addprize', function(req, res) {
        var data = req.body;

        var ret = self.game.addPrizeCount(data.id, data.count);
        sendJson(res, ret);
    });

    /**
     * Reset game
     *
     * 完成後回傳Prize的資料(same format as /prizedata)
     */
    router.post('/reset', function(req, res) {
        self.game.reset();

        var data = self.getPrizeData();
        sendJson(res, data);
    });

    /**
     * Reload game
     *
     * 完成後回傳Prize的資料(same format as /prizedate)
     */
    router.post('/reload', function(req, res) {
        self.game.reload();

        var data = self.getPrizeData();
        sendJson(res, data);
    });


    // Hook up api router
    //
    app.use('/api', router);

    // global error handling
    //
    app.use(function(err, req, res, next) {
        logger.info('Error request[' + req.url + '] Err=[' + err.toString() + ']');
        logger.info(err.stack || '');

        res.status(500).send('Internal error occurred.');
    });

    function sendJson(res, data) {
        res.setHeader('Content-Type', 'application/json');
        res.end(data ? JSON.stringify(data) : '{}');
    }

    /**
     * Return prize的資料
      */
    self.getPrizeData = function() {
        var prizeList = self.game.prizeList;
        var ret = [];
        _.each(prizeList, function(prize) {
            ret.push({
                id: prize.id,
                name: prize.name,
                desc: prize.desc,
                count: prize.count,
                group: prize.group,
                drawSize: prize.drawSize,
                winners : self.game.winners.getWinners(prize.id)
            });
        });
        return ret;
    };

    /**
     * Return candidates的資料
     */
    self.getCandidates = function() {
        return self.game.candidates;
    };
};

module.exports = WebServer;
