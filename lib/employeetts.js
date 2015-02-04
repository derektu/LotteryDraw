/**
 * Created by derektu on 1/17/15.
 */

/*
    Manage TTS file for all employees
 */

var Promise = require('bluebird');
var async = require('async');
var _ = require('lodash');
var path = require('path');
var s = require("underscore.string");

var TTSDownloader = require('./ttsdownloader');

var EmployeeTTSSvc = function(ttsFolder, user, pass) {
    var self = this;

    self.ttsFolder = ttsFolder || '';
    self.user = user || '';
    self.pass = pass || '';

    /**
     * Download TTS file for each employee (and save to download folder).
     * Return a promise that resolves when done.
     * @param employees
     */
    self.download = function(employees) {
        return TTSDownloader.createClient({user:self.user, password:self.pass})
            .then(function(client) {
                return self.downloadTTS(client, employees);
            });
    };

    self.downloadTTS = function(client, employees) {
        return new Promise(function(resolve, reject) {
            var queue = async.queue(function(task, callback) {
                /* task = employee */
                self.downloadEmployee(client, task)
                    .then(function(filename) {
                        callback(null, filename);
                    });
            }, 4);

            _.each(employees, function(employee) {
                queue.push(employee, function(err) {
                    console.log('process[' + employee.name + ']=' + err);
                });
            });

            queue.drain = function() {
                resolve();
            };
        });
    };

    /**
     * Download TTS for this employee. Return a promise that resolves when done.
     * @param employee
     */
    self.downloadEmployee = function(client, employee) {
        var dest = path.join(self.ttsFolder, self.getTTSFileName(employee));
        return client.download(self.getTTSText(employee), null, dest);
    };

    /**
     * Return TTS filename (without path) for employee.
     * @param employee
     * @returns {string}
     */
    self.getTTSFileName = function(employee) {
        return self.trimspace(employee.depart) + '.' + self.trimspace(employee.name) + '.wav';
    };

    /**
     * Return TTS text for employee
     * @param employee
     * @returns {string}
     */
    self.getTTSText = function(employee) {
        return self.trimspace(employee.depart) + ' ' + self.trimspace(employee.name);
    };

    self.trimspace = function(str) {
        return s.replaceAll(str, " ", "");
    }
};

module.exports = EmployeeTTSSvc;