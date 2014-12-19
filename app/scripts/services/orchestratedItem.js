'use strict';

angular.module('deckApp')
  .factory('orchestratedItem', function(momentService, $log) {
    function defineProperties(item) {
      var testDescriptor = Object.getOwnPropertyDescriptor(item, 'runningTime');
      if (testDescriptor && !testDescriptor.enumerable) {
        return;
      }

      item.originalStatus = item.status;
      Object.defineProperties(item, {
        isCompleted: {
          get: function() {
            return item.status === 'COMPLETED';
          },
        },
        isRunning: {
          get: function() {
            return item.status === 'RUNNING';
          },
        },
        isFailed: {
          get: function() {
            return item.status === 'FAILED';
          },
        },
        hasNotStarted: {
          get: function() {
            return item.status === 'NOT_STARTED';
          }
        },
        status: {
          // Returns either COMPLETED, RUNNING, FAILED, or NOT_STARTED
          get: function() { return normalizeStatus(item); },
          set: function(status) {
            item.originalStatus = status;
            normalizeStatus(item);
          }
        },
        runningTime: {
          get: function() {
            return momentService
              .duration(parseInt(item.endTime) - parseInt(item.startTime))
              .humanize();
          }
        }
      });
    }

    function normalizeStatus(item) {
      switch(item.originalStatus) {
        case 'COMPLETED':
        case 'SUCCEEDED':
          return 'COMPLETED';
        case 'STARTED':
        case 'EXECUTING':
        case 'RUNNING':
          return 'RUNNING';
        case 'FAILED':
        case 'TERMINAL':
        case 'STOPPED':
        case 'SUSPENDED':
          return 'FAILED';
        case 'NOT_STARTED':
          return 'NOT_STARTED';
        default:
          $log.warn('Unrecognized status:', item.originalStatus);
          return item.originalStatus;
      }
    }

    return {
      defineProperties: defineProperties,
    };
  });
