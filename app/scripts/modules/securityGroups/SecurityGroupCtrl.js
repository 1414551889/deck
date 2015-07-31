'use strict';

let angular = require('angular');

require('./configure/aws/editSecurityGroup.html');

module.exports = angular.module('spinnaker.securityGroup.single.controller', [
  require('angular-ui-router'),
  require('./securityGroup.read.service.js'),
])
  .controller('SecurityGroupCtrl', function($scope, $state, resolveSecurityGroup, app, securityGroupReader, $modal) {
    const application = app;
    const securityGroup = resolveSecurityGroup;
    $scope.displayOptions = {
      showServerGroups: true,
      showLoadBalancers: true
    };

    $scope.sortFilter = {
      allowSorting: false
    };

    $scope.account = securityGroup.account;
    $scope.region = securityGroup.region;

    function extractSecurityGroup() {
      $scope.securityGroup = securityGroupReader.getApplicationSecurityGroup(application, securityGroup.account, securityGroup.region, securityGroup.name);
      if (!$scope.securityGroup) {
        $state.go('^');
      }
    }

    extractSecurityGroup();

    application.registerAutoRefreshHandler(extractSecurityGroup, $scope);

    this.editInboundRules = function editInboundRules() {
      $modal.open({
        templateUrl: require('./configure/aws/editSecurityGroup.html'),
        controller: 'EditSecurityGroupCtrl as ctrl',
        resolve: {
          securityGroup: function() {
            return securityGroupReader.getSecurityGroupDetails(application, securityGroup.account, securityGroup.region, securityGroup.name);
          },
          applicationName: function() { return application.name; }
        }
      });
    };
  }
).name;
