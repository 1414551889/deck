'use strict';

let angular = require('angular');

require('./migrator.modal.submitting.html');
require('./migrator.directive.html');
require('./migrator.modal.html');

module.exports = angular
  .module('spinnaker.migrator.directive', [
    require('exports?"ui.bootstrap"!angular-bootstrap'),
    require('../vpc/vpc.read.service.js'),
    require('../../settings/settings.js'),
    require('./migrator.service.js'),
  ])
  .directive('migrator', function () {
    return {
      restrict: 'E',
      replace: true,
      scope: {
        application: '=',
        component: '=',
        type: '@',
      },
      templateUrl: require('./migrator.directive.html'),
      controller: 'MigratorActionCtrl',
      controllerAs: 'migratorActionCtrl',
    };
  })
  .controller('MigratorActionCtrl', function ($scope, $modal, vpcReader, settings) {

    vpcReader.getVpcName($scope.component.vpcId).then(function (name) {
      $scope.showAction = name === 'Main' && settings.feature.vpcMigrator;
    });

    this.previewMigration = function () {
      $modal.open({
        templateUrl: require('./migrator.modal.html'),
        controller: 'MigratorCtrl as ctrl',
        resolve: {
          component: function () {
            return $scope.component;
          },
          application: function () {
            return $scope.application;
          },
          type: function() {
            return $scope.type;
          }
        }
      });
    };
  })
  .controller('MigratorCtrl', function ($scope, component, application, type, $modalInstance, migratorService) {

    var typeToField = {
      serverGroup: 'asgName',
      pipeline: 'pipelineId',
    };

    $scope.application = application;
    $scope.component = component;

    $scope.viewState = {
      computing: true,
    };

    $scope.source = {
      region: component.region,
      account: component.account
    };

    $scope.source[typeToField[type]] = component.name;

    var target = {
      region: component.region,
      account: component.account,
      vpcName: 'vpc0'
    };

    var dryRun = migratorService.executeMigration({
      source: $scope.source,
      target: target,
      dryRun: true,
      application: application
    });

    dryRun.deferred.promise.then(
      function () {
        $scope.viewState.computing = false;
        $scope.preview = dryRun.executionPlan;
      },
      function (error) {
        $scope.viewState.computing = false;
        $scope.viewState.error = error;
      }
    );

    this.cancel = function () {
      dryRun.deferred.promise.cancelled = true;
      if ($scope.executor) {
        $scope.executor.deferred.promise.cancelled = true;
      }
      $modalInstance.dismiss();
    };

    this.submit = function () {
      $scope.viewState.executing = true;
      var executor = migratorService.executeMigration({
        source: $scope.source,
        target: target,
        dryRun: false,
        application: application
      });
      executor.deferred.promise.then(
        function () {
          $scope.viewState.executing = false;
          $scope.viewState.migrationComplete = true;
        },
        function (error) {
          $scope.viewState.executing = false;
          $scope.viewState.error = error;
        }
      );
      $scope.executor = executor;
    };

  })
.name;
