'use strict';


angular.module('deckApp')
  .controller('SortToggleCtrl', function($scope) {
    var ctrl = this;

    if (angular.isObject($scope.$parent.sortModel)) {
      $scope.model = $scope.$parent.sortModel;
    } else {
      $scope.model = {
        reverse: false,
      };
      $scope.$parent.sortModel = $scope.model;
    }

    if ($scope.default === 'true') {
      $scope.model.sortKey = $scope.key;
    }

    ctrl.setSortKey = function (key) {
      $scope.model.sortKey = key;
      $scope.model.reverse = ctrl.isSortKey(key) ? !$scope.model.reverse : false;
      if ($scope.onChange) {
        $scope.onChange();
      }
    };

    ctrl.isSortKey = function (key) {
      return $scope.$parent.sortModel.sortKey === key;
    };

  });
