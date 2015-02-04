/**
 * Created by derektu on 1/17/15.
 */

var app = angular.module('AppResult', ['ui.bootstrap', 'ngAnimate', 'ngRoute']);
app.controller('ResultCtrl', ['$scope', '$http', '$window', function($scope, $http, $window) {
    $scope.prizeList = [];
    $scope.error = null;

    $scope.init = function() {
        var url = 'api/prizedata';

        // TODO: 顯示spin cursor
        //
        $http.get(url)
            .success(function(data, status, header, config) {
                console.log('prizedata is returned.');

                $scope.prizeList = data;
                $scope.error = null;

                $scope.$broadcast('prizeReady', JSON.stringify($scope.prizeList));
            })
            .error(function(data, status, header, config) {
                $scope.error = data;
                // TODO: display error
            });
    };

    $scope.refresh = function() {
        $window.location.reload();
    };

    $scope.print = function() {
        $window.print();
    };

    $scope.init();
}])
.directive('resultBoard', function(){
    return {
        restrict: 'E',
        replace: true,
        scope: {
        },
        templateUrl: 'result-board.html',
        controller: function ($scope) {
            $scope.$on('prizeReady', function(event, msg) {
                $scope.viewData = $scope.convertPrizeList(JSON.parse(msg));
                console.log($scope.viewData);
            });

            $scope.convertPrizeList = function(prizeList) {
                /*
                    array of
                    {
                        name:..,
                        desc:..,
                        winnerCount:..
                        winners:[[{..},{..},{..},{..},{..}],[{..},{..}]]
                    }
                 */
                var ret = [];
                _.each(prizeList, function(prize) {
                    var block = {name:prize.name, desc:prize.desc, winnerCount:prize.winners.length};

                    block.winners = [];

                    // convert prize.winners into array of rows, each row contains at most 5 person
                    //
                    var batchSize = 5;
                    var batch = [];
                    for (var i = 0; i < prize.winners.length; i++) {
                        batch.push(prize.winners[i]);
                        if (batch.length >= batchSize) {
                            block.winners.push(batch);
                            batch = [];
                        }
                    }
                    if (batch.length > 0)
                        block.winners.push(batch);  // last chunk

                    ret.push(block);
                });
                return ret;
            };
        }
    };
})
;

