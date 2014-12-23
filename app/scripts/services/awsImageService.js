'use strict';


angular.module('deckApp')
  .factory('awsImageService', function (settings, $q, Restangular, scheduledCache) {

    function findImages(params) {
      if (!params.q || params.q.length < 3) {
        return $q.when([{message: 'Please enter at least 3 characters...'}]);
      }
      return Restangular.all('images/find').withHttpConfig({cache: scheduledCache}).getList(params, {}).then(function(results) {
          return results;
        },
        function() {
          return [];
        });
    }

    function getAmi(amiName, region, credentials) {
      return Restangular.all('images').one(credentials).one(region).all(amiName).getList({provider: 'aws'}).then(function(results) {
          return results && results.length ? results[0] : null;
        },
        function() {
          return null;
        });
    }

    return {
      findImages: findImages,
      getAmi: getAmi,
    };
  });
