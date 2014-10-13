'use strict';


angular.module('deckApp')
  .directive('validateMax', function (isEmpty) {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, elem, attr, ctrl) {
        scope.$watch(attr.validateMax, function (newVal, oldVal) {
          if (newVal !== oldVal && (ctrl.$viewValue || ctrl.$dirty)) {
            ctrl.$setViewValue(ctrl.$viewValue);
          }
        });
        var maxValidator = function (value) {
          var max = scope.$eval(attr.validateMax) || Infinity;
          if (!isEmpty(value) && value > max) {
            ctrl.$setValidity('validateMax', false);
            return undefined;
          } else {
            ctrl.$setValidity('validateMax', true);
            return value;
          }
        };

        ctrl.$parsers.push(maxValidator);
        ctrl.$formatters.unshift(maxValidator);
      }
    };
  }
);
