'use strict';

angular.module('deckApp.delivery')
  .factory('executionsService', function($stateParams, scheduler, orchestratedItem, $http, $timeout, settings, $q, RxService, applicationLevelScheduledCache, appendTransform) {
    function getCurrentExecution() {
      var deferred = $q.defer();
      getExecutions().then(function(executions) {
        // pipelines/:pipeline endpoint doesn't appear to work ATM
        deferred.resolve(executions.filter(function(execution) {
          return execution.id === $stateParams.executionId;
        })[0]);
      });
      return deferred.promise;
    }

    function getCurrentStage() {
      var deferred = $q.defer();
      getCurrentExecution().then(function(execution) {
        deferred.resolve(execution.stages.reduce(function(acc, stage) {
          if (stage.name === $stateParams.stageName) {
            acc = stage;
          }
          return acc;
        }, {}));
      }, function() {
      });
      return deferred.promise;
    }

    function fixStageTime(stage) {
      if (stage.tasks && stage.tasks.length) {
        stage.startTime = stage.tasks[0].startTime;
      }
    }

    function fixExecutionTime(execution) {
      if (execution.stages && execution.stages.length) {
        execution.startTime = Math.min(execution.stages[0].startTime, execution.startTime);
      }
    }

    function getExecutions() {
      var deferred = $q.defer();
      $http({
        method: 'GET',
        transformResponse: appendTransform(function(executions) {
          console.warn('oh hey just modifying your executions nbd');
          executions.forEach(function(execution) {
            orchestratedItem.defineProperties(execution);
            execution.stages.forEach(function(stage) {
              orchestratedItem.defineProperties(stage);
              if (stage.tasks && stage.tasks.length) {
                stage.tasks.forEach(orchestratedItem.defineProperties);
              }
            });

            // TODO: Remove when https://github.com/spinnaker/orca/issues/167 is resolved
            execution.stages.forEach(fixStageTime);
            fixExecutionTime(execution);
            // end TODO

            Object.defineProperty(execution, 'currentStage', {
              get: function() {
                if (execution.isCompleted) {
                  return execution.stages.indexOf(
                    execution.stages[execution.stages.length -1]
                  );
                }
                if (execution.isFailed) {
                  return execution.stages.indexOf(
                    execution.stages.filter(function(stage) {
                      return stage.isFailed;
                    })[0]
                  );
                }
                if (execution.isRunning) {
                  return execution.stages.indexOf(
                    execution.stages.filter(function(stage) {
                      return stage.isRunning;
                    })[0]
                  );
                }
              },
            });
          });
          return executions;
        }),
        url: [
          settings.gateUrl,
          'applications',
          $stateParams.application,
          'pipelines',
        ].join('/'),
      }).then(function(resp) {
        deferred.resolve(resp.data);
      });
      return deferred.promise;
    }

    return {
      getAll: getExecutions,
      forceRefresh: scheduler.scheduleImmediate,
      subscribeAll: function(fn) {
        return scheduler
          .get()
          .flatMap(function() {
            return RxService.Observable.fromPromise(getExecutions());
          })
          .subscribe(fn);
      },
      getCurrentExecution: getCurrentExecution,
      subscribeToCurrentExecution: function(fn) {
        return scheduler
          .get()
          .flatMap(function() {
            return RxService.Observable.fromPromise(getCurrentExecution());
          })
          .subscribe(fn);
      },
      getCurrentStage: getCurrentStage,
      subscribeToCurrentStage: function(fn) {
        return scheduler
          .get()
          .flatMap(function() {
            return RxService.Observable.fromPromise(getCurrentStage());
          })
          .subscribe(fn);
      },
    };
  });
