/**
 * Created by derektu on 1/17/15.
 */

/*
    從中研院文字轉語音服務 (ITRI TTS) 下載語音檔

    http://tts.itri.org.tw/development/web_service_api.php
 */

"use strict";

var Promise = require('bluebird');
var _ = require('lodash');
var request = require('request');
var soap = require('soap');
var async = require('async');
var fs = require('fs');
var request = require('request');


/**
 * Construct an instance of TTSDownloader
 * @constructor
 */
var TTSDownloader = function() {
    var self = this;

    self.TTSClient = function(soapClient, user, password) {
        var self = this;

        self.client = soapClient;
        self.user = user;
        self.password = password;

        self.convertTextAsync = Promise.promisify(self.client.ConvertText, self.client);
        self.getConvertStatusAsync = Promise.promisify(self.client.GetConvertStatus, self.client);

        /**
         * Download a TTS audio file to filename. return a promise that resolve when done.
         * @param text
         * @param options { speaker:.., volume:.., speed:.. }
         * @param filename
         */
        self.download = function(text, options, filename) {
            options = options || {};
            options.speaker = options.speaker || 'Theresa';
            options.volume = options.volume || 100;
            options.speed = options.speed || 0;

            return self.convertTextAsync({
                accountID: self.user,
                password: self.password,
                TTStext: text,
                TTSSpeaker: options.speaker,
                volume: options.volume,
                speed: options.speed,
                outType: "wav"
            })
            .then(function(response) {
                return self.parseConvertTextResult(response);
            })
            .then(function(convertId) {
                return self.getConvertIdUrl(convertId);
            })
            .then(function(url) {
                // download url and then save to filename
                //
                return self.downloadFile(url, filename);
            });
        };

        /**
         * parse ConvertText的回傳結果
         * @param response
         * @returns {Number}
         */
        self.parseConvertTextResult = function(response) {
            if (_.isArray(response))
                response = response[0];

            var retValue = response.Result.$value;
            //console.log('convert return=' + retValue);

            // retValue = resultCode&resultString&result
            //  resultCode = 0表示成功
            //  result是convertId
            //
            var t = retValue.split('&');
            if (t && t[0] && t[0] == '0' && t[2]) {
                return parseInt(t[2]);
            }
            else {
                throw "parseConvertTextResult return error =" + retValue;
            }
        };

        /**
         * Parse GetConvertStatus的回傳值
         * @param response
         * @returns {err:.., url:.., timeout:..}
         */
        self.parseGetConvertResult = function(response) {
            if (_.isArray(response))
                response = response[0];

            var retValue = response.Result.$value;
            //console.log('getconvertstatus return=' + retValue);

            // retValue = resultCode&resultString&statusCode&status&result
            //  resultCode = 0 表示成功
            //  statusCode = 0(queued) 1(processing) 2(completed)
            //  result = url (statusCode=2) or seconds(to wait) (statusCode != 2)
            //
            var fields = retValue.split('&');
            if (fields[0] != 0)
                return { err: "resultCode error=" + fields[0]};
            else if (fields[2] == 2)
                return { url: fields[4]};
            else if (fields[2] == 0 || fields[2] == 1) {
                var wait = parseInt(fields[4]) || 3;
                return { timeout : wait * 1000};
            }
            else {
                return { err: "statusCode error=" + fields[2]};
            }
        };

        /**
         * 取得convertId的下載url
         * @param convertId
         */
        self.getConvertIdUrl = function(convertId) {
            return new Promise(function(resolve, reject) {
                async.retry(5,
                    function(callback, results) {
                        self.client.GetConvertStatus({accountID: self.user, password: self.password, convertID:convertId},
                            function(err, response) {
                                if (err)
                                    callback(err);
                                else {
                                    var ret = self.parseGetConvertResult(response);
                                    if (ret.err) {
                                        callback(err);
                                    }
                                    else if (ret.url) {
                                        callback(null, ret.url);
                                    }
                                    else {
                                        setTimeout(function() {
                                            callback('try again');
                                        }, ret.timeout);
                                    }
                                }
                            }
                        )
                    },

                    function(err, results) {
                        // this is called when everything finish
                        //
                        if (err)
                            reject(err);
                        else
                            resolve(results);
                    }
                );
            });
        };

        /**
         * Download url and save content to filename. Return a promise that resolves to 'filename' when done.
         * @param url
         * @param filename
         */
        self.downloadFile = function(url, filename) {
            return new Promise(function(resolve, reject) {
                var stream = fs.createWriteStream(filename);
                stream.on('finish', function() {
                    stream.close(function() {
                        resolve(filename);
                    })
                });

                request(url)
                    .on('error', function(err) {
                        reject(error);
                    })
                    .pipe(stream);

                /*
                request(url, function(err, response, body) {
                    if (err)
                        reject(err);
                    else if (response.statusCode != 200)
                        reject('HTTP statusCode=' + response.statusCode);
                    else {
                        fs.writeFile(body, filename, function(err) {
                            if (err)
                                reject(err);
                            else
                                resolve(filename);
                        });
                    }
                });
                */
            });
        }

    };

    /**
     * Create a client connection to TTS service. Return a promise that resolves to a client object
     * when the connection is established. Client can then reuse this client object to perform download.
     * @param options { user:.., password:.., url:.. }
     */
    self.createClient = function(options) {
        options = options || {};
        options.url = options.url || 'http://tts.itri.org.tw/TTSService/Soap_1_3.php?wsdl';

        return new Promise(function(resolve, reject) {
            soap.createClient(options.url, function(err, client) {
                if (err)
                    reject(err);
                else
                    resolve(new self.TTSClient(client, options.user||'', options.password||''));
            });
        });
    }

};

module.exports = new TTSDownloader();
