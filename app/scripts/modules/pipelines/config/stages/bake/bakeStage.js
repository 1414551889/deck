'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.pipelines.stage.bakeStage', [
  require('utils/lodash.js'),
  require('../../pipelineConfigProvider.js'),
  require('./bakery.service.js'),
])
  //BEN_TODO: executionDetailsUrl?
  .config(function(pipelineConfigProvider) {
    pipelineConfigProvider.registerStage({
      label: 'Bake',
      description: 'Bakes an image in the specified region',
      key: 'bake',
      controller: 'BakeStageCtrl',
      controllerAs: 'bakeStageCtrl',
      templateUrl: require('./bakeStage.html'),
      executionDetailsUrl: require('./bakeExecutionDetails.html'),
      defaultTimeoutMs: 60 * 60 * 1000, // 60 minutes
      validators: [
        {
          type: 'requiredField',
          fieldName: 'package',
          message: '<strong>Package</strong> is a required field on bake stages.',
        },
        {
          type: 'requiredField',
          fieldName: 'regions',
          message: 'You must select at least one region on bake stages.',
        }
      ],
    });
  })
  .controller('BakeStageCtrl', function($scope, stage, bakeryService, $q, _, authenticationService, accountService) {
    var ctrl = this;

    $scope.stage = stage;

    stage.regions = stage.regions || [];

    if (!$scope.stage.user) {
      $scope.stage.user = authenticationService.getAuthenticatedUser().name;
    }

    $scope.viewState = {
      loading: true,
      providerSelected: !!$scope.stage.cloudProviderType,
      providerSelectionRequired: false,
    };

    accountService.listProviders().then(function(providers) {
      if (providers.length > 1) {
        $scope.viewState.providerSelectionRequired = true;
        $scope.viewState.loading = false;
      } else {
        // If there is exactly one provider, and there is not already a provider selected, select the only choice.
        if (providers.length === 1 && !$scope.stage.cloudProviderType) {
          $scope.stage.cloudProviderType = providers[0];
        }

        $scope.viewState.providerSelectionRequired = false;
      }
      ctrl.providerSelected();
    });

    this.providerSelected = function() {
      $scope.viewState.providerSelected = true;
      $q.all({
        regions: bakeryService.getRegions($scope.stage.cloudProviderType),
        baseOsOptions: bakeryService.getBaseOsOptions(),
        baseLabelOptions: bakeryService.getBaseLabelOptions(),
        vmTypes: bakeryService.getVmTypes(),
        storeTypes: bakeryService.getStoreTypes(),
      }).then(function(results) {
        if (!$scope.stage.cloudProviderType || $scope.stage.cloudProviderType === 'aws') {
          $scope.regions = results.regions;
          $scope.vmTypes = results.vmTypes;
          if (!$scope.stage.vmType && $scope.vmTypes && $scope.vmTypes.length) {
            $scope.stage.vmType = $scope.vmTypes[0];
          }
          $scope.storeTypes = results.storeTypes;
          if (!$scope.stage.storeType && $scope.storeTypes && $scope.storeTypes.length) {
            $scope.stage.storeType = $scope.storeTypes[0];
          }
        } else {
          $scope.regions  = ['global'];
          delete $scope.stage.vmType;
          delete $scope.stage.storeType;
        }
        if ($scope.regions.length === 1) {
          $scope.stage.region = $scope.regions[0];
        } else if ($scope.regions.indexOf($scope.stage.region) === -1) {
          delete $scope.stage.region;
        }
        if (!$scope.stage.regions.length && $scope.application.defaultRegion) {
          $scope.stage.regions.push($scope.application.defaultRegion);
        }
        if (!$scope.stage.regions.length && $scope.application.defaultRegion) {
          $scope.stage.regions.push($scope.application.defaultRegion);
        }
        $scope.baseOsOptions = results.baseOsOptions;
        $scope.baseLabelOptions = results.baseLabelOptions;

        if (!$scope.stage.baseOs && $scope.baseOsOptions && $scope.baseOsOptions.length) {
          $scope.stage.baseOs = $scope.baseOsOptions[0];
        }
        if (!$scope.stage.baseLabel && $scope.baseLabelOptions && $scope.baseLabelOptions.length) {
          $scope.stage.baseLabel = $scope.baseLabelOptions[0];
        }
        $scope.viewState.loading = false;
      });
    };

    function deleteEmptyProperties() {
      _.forOwn($scope.stage, function(val, key) {
        if (val === '') {
          delete $scope.stage[key];
        }
      });
    }

    $scope.$watch('stage.cloudProviderType', this.providerSelected);
    $scope.$watch('stage', deleteEmptyProperties, true);
  }).name;
