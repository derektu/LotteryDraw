/**
 * Created by derektu on 1/11/15.
 */


var app = angular.module('App', ['ui.bootstrap', 'ngAnimate', 'sysjust.confirm']);
app.controller('GameCtrl', ['$scope', '$http', '$q', '$modal', '$confirm', '$window', function($scope, $http, $q, $modal, $confirm, $window) {

    $scope.prizeList = [];
    $scope.error = null;

    $scope.prizeIndex = -1;
    $scope.prize = null;
    $scope.drawRange = [];              // 這次可以抽出的筆數 [0,1,2,3,4..]
    $scope.largeCell = false;

    $scope.drawResult = [];             // 這次抽出的結果
    $scope.winners = [];                // 已經抽出的結果

    $scope.insideDraw = false;

    $scope.config = {
        "enableTTS" : false,
        "spinDelay" : 1000
    };

    $scope.init = function() {
        var url = 'api/prizedata';

        $http.get('config.json')
            .success(function(data, status, header, config) {
                $scope.config = data;
            });

        // TODO: 顯示spin cursor
        //
        $http.get(url)
            .success(function(data, status, header, config) {

                console.log('prizedata is returned.');

                $scope.prizeList = data;
                $scope.error = null;
                $scope.setPrizeIndex($scope.getFirstPrizeIndex());

                $scope.$broadcast('prizeReady', JSON.stringify($scope.prizeList));
            })
            .error(function(data, status, header, config) {
                $scope.error = data;
                // TODO: display error
            });
    };

    $scope.reset = function(data) {
        $scope.prizeList = data;
        $scope.drawResult = [];
        $scope.winners = [];

        $scope.setPrizeIndex($scope.getFirstPrizeIndex());
    };

    $scope.refresh = function() {
        $window.location.reload();
    };

    $scope.print = function() {
        $window.print();
    };

    $scope.getTTSCmdString = function() {
        if ($scope.config.enableTTS) {
            return "關閉語音唱名";
        }
        else {
            return "開啟語音唱名";
        }
    };

    $scope.toggleTTS = function() {
        $scope.config.enableTTS = !$scope.config.enableTTS;
    };

    $scope.getFirstPrizeIndex = function() {
        var i;
        for (i = 0; i < $scope.prizeList.length; i++) {
            var prize = $scope.prizeList[i];
            if (prize && prize.count > 0 && prize.count > prize.winners.length)
                return i;
        }
        return 0;
    };

    // 切換Prize
    //
    $scope.setPrizeIndex = function(index) {
        $scope.prizeIndex = index;
        if (index < 0 || index >= $scope.prizeList.length)
            $scope.prize = null;
        else
            $scope.prize = $scope.prizeList[index] || null;

        $scope.resetDraw();
    };

    $scope.getPrizeName = function() {
        if ($scope.prize)
            return $scope.prize.name;
        else
            return '';
    };

    $scope.getPrizeDesc = function() {
        if ($scope.prize)
            return $scope.prize.desc;
        else
            return '';
    };

    $scope.getPrizeCount = function() {
        if ($scope.prize)
            return $scope.prize.count;
        else
            return 0;
    };

    $scope.getPrizeGroupId = function() {
        if ($scope.prize)
            return $scope.prize.group;
        else
            return 1;
    };

    var DRAW_CELL_COUNT = 10;   // 如果 <= 10, 則用large style, 否則用small

    $scope.getPrizeDrawSize = function() {
        if ($scope.prize)
            return $scope.prize.drawSize;
        else
            return DRAW_CELL_COUNT;  // DEFAULT
    };

    $scope.isLargeCell = function() {
        var drawSize = $scope.getPrizeDrawSize();
        return drawSize <= DRAW_CELL_COUNT;
    };

    // 是否可以抽獎
    $scope.canDraw = function() {
        return $scope.prize && $scope.prize.count > $scope.prize.winners.length && !$scope.insideDraw;
    };

    $scope.canNextPrize = function(direction) {
        if ($scope.prizeIndex < 0)
            return false;

        var index = $scope.prizeIndex + direction;
        return index >= 0 && index < $scope.prizeList.length;
    };

    $scope.nextPrize = function(direction) {
        if ($scope.prizeIndex < 0)
            return;

        // TODO: 切換prizeIndex時, 有時候無法讓winnerboard重新render(通常是drawRange變大的情形)
        // 目前先用reload的方式來解決這個問題
        //
        var index = $scope.prizeIndex + direction;
        if (0 <= index && index < $scope.prizeList.length) {
            if (index == $scope.getFirstPrizeIndex()) {
                // reload後還是會停在同一個prize
                $window.location.reload();
            }
            else {
                $scope.setPrizeIndex(index);
            }
        }
    };

    $scope.getMaxDrawCount = function() {
        if (!$scope.prize)
            return 0;

        var available = Math.max($scope.prize.count - $scope.prize.winners.length, 0);
        return Math.min(available, $scope.getPrizeDrawSize());
    };

    // Kick off data initialization
    //
    $scope.init();

    // 抽獎
    //
    $scope.draw = function() {
        if (!$scope.prize)
            return;

        if (!$scope.canDraw())
            return;

        $scope.insideDraw = true;

        $scope.resetDraw();

        $scope.startSpin().then(function() {
            var spinSound = new buzz.sound('/sound/drumroll', { formats: ['ogg'], loop:false});
            spinSound.play();
            spinSound.bind('ended', function() {
                var url = "/api/drawprize";
                var data = {id: $scope.prize.id, count: $scope.getMaxDrawCount()};

                // Call server to drawPrize
                //
                $http.post(url, data)
                    .success(function(data, status, header, config) {
                        spinSound.stop();
                        $scope.stopSpin().then(function() {
                            $scope.updateDraw(data);
                        });
                    })
                    .error(function(data, status, header, config) {
                        spinSound.stop();
                        $scope.stopSpin().then(function() {
                            $scope.error = error;
                            // TODO: display error
                        })
                        .finally(function() {
                            $scope.insideDraw = false;
                        })
                    });
            });
        })
    };

    // 回傳目前得獎人數 (剛剛抽到的 + 已經得獎的)
    //
    $scope.getWinnerCount = function() {
        return !$scope.prize ? 0 : $scope.prize.winners.length;
    };

    // 準備抽獎前的動作
    //
    $scope.resetDraw = function() {
        $scope.drawResult = [];
        $scope.drawRange = _.range($scope.getMaxDrawCount());
        $scope.winners = [].concat($scope.prize.winners);
        $scope.largeCell = $scope.isLargeCell();

        $scope.$broadcast('resetDraw', null);
        $scope.$broadcast('updateWinners', JSON.stringify($scope.winners));
    };

    $scope.updateDraw = function(drawResult) {
        $scope.drawResult = drawResult;
        $scope.prize.winners = $scope.prize.winners.concat($scope.drawResult);

        $scope.$broadcast('updateDraw', JSON.stringify(drawResult));

        $scope.$broadcast('animateDraw', JSON.stringify($scope.config));
    };

    $scope.onAnimateDrawDone = function() {
        $scope.insideDraw = false;
        $scope.$digest();   // to force angular to evaluate canDraw() status
    };

    $scope.resetGame = function() {
        $confirm.confirm('確定要reset資料嗎？（所有的得獎紀錄都會被清除！)')
            .then(function() {
                // TODO: 顯示spin cursor
                //
                $http.post('/api/reset')
                    .success(function(data, status, header, config) {
                        // $scope.reset(data);
                        $window.location.reload();
                    })
                    .error(function(data, status, header, config) {
                        $scope.error = error;
                        // TODO: display error
                    })
            });
    };

    $scope.reloadGame = function() {
        $confirm.confirm('確定要重新載入獎項/人員資料嗎？（所有的得獎紀錄會保存！)')
            .then(function() {
                // TODO: 顯示spin cursor
                //
                $http.post('/api/reload')
                    .success(function(data, status, header, config) {
                        // $scope.reset(data);
                        $window.location.reload();
                    })
                    .error(function(data, status, header, config) {
                        $scope.error = error;
                        // TODO: display error
                    })
            });
    };

    $scope.spinning = false;

    $scope.isSpinning = function() {
        return $scope.spinning;
    };

    $scope.startSpin = function() {
        if ($scope.spinning)
            return;

        $scope.spinning = true;
        $('#wheel-image').addClass('wheel-image-spin');
        return $('#wheel-container').animate({opacity: 1}, 1000).promise();
    };

    $scope.stopSpin = function() {
        if (!$scope.spinning)
            return;

        $scope.spinning = false;

        return $q(function(resolve, reject) {
            $('#wheel-container').animate({opacity: 0}, 1000).promise()
                .then(function() {
                    $('#wheel-image').removeClass('wheel-image-spin');
                    resolve();
                })
        });
    };

    // callback from winnerBoard when a draw is giving up
    //
    $scope.giveup = function(draw) {
        /*
            { draw.depart, draw.name }
         */
        var url = '/api/giveupprize';
        var postData = {id:$scope.prize.id, depart:draw.depart, name:draw.name};

        $http.post(url, postData)
            .success(function(data, status, header, config) {
                // update $scope.drawResult
                //
                var dw = _.find($scope.drawResult, function(dw) { return dw.depart == draw.depart && dw.name == draw.name});
                dw.giveupState = true;

                _.remove($scope.prize.winners, function(dw) {return dw.depart == draw.depart && dw.name == draw.name;});
            })
            .error(function(data, status, header, config) {
                $scope.error = error;
                // TODO: display error
                // TODO: 重新update winnerBoard => $scope.broadcast('updateDraw', ..);
            });

    };

    $scope.addPrize = function() {
        if ($scope.insideDraw)
            return;

        if (!$scope.prize)
            return;

        // confirm 是否要加碼
        //
        $confirm.confirm('確定要加碼獎項：' + $scope.getPrizeName() + ' ？')
            .then(function() {
                // call server
                //
                var url = '/api/addprize';
                var postData = {id:$scope.prize.id, count:1};

                $http.post(url, postData)
                    .success(function(data, status, header, config) {
                        // 更新prize的資料
                        $scope.prize.count = data.count;
                    })
                    .error(function(data, status, header, config) {
                        $scope.error = error;
                        // TODO: display error
                    });
            });
    };

}])
.directive('winnerBoard', function($confirm) {
    return {
        restrict: 'E',
        transclude: true,
        scope : {
            drawRange:'=',
            largeCell:'=',
            animateCallback:'&',
            giveupCallback:'&'
        },
        templateUrl: 'winner-board.html',
        controller: function($scope) {
            var flipStyle = 'flipped';

            $scope.drawResult = [];
            $scope.drawRange = [];

            $scope.winners = [];
            $scope.winnerIndexTable = [];  // { [0, 1, 2, 3, 4], [5, 6, 7, 8, 9]   .. }

            $scope.flipSound = new buzz.sound('/sound/FlappyBird', { formats: ['mp3'], duration:800, loop:false});

            $scope.$on('resetDraw', function(event, msg) {
                $scope.resetTiles();
                $scope.drawResult = [];
            });

            $scope.$on('updateDraw', function(event, msg) {
                $scope.drawResult = JSON.parse(msg);
            });

            $scope.$on('animateDraw', function(event, msg) {
                $scope.animateTiles(JSON.parse(msg));
            });

            $scope.$on('updateWinners', function(event, msg) {
                $scope.winners = JSON.parse(msg);
                $scope.calcWinnerIndexTable();
            });

            $scope.getDraw = function(index) {
                var stub = {depart:'', name:''};
                if (!$scope.drawResult || $scope.drawResult.length == 0)
                    return stub;

                if (index < 0 || index >= $scope.drawResult.length)
                    return stub;

                return $scope.drawResult[index];
            };

            // 放棄某個抽獎結果
            //
            $scope.giveupDraw = function(idx) {
                var draw = $scope.drawResult[idx] || null;
                if (!draw)
                    return;

                var giveupState = draw.giveupState || false;
                if (giveupState)
                    return;

                $confirm.confirm(draw.name + ' 確定要放棄獎項嗎？')
                    .then(function() {
                        console.log('[giveupDraw] name=' + draw.name);

                        // 更新狀態
                        //
                        draw.giveupState = true;

                        // 通知controller
                        //
                        $scope.giveupCallback({draw:draw});
                    });
            };

            $scope.getTileClass = function(idx) {
                if ($scope.largeCell)
                    return "mg-tile mg-tile-" + (idx+1).toString();
                else
                    return "mg-tile-sm mg-tile-sm-" + (idx+1).toString();
            };

            $scope.getGiveupClass = function(idx) {
                var draw = $scope.drawResult[idx] || null;
                if (!draw)
                    return "";

                var giveupState = draw.giveupState || false;
                if (!giveupState)
                    return "";

                return "mg-tile-emp-giveup";
            };

            // 開始抽獎前/更換獎項 => resetTiles
            //
            $scope.resetTiles = function() {
                var tiles = $('.mg-tile-inner');
                for (var i = 0; i < tiles.length; i++) {
                    var tile = tiles[i];
                    if (tile.classList.contains(flipStyle))
                        tile.classList.remove(flipStyle);
                }
            };

            // 抽獎後 => animateTiles
            //
            $scope.animateTiles = function(config, tiles) {
                tiles = tiles || $('.mg-tile-inner').toArray();
                if (tiles.length > 0) {
                    var tile = tiles.shift();
                    if (!tile.classList.contains(flipStyle)) {
                        $scope.flipSound.stop();
                        tile.classList.add(flipStyle);
                        $scope.flipSound.play();

                        var id = $(tile).data("id");
                        var draw = $scope.getDraw(id);

                        console.log('winner = ' + draw.depart + ' ' + draw.name + ' tts=' + draw.tts);

                        // 等一秒後spin動畫應該結束, 然後開始announce TTS, announce之後繼續animate next
                        //
                        setTimeout(function() {
                            // anounce name of the winnner
                            //
                            if (config.enableTTS) {
                                var tts = new buzz.sound('/tts/' + draw.tts);
                                tts.bind('ended', function() {
                                    $scope.animateTiles(config, tiles);
                                });

                                tts.play();
                            }
                            else {
                                $scope.animateTiles(config, tiles);
                            }
                        }, config.spinDelay);
                    }
                }
                else {
                    // 通知controller
                    //
                    $scope.animateCallback();
                }
            };

            $scope.calcWinnerIndexTable = function() {
                var batchSize = 5;
                $scope.winnerIndexTable = [];
                for (var i = 0; i < $scope.winners.length; i += batchSize) {
                    var last = Math.min(i + batchSize, $scope.winners.length);
                    $scope.winnerIndexTable.push(_.range(i, last));
                }
            };

            $scope.getWinner = function(index) {
                var stub = {depart:'', name:''};
                if (!$scope.winners || $scope.winners.length == 0)
                    return stub;

                if (index < 0 || index >= $scope.winners.length)
                    return stub;

                return $scope.winners[index];
            };
        }
    }
})
;

