'use strict';

let angular = require('angular');

module.exports = angular.module('spinnaker.modal.modalOverlay.directive', [
])
  .directive('modalOverlay', function($timeout) {
    return {
      restrict: 'A',
      link: function(scope, elem) {
        $timeout(function() {
          var $modal = elem.closest('.modal-content'),
            modalHeight = $modal.height();

          if (modalHeight < 450) {
            modalHeight = 450;
          }

          $modal.height(modalHeight);
          elem.show().height(modalHeight).css({opacity: 1});

          scope.$on('$destroy', function() {
            elem.hide();
            elem.height(0).css({opacity: 0, scrollTop: 0});
            $modal.height('auto');
          });
        });
      }
    };
}).name;
