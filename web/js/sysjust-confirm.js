/**
 * Created by derektu on 1/17/15.
 */

/*
    An angular module to support bootstrap-style confirm screen
 */
var app = angular.module('sysjust.confirm', ['ui.bootstrap']);
app.service('$confirm', function($modal) {
    var self = this;

    self.confirm = function(msg) {
        var modalInstance = $modal.open({
            template: self.getTemplate(),
            controller: 'ConfirmCtrl',
            resolve: {
                msg: function() {
                    return msg;
                }
            }
        });
        return modalInstance.result;
    };

    self.getTemplate = function() {
        var template = '';
        template += '<div class="modal-body confirm-text">{{msg}}</div>';
        template += '<div class="modal-footer">';
        template += '<button class="btn btn-primary" ng-click="ok()"> OK </button>';
        template += '<button class="btn btn-warning" ng-click="cancel()"> Cancel </button>';
        template += '</div>';
        return template;
    }
})
.controller('ConfirmCtrl', ['$scope', '$modalInstance', 'msg', function($scope, $modalInstance, msg) {
    $scope.msg = msg;

    $scope.ok = function () {
        $modalInstance.close();
    };

    $scope.cancel = function () {
        $modalInstance.dismiss('cancel');
    };
}]);

