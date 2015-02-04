/**
 * Created by derektu on 1/5/15.
 */

/*
    Provide excel file related API (for XLSX)
 */

var XLSX = require('xlsx');
var XLS = require('xlsjs');

var ExcelHelper = function() {
    var self = this;

    var COL_MIN = 4;
    var COL_MAX = 100;

    this.readExcel = function(fileName) {
        /*
            return excel content as a dictionary (wss), where each key is name of worksheet,
            and each worksheet is an array of objects

            where
            - the first row is an array of string, one for each header,
            - for the subsequent, each row is an array of objects (column value)

            wss 的格式跟writeExcel的是一樣的.
         */

        if (isXLS(fileName)) {
            return readXLSFile(fileName);
        }
        else {
            return readXLSXFile(fileName);
        }
    };

    function isXLS(fileName) {
        var idx = fileName.lastIndexOf('.');
        if (idx >= 0) {
            var suffix = fileName.substring(idx+1);
            return suffix.toUpperCase() == "XLS";
        }
        return false;
    }

    function readXLSFile(fileName) {
        var wb = XLS.readFile(fileName);
        var wss = {};

        wb.SheetNames.forEach(function(sheetName) {
            var ws = wb.Sheets[sheetName];

            wss[sheetName] = XLS.utils.sheet_to_json(ws, {header:1});
        });

        return wss;
    }

    function readXLSXFile(fileName) {
        var wb = XLSX.readFile(fileName);
        var wss = {};

        wb.SheetNames.forEach(function(sheetName) {
            var ws = wb.Sheets[sheetName];

            wss[sheetName] = XLSX.utils.sheet_to_json(ws, {header:1});
        });

        return wss;
    }


    /*
        only support XLSX format
     */
    this.writeExcel = function(wss, fileName) {
        /*
            wss is { "name", ws }, where each "name" is one Worksheet

            ws is an array of values

            - the first row is an array of string, one for each header,
            - for the subsequent, each row is an array of objects (column value)
         */

        var wb = buildExcelWorkbook(wss);
        XLSX.writeFile(wb, fileName);
    };

    function buildRowHeader(object) {
        var row = [];
        for (var field in object) {
            if (object.hasOwnProperty(field)) {
                row.push(field);
            }
        }
        return row;
    }

    function buildRowValue(object) {
        var row = [];
        for (var field in object) {
            if (object.hasOwnProperty(field)) {
                row.push(object[field]);
            }
        }
        return row;
    }

    function buildExcelWorksheet(ws) {
        var wsArray = [];

        // convert ws內的data to array of items, including header row
        //

        var cols = 0;
        /*
        if (ws.length > 0) {
            wsArray.push(buildRowHeader(ws[0]));
            cols = wsArray[0].length;
            ws.forEach(function(row) {
                wsArray.push(buildRowValue(row));
            });

        }
        */
        if (ws.length > 0) {
            cols = ws[0].length;
            ws.forEach(function(row) {
                wsArray.push(row);
            });
        }
        return sheet_from_array_of_arrays(wsArray, cols);
    }

    function calcColWidth(object) {
        if (object == null)
            return 1;
        else {
            return object.toString().length;
        }
    }

    function sheet_from_array_of_arrays(data, cols) {
        var ws = {};
        var i;
        var widthArray = [];

        var range = {s: {c:10000000, r:10000000}, e: {c:0, r:0 }};

        for (i = 0; i < cols; i++)
            widthArray.push(COL_MIN);

        for (var R = 0; R != data.length; ++R) {
            for(var C = 0; C != data[R].length; ++C) {
                if(range.s.r > R) range.s.r = R;
                if(range.s.c > C) range.s.c = C;
                if(range.e.r < R) range.e.r = R;
                if(range.e.c < C) range.e.c = C;

                widthArray[C] = Math.max(widthArray[C], calcColWidth(data[R][C]));

                var cell = {v: data[R][C] };
                if(cell.v == null) continue;
                var cell_ref = XLSX.utils.encode_cell({c:C,r:R});

                /* TEST: proper cell types and value handling */
                if (typeof cell.v === 'number')
                    cell.t = 'n';
                else if(typeof cell.v === 'boolean')
                    cell.t = 'b';
                else if(cell.v instanceof Date) {
                    cell.t = 'n'; cell.z = XLSX.SSF._table[14];
                    cell.v = datenum(cell.v);
                }
                else
                    cell.t = 's';

                ws[cell_ref] = cell;
            }
        }

        /* TEST: proper range */
        if(range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);

        var wscols = [];
        widthArray.forEach(function(width) {
            if (width < COL_MIN)
                width = COL_MIN;
            else if (width > COL_MAX)
                width = COL_MAX;

            wscols.push({wch: width});
        });

        ws['!cols'] = wscols;

        return ws;
    }

    function buildExcelWorkbook(wss) {
        var wb = {
            SheetNames: [],
            Sheets: {}
        };

        Object.keys(wss).forEach(function (key) {
            var ws = wss[key];
            wb.SheetNames.push(key);
            wb.Sheets[key] = buildExcelWorksheet(ws);
        });

        return wb;
    }
};

module.exports = new ExcelHelper();
