'use strict';

module.exports = function ($rootScope, $timeout, $filter, scrollTriggerService, _, waypointService, clusterFilterService, ClusterFilterModel) {
  return {
    restrict: 'E',
    templateUrl: require('../modules/cluster/serverGroup.html'),
    scope: {
      cluster: '=',
      serverGroup: '=',
      application: '=',
      parentHeading: '=',
    },
    link: function (scope, el) {

      scope.sortFilter = ClusterFilterModel.sortFilter;
      // stolen from uiSref directive
      var base = el.parent().inheritedData('$uiView').state;

      scope.$state = $rootScope.$state;

      function setViewModel() {
        var filteredInstances = scope.serverGroup.instances.filter(clusterFilterService.shouldShowInstance);

        var serverGroup = scope.serverGroup;

        scope.viewModel = {
          waypoint: [serverGroup.account, serverGroup.region, serverGroup.name].join(':'),
          serverGroup: serverGroup,
          serverGroupSequence: $filter('serverGroupSequence')(serverGroup.name),
          jenkins: null,
          hasBuildInfo: !!serverGroup.buildInfo,
          instances: filteredInstances,
        };

        if (serverGroup.buildInfo && serverGroup.buildInfo.jenkins && serverGroup.buildInfo.jenkins.host) {
          var jenkins = serverGroup.buildInfo.jenkins;
          scope.viewModel.jenkins = {
            href: [jenkins.host + 'job', jenkins.name, jenkins.number, ''].join('/'),
            number: jenkins.number,
          };
        }
      }

      scope.loadDetails = function(e) {
        $timeout(function() {
          var serverGroup = scope.serverGroup;
          // anything handled by ui-sref or actual links should be ignored
          if (e.isDefaultPrevented() || (e.originalEvent && (e.originalEvent.defaultPrevented || e.originalEvent.target.href))) {
            return;
          }
          var params = {
            region: serverGroup.region,
            accountId: serverGroup.account,
            serverGroup: serverGroup.name,
            provider: serverGroup.type,
          };
          // also stolen from uiSref directive
          scope.$state.go('.serverGroup', params, {relative: base, inherit: true});
        });
      };

      setViewModel();

      scope.headerIsSticky = function() {
        if (!scope.sortFilter.showAllInstances) {
          return false;
        }
        if (scope.sortFilter.listInstances) {
          return scope.viewModel.instances.length > 1;
        }
        return scope.viewModel.instances.length > 20;
      };

      scope.$watch('sortFilter', setViewModel, true);
    }
  };
};
