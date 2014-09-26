'use strict';

require('../app');
var angular = require('angular');

angular.module('deckApp')
  .controller('ClustersNavCtrl', function ($scope, application, _, $stateParams) {

    var defPrimary = 'cluster';
    $scope.sortFilter.sortPrimary = $stateParams.primary || defPrimary;

    $scope.application = application;

    $scope.sortOptions = [
      {
        label: 'Account',
        key: 'account',
        clusterKey: 'accountName',
        getDisplayValue: function(cluster) {
          return cluster.accountName || '';
        },
        getDisplayLabel: function(cluster) {
          return cluster.accountName || '';
        }
      },
      {
        label: 'Cluster Name',
        key: 'cluster',
        clusterKey: 'name',
        getDisplayValue: function(cluster) {
          return cluster.name;
        },
        getDisplayLabel: function(cluster) {
          return cluster.name;
        }
      },
      {
        label: 'Region',
        key: 'region',
        clusterKey: 'region',
        getDisplayValue: function(cluster) {
          return _.unique(_.collect(cluster.serverGroups, 'region')).sort();
        },
        getDisplayLabel: function(cluster) {
          return _.unique(_.collect(cluster.serverGroups, 'region')).sort().join(' ');
        }
      }
    ];

    function getSelectedSortOption() {
      return $scope.sortOptions.filter(function(option) {
        return option.key === $scope.sortFilter.sortPrimary;
      })[0];
    }

    this.getHeadings = function getHeadings() {
      var selectedOption = getSelectedSortOption();
      var allValues = application.clusters.map(selectedOption.getDisplayValue);
      return _.compact(_.unique(_.flatten(allValues))).sort();
    };

    this.getClustersFor = function getClustersFor(value) {
      return $scope.clusters.filter(function (cluster) {
        if ($scope.sortFilter.sortPrimary === 'region') {
          return cluster.serverGroups.some(function(serverGroup) {
            return serverGroup.region === value;
          });
        }
        return cluster.serverGroups &&
          cluster.serverGroups.length > 0 &&
          cluster[getSelectedSortOption().clusterKey] === value;
      });
    };

    this.getClusterLabel = function getClusterLabel(cluster) {
      if ($scope.sortFilter.sortPrimary === 'cluster') {
        return cluster.accountName;
      }
      return cluster.name;
    };

    this.getClusterSublabel = function getClusterSublabel(cluster) {
      var labelFields = $scope.sortOptions.filter(function(sortOption) {
        if ($scope.sortFilter.sortPrimary === 'cluster') {
          return sortOption.key === 'region';
        }
        return sortOption.key !== $scope.sortFilter.sortPrimary && sortOption.key !== 'cluster';
      });
      return labelFields[0].getDisplayLabel(cluster).toString();
    };

    $scope.clusters = application.clusters;
  }
);

