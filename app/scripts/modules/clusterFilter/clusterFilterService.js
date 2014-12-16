'use strict';

angular
  .module('cluster.filter.service', ['cluster.filter.model'])
  .factory('clusterFilterService', function ($location, $stateParams, ClusterFilterModel) {

    function updateQueryParams() {
      resetParamState();

      var defPrimary = 'account';
      var defSecondary = 'region';

      $location.search('q',
          ClusterFilterModel.sortFilter.filter.length > 0 ? ClusterFilterModel.sortFilter.filter : null);
      $location.search('hideHealth', ClusterFilterModel.sortFilter.hideHealthy ? true : null);
      $location.search('hideInstances', ClusterFilterModel.sortFilter.showAllInstances ? null : true);
      $location.search('hideDisabled', ClusterFilterModel.sortFilter.hideDisabled ? true : null);
      $location.search('primary',
        ClusterFilterModel.sortFilter.sortPrimary === defPrimary ? null : ClusterFilterModel.sortFilter.sortPrimary);
      $location.search('secondary',
          ClusterFilterModel.sortFilter.sortSecondary === defSecondary ? null : ClusterFilterModel.sortFilter.sortSecondary);

      updateAccountParams();
      updateRegionParams();
      updateStatusParams();
      updateProviderTypeParams();
      updateInstanceTypeParams();

      preserveState();

    }

    function resetParamState() {
      $stateParams = {};
    }

    function preserveState() {
      _.forOwn($location.search(), function(value, key) {
        $stateParams[key] = value;
      });
    }

    function updateAccountParams() {
      var acct = convertTrueModelValuesToArray(ClusterFilterModel.sortFilter.account);
      $location.search('acct', acct.length ? acct.join() : null);
    }

    function updateRegionParams() {
      var reg = convertTrueModelValuesToArray(ClusterFilterModel.sortFilter.region);
      $location.search('reg', reg.length ? reg.join() : null);
    }

    function updateStatusParams() {
      var status = convertTrueModelValuesToArray(ClusterFilterModel.sortFilter.status);
      $location.search('status', status.length ? status.join() : null);
    }

    function updateProviderTypeParams() {
      var providerTypes = convertTrueModelValuesToArray(ClusterFilterModel.sortFilter.providerType);
      $location.search('providerType', providerTypes.length ? providerTypes.join() : null);
    }

    function updateInstanceTypeParams() {
      var instanceTypes = convertTrueModelValuesToArray(ClusterFilterModel.sortFilter.instanceType);
      $location.search('instanceType', instanceTypes.length ? instanceTypes.join() : null);
    }

    function convertTrueModelValuesToArray(modelObject) {
      var result = [];
      _.forOwn(modelObject, function (value, key) {
        if (value) {
          result.push(key);
        }
      });
      return result;
    }

    function incrementTotalInstancesDisplayed(totalInstancesDisplayed, serverGroups) {
      return serverGroups
        .filter(checkAgainstActiveFilters)
        .reduce(function(total, serverGroup) {
          return serverGroup.instances.length + total;
        }, totalInstancesDisplayed);
    }


    function checkAgainstActiveFilters(serverGroup) {
      return [
          ClusterFilterModel.sortFilter.hideHealthy && serverGroup.downCount === 0,
          ClusterFilterModel.sortFilter.hideDisabled && serverGroup.isDisabled,
      ].some(function(x) {
          return x;
        }) ? false : true;
    }

    function isFilterable(sortFilterModel) {
      return _.size(sortFilterModel) > 0 && _.any(sortFilterModel);
    }

    function getCheckValues(sortFlterModel) {
      return  _.reduce(sortFlterModel, function(acc, val, key) {
        if (val) {
          acc.push(key);
        }
        return acc;
      }, []);
    }

    function checkAccountFilters(serverGroup) {
      if(isFilterable(ClusterFilterModel.sortFilter.account)) {
        var checkedAccounts = getCheckValues(ClusterFilterModel.sortFilter.account);
        return _.contains(checkedAccounts, serverGroup.account);
      } else {
        return true;
      }
    }

    function checkRegionFilters(serverGroup) {
      if(isFilterable(ClusterFilterModel.sortFilter.region)) {
        var checkedRegions = getCheckValues(ClusterFilterModel.sortFilter.region);
        return _.contains(checkedRegions, serverGroup.region);
      } else {
        return true;
      }
    }

    function checkStatusFilters(serverGroup) {
      if(isFilterable(ClusterFilterModel.sortFilter.status)) {
        var checkedStatus = getCheckValues(ClusterFilterModel.sortFilter.status);
        return _.contains(checkedStatus, 'healthy') && serverGroup.downCount === 0 ||
               _.contains(checkedStatus, 'unhealthy') && serverGroup.downCount > 0 ||
               _.contains(checkedStatus, 'disabled') && serverGroup.isDisabled;
      } else {
        return true;
      }
    }

    function providerTypeFilters(serverGroup) {
      if(isFilterable(ClusterFilterModel.sortFilter.providerType)) {
        var checkedProviderTypes = getCheckValues(ClusterFilterModel.sortFilter.providerType);
        return _.contains(checkedProviderTypes, serverGroup.type);
      } else {
        return true;
      }
    }

    function instanceTypeFilters(serverGroup) {
      if(isFilterable(ClusterFilterModel.sortFilter.instanceType)) {
        var checkedInstanceTypes = getCheckValues(ClusterFilterModel.sortFilter.instanceType);
        return _.contains(checkedInstanceTypes, serverGroup.instanceType);
      } else {
        return true;
      }
    }

    function filterServerGroupsForDisplay(clusters, filter) {
      return  _.chain(clusters)
        .collect('serverGroups')
        .flatten()
        .filter(function(serverGroup) {
          if (!filter) {
            return true;
          }
          return filter.split(' ').every(function(testWord) {
            return serverGroup.searchField.indexOf(testWord) !== -1;
          });
        })
        .filter(checkAgainstActiveFilters)
        .filter(checkAccountFilters)
        .filter(checkRegionFilters)
        .filter(checkStatusFilters)
        .filter(providerTypeFilters)
        .filter(instanceTypeFilters)
        .value();
    }



    function updateClusterGroups(application) {
        var groups = [],
          totalInstancesDisplayed = 0,
          primarySort = ClusterFilterModel.sortFilter.sortPrimary,
          secondarySort = ClusterFilterModel.sortFilter.sortSecondary,
          tertiarySort = ClusterFilterModel.sortFilter.sortOptions.filter(function(option) { return option.key !== primarySort && option.key !== secondarySort; })[0].key;

        var filter = ClusterFilterModel.sortFilter.filter.toLowerCase();
        var serverGroups = filterServerGroupsForDisplay(application.clusters, filter);

        var grouped = _.groupBy(serverGroups, primarySort);

        _.forOwn(grouped, function(group, key) {
          var subGroupings = _.groupBy(group, secondarySort),
            subGroups = [];

          _.forOwn(subGroupings, function(subGroup, subKey) {
            var subGroupings = _.groupBy(subGroup, tertiarySort),
              subSubGroups = [];

            _.forOwn(subGroupings, function(subSubGroup, subSubKey) {
              totalInstancesDisplayed = incrementTotalInstancesDisplayed(totalInstancesDisplayed, subSubGroup);
              subSubGroups.push( { heading: subSubKey, serverGroups: subSubGroup } );
            });
            subGroups.push( { heading: subKey, subgroups: _.sortBy(subSubGroups, 'heading') } );
          });

          groups.push( { heading: key, subgroups: _.sortBy(subGroups, 'heading') } );

        });

        sortGroupsByHeading(groups);
        setDisplayOptions(totalInstancesDisplayed);
        return groups;
    }

    function sortGroupsByHeading(groups) {
      var sortedGroups = _.sortBy(groups, 'heading');
      ClusterFilterModel.groups.length = 0;
      sortedGroups.forEach(function(group) {
        ClusterFilterModel.groups.push(group);
      });
    }

    function setDisplayOptions(totalInstancesDisplayed) {
      ClusterFilterModel.displayOptions =  {
        renderInstancesOnScroll: totalInstancesDisplayed > 2000, // TODO: move to config
        totalInstancesDisplayed: totalInstancesDisplayed,
        showInstances: ClusterFilterModel.sortFilter.showAllInstances,
        hideHealthy: ClusterFilterModel.sortFilter.hideHealthy,
        filter: ClusterFilterModel.sortFilter.filter
      };
    }

    function clearFilters() {
      ClusterFilterModel.clearFilters();
      updateQueryParams();
    }

    return {
      sortFilter: ClusterFilterModel.sortFilter,
      updateQueryParams: updateQueryParams,
      updateClusterGroups: updateClusterGroups,
      filterServerGroupsForDisplay: filterServerGroupsForDisplay,
      incrementTotalInstancesDisplayed: incrementTotalInstancesDisplayed,
      checkAgainstActiveFilters: checkAgainstActiveFilters,
      setDisplayOptions: setDisplayOptions,
      sortGroupsByHeading: sortGroupsByHeading,
      clearFilters: clearFilters
    };
  }
);

