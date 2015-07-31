'use strict';

let angular = require('angular');

require('./createPipelineModal.html');

module.exports = angular.module('spinnaker.pipelines.config.actions.create.CreatePipelineButtonCtrl', [
])
  .controller('CreatePipelineButtonCtrl', function($scope, $modal) {
    this.createPipeline = function() {
      $modal.open({
        templateUrl: require('./createPipelineModal.html'),
        controller: 'CreatePipelineModalCtrl',
        controllerAs: 'createPipelineModalCtrl',
        resolve: {
          application: function() { return $scope.application; },
          target: function() { return $scope.target; },
          reinitialize: function() { return $scope.reinitialize; },
        }
      });
    };
  }).name;
