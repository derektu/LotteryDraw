/**
 * Created by derektu on 1/11/15.
 */

/*
    Global object to load list of prize
    Each prize = { id:.., name:.., desc:.., count:.., group:.. }

 */

var ExcelHelper = require('./excelhelper');
var _ = require('lodash');

var PrizeLoader = function() {

    var Prize = function(id, name, desc, count, group, tag, drawSize) {
        this.id = id;
        this.name = name;
        this.desc = desc;
        this.count = count;
        this.group = group;
        this.tag = tag;
        this.drawSize = drawSize || 10;
    };

    /*
        Return array of prize {id:.., name:.., desc:.., count:.., group:..}
     */
    this.load = function(excelFilename) {
        var _wss = ExcelHelper.readExcel(excelFilename);
        var list = [];

        _.each(_wss, function(ws, key) {
            _.each(ws, function(item, index) {
                if (index > 0) {
                    list.push(new Prize(item[0].trim(), item[1].trim(), item[2].trim(), parseInt(item[3].trim()) || 0, parseInt(item[4].trim()) || 0, (item[5]||'').trim(), parseInt(item[6].trim())));
                }
            });
        });
        return list;
    };
};

module.exports = new PrizeLoader();
