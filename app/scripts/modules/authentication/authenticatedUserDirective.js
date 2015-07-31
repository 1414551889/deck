'use strict';

let angular = require('angular');

require('./authenticatedUser.html');

module.exports = angular.module('spinnaker.authentication.directive', [
  require('./authenticationService.js'),
])
  .directive('authenticatedUser', function(authenticationService) {
    return {
      restrict: 'E',
      templateUrl: require('./authenticatedUser.html'),
      link: function(scope) {
        scope.user = authenticationService.getAuthenticatedUser();
      }
    };
  })
  .name;
