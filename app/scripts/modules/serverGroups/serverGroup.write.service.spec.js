'use strict';

describe('serverGroupWriter', function () {
  const angular = require('angular');

  var serverGroupWriter,
    $httpBackend;

  beforeEach(
    window.module(
      require('./serverGroup.write.service.js'),
      require('./configure/aws/serverGroup.transformer.service.js')
    )
  );

  beforeEach(function () {
    window.inject(function (_serverGroupWriter_, _$httpBackend_) {
      serverGroupWriter = _serverGroupWriter_;
      $httpBackend = _$httpBackend_;
    });
  });

  describe('clone server group submit', function () {

    function postTask(command) {
      var submitted = null;
      $httpBackend.expectPOST('/applications/appName/tasks', function (bodyString) {
        submitted = angular.fromJson(bodyString);
        return true;
      }).respond(200, {ref: '/1'});

      $httpBackend.expectGET('/applications/appName/tasks/1').respond({});

      serverGroupWriter.cloneServerGroup(command, { name: 'appName', reloadTasks: angular.noop });
      $httpBackend.flush();

      return submitted;
    }

    it('sets amiName from allImageSelection', function () {
      var command = {
          viewState: {
            mode: 'create',
            useAllImageSelection: true,
            allImageSelection: 'something-packagebase',
          },
          application: { name: 'theApp'}
        };

      var submitted = postTask(command);

      expect(submitted.job[0].amiName).toBe('something-packagebase');

    });

    it('removes subnetType property when null', function () {
      var command = {
          viewState: {
            mode: 'create',
            useAllImageSelection: true,
            allImageSelection: 'something-packagebase',
          },
          subnetType: null,
          application: { name: 'theApp'}
        };

      var submitted = postTask(command);
      expect(submitted.job[0].subnetType).toBe(undefined);

      command.subnetType = 'internal';
      submitted = postTask(command);
      expect(submitted.job[0].subnetType).toBe('internal');
    });

    it('sets action type and description appropriately when creating new', function () {
      var command = {
          viewState: {
            mode: 'create',
          },
          application: { name: 'theApp'}
        };

      var submitted = postTask(command);
      expect(submitted.job[0].type).toBe('linearDeploy');
      expect(submitted.description).toBe('Create New Server Group in cluster appName');

      command.stack = 'main';
      submitted = postTask(command);
      expect(submitted.description).toBe('Create New Server Group in cluster appName-main');

      command.freeFormDetails = 'details';
      submitted = postTask(command);
      expect(submitted.description).toBe('Create New Server Group in cluster appName-main-details');

      delete command.stack;
      submitted = postTask(command);
      expect(submitted.description).toBe('Create New Server Group in cluster appName--details');
    });

    it('sets action type and description appropriately when cloning, preserving source', function () {
      var command = {
          viewState: {
            mode: 'clone',
          },
          source: {
            asgName: 'appName-v002',
          },
          application: { name: 'theApp'}
        };

      var submitted = postTask(command);
      expect(submitted.job[0].type).toBe('copyLastAsg');
      expect(submitted.description).toBe('Create Cloned Server Group from appName-v002');
      expect(submitted.job[0].source).toEqual(command.source);
    });
  });
});
