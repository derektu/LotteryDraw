#!/usr/local/bin/node

/*
    $ downloadtts --employeefile=c --outputfolder=../tts
 */
var argv = require('minimist')(process.argv.slice(2));
var EmployeeLoader = require('../lib/employeeloader');
var EmployeeTTSSvc = require('../lib/employeetts');

function usage() {
    process.stdout.write('Usage:\n');
    process.stdout.write('downloadtts.js --employeefile=employeefile --outputfolder=../tts\n');
}

var employeefile = argv['employeefile'] || '';
var outputfolder = argv['outputfolder'] || '';

if (!employeefile || !outputfolder) {
    usage();
    process.exit(1);
}

var employees = EmployeeLoader.load(employeefile);
var ttsSvc = new EmployeeTTSSvc(outputfolder);
ttsSvc.download(employees)
    .then(function() {
        process.stdout.write('download completed\n');
        process.exit(0);
    })
    .error(function(err) {
        process.stderr.write('download err=' + err);
        process.exit(1);
    });


