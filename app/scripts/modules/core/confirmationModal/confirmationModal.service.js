'use strict';

let angular = require('angular');

require('./confirmationModal.less');

module.exports = angular.module('spinnaker.core.confirmationModal.service', [
  require('../task/monitor/taskMonitor.module.js'),
  require('../account/account.module.js'),
  require('angular-ui-router'),
  require('angular-ui-bootstrap'),
])
  .factory('confirmationModalService', function($modal) {
    var defaults = {
      buttonText: 'Confirm',
      cancelButtonText: 'Cancel'
    };

    function confirm(params) {
      params = angular.extend(angular.copy(defaults), params);

      var modalArgs = {
        templateUrl: require('./confirm.html'),
        controller: 'ConfirmationModalCtrl as ctrl',
        resolve: {
          params: function() {
            return params;
          }
        }
      };

      if (params.size) {
        modalArgs.size = params.size;
      }
      return $modal.open(modalArgs).result;
    }

    return {
      confirm: confirm
    };
  })
  .controller('ConfirmationModalCtrl', function($scope, $state, $modalInstance, accountService, params, taskMonitorService) {
    $scope.params = params;

    $scope.state = {
      submitting: false
    };

    if (params.taskMonitorConfig) {
      params.taskMonitorConfig.modalInstance = $modalInstance;

      $scope.taskMonitor = taskMonitorService.buildTaskMonitor(params.taskMonitorConfig);
    }

    $scope.verification = {
      requireAccountEntry: accountService.challengeDestructiveActions(params.provider, params.account),
      verifyAccount: ''
    };

    this.formDisabled = function () {
      return $scope.verification.requireAccountEntry && $scope.verification.verifyAccount !== params.account.toUpperCase();
    };

    function showError(exception) {
      $scope.state.error = true;
      $scope.state.submitting = false;
      $scope.errorMessage = exception;
    }

    this.confirm = function () {
      if (!this.formDisabled()) {
        if ($scope.taskMonitor) {
          $scope.taskMonitor.submit(params.submitMethod);
        } else {
          if (params.submitMethod) {
            $scope.state.submitting = true;
            params.submitMethod().then($modalInstance.close, showError);
          } else {
            $modalInstance.close();
          }
        }
      }
    };

    this.cancel = function () {
      $modalInstance.dismiss();
    };
  }).name;
