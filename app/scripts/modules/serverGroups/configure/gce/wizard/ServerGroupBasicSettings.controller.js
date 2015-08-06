'use strict';

let angular = require('angular');

require('./basicSettings.html');

module.exports = angular.module('spinnaker.serverGroup.configure.gce.basicSttings.controller', [])
  .controller('gceServerGroupBasicSettingsCtrl', function($scope, modalWizardService) {

    $scope.$watch('form.$valid', function(newVal) {
      if (newVal) {
        modalWizardService.getWizard().markClean('location');
      } else {
        modalWizardService.getWizard().markDirty('location');
      }
    });

  }).name;
