/**
 * Created by derektu on 1/5/15.
 */

/*
    Global object to load list of employees.
    Each employee = { depart:'..', title:'..', name:'..', groups:[..] }
 */

var ExcelHelper = require('./excelhelper');
var _ = require('lodash');

var EmployeeLoader = function() {

    var Employee = function(depart, title, name, groups, tags) {
        var self = this;

        self.depart = depart;
        self.title = title;
        self.name = name;
        self.groups = groups;
        self.tags = tags;

        self.hasTag = function(tag) {
            return _.findIndex(self.tags, function(t) { return t == tag; }) >= 0;
        };

        self.isSame = function(winner) {
            return self.depart == winner.depart && self.name == winner.name;
        };
    };

    /*
        Return array of employee (depart, title, name, groups)
     */
    this.load = function(excelFilename) {
        var _wss = ExcelHelper.readExcel(excelFilename);
        var list = [];

        _.each(_wss, function(ws, key) {
            // key(sheet name) is name of department
            //
            key = key.trim();
            _.each(ws, function(item) {
                list.push(new Employee(key, (item[0]||'').trim(), item[1].trim(), parseGroupId(item[2]||''), parseTags(item[3]||'')));
            });
        });
        return list;
    };

    function parseGroupId(groups) {
        var ret = [];
        groups = groups || '';
        var parts = groups.trim().split(/[,;]/);
        _.each(parts, function(part) {
            var groupId = parseInt(part) || 0;
            if (groupId > 0)
                ret.push(groupId);
        });
        return ret;
    }

    function parseTags(tags) {
        var ret = [];
        tags = tags || '';
        var parts = tags.trim().split(/[,;]/);
        _.each(parts, function(part) {
            if (part)
                ret.push(part);
        });
        return ret;
    }

};

module.exports = new EmployeeLoader();
