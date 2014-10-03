'use strict';

require('../app');
var angular = require('angular');

angular.module('deckApp')
  .controller('ClusterCtrl', function($scope, cluster, application, oortService, _) {

    $scope.account = cluster.account;

    $scope.sortFilter = {
      allowSorting: false,
      filter: '',
      showAllInstances: true,
      hideHealthy: false
    };

    function filterServerGroups(serverGroups) {
      if (!$scope.sortFilter.hideHealthy) {
        return serverGroups;
      }
      return serverGroups.filter(function(serverGroup) {
        return serverGroup.downCount > 0;
      });
    }

    function updateClusterGroups() {
      var groupedAsgs = _.groupBy($scope.cluster.serverGroups, 'region'),
        regions = _.keys(groupedAsgs),
        serverGroupsByRegion = [];

      regions.forEach(function(region) {
        var filtered = filterServerGroups(groupedAsgs[region]);
        if (filtered.length) {
          serverGroupsByRegion.push({ region: region, serverGroups: filtered });
        }
      });
      $scope.serverGroupsByRegion = serverGroupsByRegion;

      $scope.displayOptions = {
        showInstances: $scope.sortFilter.showAllInstances,
        hideHealthy: $scope.sortFilter.hideHealthy
      };
    }

    this.updateClusterGroups = updateClusterGroups;

    function initializeController() {
      extractCluster();
      updateClusterGroups();
    }

    function extractCluster() {
      $scope.cluster = application.getCluster(cluster.account, cluster.clusterName);
    }

    initializeController();

    application.registerAutoRefreshHandler(initializeController, $scope);

  }
);
