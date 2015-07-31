'use strict';

let angular = require('angular');

require('./parameter.html');

module.exports = angular.module('spinnaker.pipelines.parameters.parameter', [
])
  .directive('parameter', function() {
    return {
      restrict: 'E',
      scope: {
        parameter: '=',
        pipeline: '='
      },
      controller: 'ParameterCtrl as parameterCtrl',
      templateUrl: require('./parameter.html'),
    };
  })
  .controller('ParameterCtrl', function($scope) {

    this.remove = function(parameter) {
      var index = $scope.pipeline.parameterConfig.indexOf(parameter);
      $scope.pipeline.parameterConfig.splice(index, 1);
    };

  }).name;
