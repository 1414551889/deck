'use strict';


angular.module('deckApp')
  .directive('subnetSelectField', function () {
    return {
      restrict: 'E',
      templateUrl: 'views/directives/subnetSelectField.html',
      scope: {
        subnets: '=',
        component: '=',
        field: '@',
        region: '=',
        onChange: '&'
      }
    };
  }
);
