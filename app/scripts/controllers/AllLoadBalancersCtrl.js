'use strict';

require('../app');
var angular = require('angular');

angular.module('deckApp')
  .controller('AllLoadBalancersCtrl', function($scope, application, _, $filter, $modal) {
    $scope.application = application;

    $scope.sortFilter = {
      sortPrimary: 'account',
      filter: '',
      showAsgs: true,
      showAllInstances: false,
      hideHealthy: false
    };

    $scope.sortOptions = [
      { label: 'Account', key: 'account' },
      { label: 'Region', key: 'region' }
    ];

    function addSearchField(loadBalancers) {
      loadBalancers.forEach(function(loadBalancer) {
        if (!loadBalancer.searchField) {
          loadBalancer.searchField = [
            loadBalancer.name,
            loadBalancer.region.toLowerCase(),
            loadBalancer.account,
            _.pluck(loadBalancer.serverGroups, 'name').join(' ')
          ].join(' ');
        }
      });
    }

    function matchesFilter(filter, loadBalancer) {
      return filter.every(function (testWord) {
        return loadBalancer.searchField.indexOf(testWord) !== -1;
      });
    }

    function filterLoadBalancersForDisplay(loadBalancers, hideHealthy, filter) {
      return loadBalancers.filter(function (loadBalancer) {
        if (hideHealthy) {
          var hasUnhealthy = loadBalancer.serverGroups.some(function (serverGroup) {
            return serverGroup.downCount > 0;
          });
          if (!hasUnhealthy) {
            return false;
          }
        }
        if (!filter.length) {
          return true;
        }
        return matchesFilter(filter, loadBalancer);
      });
    }

    function incrementTotalInstancesDisplayed(totalInstancesDisplayed, loadBalancer) {
      if (!$scope.sortFilter.hideHealthy) {
        totalInstancesDisplayed += loadBalancer.reduce(function (total, elb) {
          return elb.instances.length + total;
        }, 0);
      } else {
        totalInstancesDisplayed += loadBalancer.reduce(
          function (total, elb) {
            return (elb.downCount > 0 ? elb.instances.length : 0) + total;
          }, 0
        );
      }
      return totalInstancesDisplayed;
    }

    function updateLoadBalancerGroups() {
      $scope.$evalAsync(function() {
        var loadBalancers = application.loadBalancers,
            totalInstancesDisplayed = 0,
            groups = [],
            filter = $scope.sortFilter.filter ? $scope.sortFilter.filter.toLowerCase().split(' ') : [],
            primarySort = $scope.sortFilter.sortPrimary,
            secondarySort = $scope.sortOptions.filter(function(option) { return option.key !== primarySort; })[0].key,
            hideHealthy = $scope.sortFilter.hideHealthy;

        addSearchField(loadBalancers);

        var filtered = filterLoadBalancersForDisplay(loadBalancers, hideHealthy, filter);
        var grouped = _.groupBy(filtered, primarySort);

        _.forOwn(grouped, function(group, key) {
          var subGroupings = _.groupBy(group, secondarySort),
            subGroups = [];

          _.forOwn(subGroupings, function(subGroup, subKey) {
            totalInstancesDisplayed = incrementTotalInstancesDisplayed(totalInstancesDisplayed, subGroup);
            subGroups.push( { heading: subKey, subgroups: _.sortBy(subGroup, 'name') } );
          });

          groups.push( { heading: key, subgroups: _.sortBy(subGroups, 'heading') } );
        });

        $scope.groups = _.sortBy(groups, 'heading');

        $scope.displayOptions = {
          renderInstancesOnScroll: totalInstancesDisplayed > 2000, // TODO: move to config
          showServerGroups: $scope.sortFilter.showAsgs,
          showInstances: $scope.sortFilter.showAllInstances,
          hideHealthy: $scope.sortFilter.hideHealthy
        };
      });
    }

    this.createLoadBalancer = function createLoadBalancer() {
      $modal.open({
        templateUrl: 'views/application/modal/createLoadBalancer.html',
        controller: 'CreateLoadBalancerCtrl as ctrl'
      });
    };

    this.updateLoadBalancerGroups = _.debounce(updateLoadBalancerGroups, 200);

    this.updateLoadBalancerGroups();

  }
);
