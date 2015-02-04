/**
 * Created by derektu on 1/5/15.
 */

var ExcelHelper = require('../lib/excelhelper');
var EmployeeLoader = require('../lib/employeeloader');
var PrizeLoader = require('../lib/prizeloader');

describe("Test", function() {

    it.skip("test employeeLoader", function(done) {
        var fileName = './data/employee.xlsx';
        var list = EmployeeLoader.load(fileName);
        console.log(list);
        done();
    });

    it.skip("test PrizeLoader", function(done) {
        var fileName = './data/prize.xlsx';
        var list = PrizeLoader.load(fileName);
        console.log(list);
        done();
    });
});

