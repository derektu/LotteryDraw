/**
 * Created by derektu on 1/14/15.
 */

/*
    Test ITTI的 TTS service

    http://tts.itri.org.tw/development/web_service_api.php

    UserID = derektu, Password = beagle

 */
var soap = require('soap');
var Promise = require('bluebird');
var TTSDownloder = require('../lib/ttsdownloader');
var EmployeeTTSSvc = require('../lib/employeetts');
var EmployeeLoader = require('../lib/employeeloader');

describe("Test ITTI", function() {

    it.skip("test", function(done) {
        var text = '研發部 程式師';
        var filename = './tts/' + text + '.wav';
        TTSDownloder.createClient({user:'test', password:'test'})
            .then(function(client) {
                return client.download(text, null, filename);
            })
            .error(function(err) {
                console.log('err=' + err);
            })
            .finally(function() {
                done();
            });
    });

    it.skip("test EmployeeTTSSvc", function(done) {
        var fileName = './data/employee.xlsx';
        var list = EmployeeLoader.load(fileName);

        var test10 = list.slice(0, list.length);

        var ttsSvc = new EmployeeTTSSvc('./tts');
        ttsSvc.download(test10)
            .then(function() {
                console.log('done completed');
            })
            .error(function(error) {
                console.log('err=' + err);
            })
            .finally(function() {
                done();
            })
    });

    it.skip("test", function(done) {
        var url_wsdl = 'http://tts.itri.org.tw/TTSService/Soap_1_3.php?wsdl';
        var account = 'test';
        var password = 'test';
        var phrase = '研發部 程式師';
        var ttsSpeaker = 'Theresa';// 'Angela';
        var createClientAsync = Promise.promisify(soap.createClient);
        var _client = null;
        createClientAsync(url_wsdl)
            .then(function(client) {
                _client = client;

                /*
                var convertSimpleAsync = Promise.promisify(_client.ConvertSimple, _client);
                return convertSimpleAsync({
                    accountID:account,
                    password:password,
                    TTStext:phrase});
                */

                var convertTextAsync = Promise.promisify(_client.ConvertText, _client);
                return convertTextAsync({
                    accountID:account,
                    password:password,
                    TTStext:phrase,
                    TTSSpeaker: ttsSpeaker,
                    volume: 100,
                    speed: -5,
                    outType:"wav"});

                /*
                var convertAsync = Promise.promisify(_client.ConvertAdvancedText, _client);
                return convertAsync({
                    Account:account,
                    Password:password,
                    Text:phrase,
                    TTSSpeaker: ttsSpeaker,
                    Volume:100,
                    Speed: 0,
                    outType:"wav",
                    PitchLevel:0,
                    PitchSignal:0,
                    PitchScale:5
                });
                */
            })
            .then(function(result) {
                var retValue = result[0].Result.$value;
                console.log('convert return=' + retValue);
                var t = retValue.split('&');
                if (t && t[0] && t[0] == '0' && t[2]) {
                    return parseInt(t[2]);
                }
                else {
                    throw "convertSimple return=" + retValue;
                }
            })
            .then(function(convertId) {
                var getConvertStatusAsync = Promise.promisify(_client.GetConvertStatus, _client);
                return getConvertStatusAsync({Account:account, Password:password, ConvertID:convertId});
            })
            .then(function(result) {
                var retValue = result[0].Result.$value;
                console.log('GetConvertStatus return=' + retValue);
                var t = retValue.split('&');
                if (t && t[0] && t[2] && t[0] == '0') {
                    if (t[2] == '2' && t[4]) {
                        return t[4];
                    }
                    else if (t[2] != 2 && t[3]) {
                        // TODO: t[3]是等待時間(ms), 此時應該要sleep... 然後retry GetConvertStatus..
                    }
                }
                throw "GetConvertStatus return=" + retValue;
            })
            .then(function(url) {
                console.log('Url=' + url);
            })
            .finally(function() {
                done();
            })


    });

});

