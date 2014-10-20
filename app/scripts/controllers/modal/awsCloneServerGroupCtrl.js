'use strict';


angular.module('deckApp.aws')
  .controller('awsCloneServerGroupCtrl', function($scope, $modalInstance, _, $q, $exceptionHandler, $state,
                                               accountService, orcaService, mortService, oortService, searchService, serverGroupService,
                                               instanceTypeService, modalWizardService, securityGroupService, taskMonitorService,
                                               serverGroup, application, title) {
    $scope.title = title;
    $scope.healthCheckTypes = ['EC2', 'ELB'];
    $scope.terminationPolicies = ['OldestInstance', 'NewestInstance', 'OldestLaunchConfiguration', 'ClosestToNextInstanceHour', 'Default'];

    $scope.applicationName = application.name;

    $scope.state = {
      loaded: false,
      queryAllImages: false
    };

    $scope.taskMonitor = taskMonitorService.buildTaskMonitor({
      application: application,
      title: 'Creating your server group',
      forceRefreshMessage: 'Getting your new server group from Amazon...',
      modalInstance: $modalInstance,
      forceRefreshEnabled: true
    });

    var accountLoader = accountService.getRegionsKeyedByAccount().then(function(regionsKeyedByAccount) {
      $scope.accounts = _.keys(regionsKeyedByAccount);
      $scope.regionsKeyedByAccount = regionsKeyedByAccount;
    });

    var securityGroupLoader = securityGroupService.getAllSecurityGroups().then(function(securityGroups) {
      $scope.securityGroups = securityGroups;
    });

    var loadBalancerLoader = oortService.listLoadBalancers().then(function(loadBalancers) {
      $scope.loadBalancers = loadBalancers;
    });

    var subnetLoader = mortService.listSubnets().then(function(subnets) {
      $scope.subnets = subnets;
    });

    var preferredZonesLoader = accountService.getPreferredZonesByAccount().then(function(preferredZones) {
      $scope.preferredZones = preferredZones;
    });

    var imageLoader = searchService.search('oort', {q: application.name, type: 'namedImages', pageSize: 100000000}).then(function(searchResults) {
      $scope.packageImages = searchResults.results;
      if ($scope.packageImages.length === 0) {
        if (serverGroup) {
          searchService.search('oort', {q: serverGroup.launchConfig.imageId, type: 'namedImages'}).then(function (searchResults) {
            if (searchResults.results.length > 0) {
              var packageRegex = /(\w+)-?\w+/;
              $scope.imageName = searchResults.results[0].imageName;
              var match = packageRegex.exec($scope.imageName);
              $scope.applicationName = match[1];
              searchService.search('oort', {q: $scope.applicationName, type: 'namedImages', pageSize: 100000000}).then(function(searchResults) {
                $scope.packageImages = searchResults.results;
              });
            }
          });
        } else {
          $scope.state.queryAllImages = true;
        }
      }
    });

    $q.all([accountLoader, securityGroupLoader, loadBalancerLoader, subnetLoader, imageLoader, preferredZonesLoader]).then(function() {
      $scope.state.loaded = true;
      initializeCommand();
      initializeWizardState();
      initializeSelectOptions();
      initializeWatches();
    });

    function initializeWizardState() {
      if (serverGroup) {
        modalWizardService.getWizard().markComplete('location');
        modalWizardService.getWizard().markComplete('load-balancers');
        modalWizardService.getWizard().markComplete('security-groups');
        modalWizardService.getWizard().markComplete('instance-profile');
        modalWizardService.getWizard().markComplete('capacity');
        modalWizardService.getWizard().markComplete('advanced');
      }
    }

    function initializeWatches() {
      $scope.$watch('command.credentials', credentialsChanged);
      $scope.$watch('command.region', regionChanged);
      $scope.$watch('command.subnetType', subnetChanged);
      $scope.$watch('command.usePreferredZones', usePreferredZonesToggled);
    }

    function initializeSelectOptions() {
      credentialsChanged();
      regionChanged();
      configureSubnetPurposes();
      configureSecurityGroupOptions();
    }

    function credentialsChanged() {
      if ($scope.command.credentials) {
        $scope.regions = $scope.regionsKeyedByAccount[$scope.command.credentials].regions;
        if (!_($scope.regions).some({name: $scope.command.region})) {
          $scope.command.region = null;
        } else {
          regionChanged();
        }
      } else {
        $scope.command.region = null;
      }
    }

    function regionChanged() {
      var command = $scope.command;
      configureSubnetPurposes();
      var currentZoneCount = command.availabilityZones ? command.availabilityZones.length : 0;
      if (command.region) {
        if (!_($scope.regionSubnetPurposes).some({purpose: command.subnetType})) {
          command.subnetType = null;
        }
        subnetChanged();
        configureInstanceTypes();
        configureAvailabilityZones();
        configureImages();
      } else {
        $scope.regionalAvailabilityZones = null;
      }

      usePreferredZonesToggled();
      if (!command.usePreferredZones) {
        command.availabilityZones = _.intersection(command.availabilityZones, $scope.regionalAvailabilityZones);
        var newZoneCount = command.availabilityZones ? command.availabilityZones.length : 0;
        if (currentZoneCount !== newZoneCount) {
          modalWizardService.getWizard().markDirty('capacity');
        }
      }
    }

    function usePreferredZonesToggled() {
      var command = $scope.command;
      if (command.usePreferredZones) {
        command.availabilityZones = $scope.preferredZones[command.credentials][command.region].sort();
      }
    }

    function subnetChanged() {
      var subnet = _($scope.subnets)
        .find({'purpose': $scope.command.subnetType, 'account': $scope.command.credentials, 'region': $scope.command.region});
      $scope.command.vpcId = subnet ? subnet.vpcId : null;
      configureSecurityGroupOptions();
      configureLoadBalancerOptions();
    }

    function configureAvailabilityZones() {
      $scope.regionalAvailabilityZones = _.find($scope.regionsKeyedByAccount[$scope.command.credentials].regions,
        {'name': $scope.command.region}).availabilityZones;
    }

    function configureSubnetPurposes() {
      if ($scope.command.region === null) {
        $scope.regionSubnetPurposes = null;
      }
      $scope.regionSubnetPurposes = _($scope.subnets)
        .filter({'account': $scope.command.credentials, 'region': $scope.command.region, 'target': 'ec2'})
        .pluck('purpose')
        .uniq()
        .map(function(purpose) { return { purpose: purpose, label: purpose };})
        .valueOf();
    }

    function configureSecurityGroupOptions() {
      var newRegionalSecurityGroups = _($scope.securityGroups[$scope.command.credentials].aws[$scope.command.region])
        .filter({'vpcId': $scope.command.vpcId || null})
        .valueOf();
      if ($scope.regionalSecurityGroups && $scope.command.securityGroups) {
        var previousCount = $scope.command.securityGroups.length;
        // not initializing - we are actually changing groups
        var matchedGroupNames = $scope.command.securityGroups.map(function(groupId) {
          return _($scope.regionalSecurityGroups).find({id: groupId}).name;
        }).map(function(groupName) {
          return _(newRegionalSecurityGroups).find({name: groupName});
        }).filter(function(group) {
          return group;
        }).map(function(group) {
          return group.id;
        });
        $scope.command.securityGroups = matchedGroupNames;
        if (matchedGroupNames.length !== previousCount) {
          modalWizardService.getWizard().markDirty('security-groups');
        }

      }

      $scope.regionalSecurityGroups = newRegionalSecurityGroups;
    }

    function configureLoadBalancerOptions() {
      var newLoadBalancers = _($scope.loadBalancers)
        .pluck('accounts')
        .flatten(true)
        .filter({'name': $scope.command.credentials})
        .pluck('regions')
        .flatten(true)
        .filter({'name': $scope.command.region})
        .pluck('loadBalancers')
        .flatten(true)
        .pluck('elb')
        .remove(undefined)
        .filter({'vpcid': $scope.command.vpcId})
        .pluck('loadBalancerName')
        .unique()
        .valueOf();

      if ($scope.regionalLoadBalancers && $scope.command.loadBalancers) {
        var previousCount = $scope.command.loadBalancers.length;
        $scope.command.loadBalancers = _.intersection(newLoadBalancers, $scope.command.loadBalancers);
        if ($scope.command.loadBalancers.length !== previousCount) {
          modalWizardService.getWizard().markDirty('load-balancers');
        }
      }

      $scope.regionalLoadBalancers = newLoadBalancers;
    }

    function configureImages() {
      if ($scope.command.region) {
        $scope.regionalImages = _.filter($scope.packageImages, {region: $scope.command.region});
        if ($scope.command.amiName && !_($scope.regionalImages).some({imageName: $scope.command.amiName})) {
          $scope.command.amiName = null;
        }
      } else {
        $scope.regionalImages = null;
        $scope.command.amiName = null;
      }
    }

    function configureInstanceTypes() {
      if ($scope.command.region) {
        instanceTypeService.getAvailableTypesForRegions([$scope.command.region]).then(function (result) {
          $scope.regionalInstanceTypes = result;
          if ($scope.command.instanceType && result.indexOf($scope.command.instanceType) === -1) {
            $scope.regionalInstanceTypes.push($scope.command.instanceType);
          }
        });
      }
    }

    function buildCommandFromExisting(serverGroup) {
      var serverGroupName = serverGroupService.parseServerGroupName(serverGroup.asg.autoScalingGroupName);
      var zones = serverGroup.asg.availabilityZones.sort();
      var preferredZones = $scope.preferredZones[serverGroup.account][serverGroup.region].sort();
      var usePreferredZones = zones.join(',') === preferredZones.join(',');
      var command = {
        'application': serverGroupName.application,
        'stack': serverGroupName.stack,
        'freeFormDetails': serverGroupName.freeFormDetails,
        'credentials': serverGroup.account,
        'cooldown': serverGroup.asg.defaultCooldown,
        'healthCheckGracePeriod': serverGroup.asg.healthCheckGracePeriod,
        'healthCheckType': serverGroup.asg.healthCheckType,
        'terminationPolicies': serverGroup.asg.terminationPolicies,
        'loadBalancers': serverGroup.asg.loadBalancerNames,
        'region': serverGroup.region,
        'availabilityZones': zones,
        'usePreferredZones': usePreferredZones,
        'capacity': {
          'min': serverGroup.asg.minSize,
          'max': serverGroup.asg.maxSize,
          'desired': serverGroup.asg.desiredCapacity
        },
        'allImageSelection': null,
        'instanceProfile': 'custom'
      };
      if (serverGroup.launchConfig) {
        var amiName = null;
        if (serverGroup.launchConfig.imageId) {
          var foundImage = _($scope.packageImages).find({'imageId': serverGroup.launchConfig.imageId});
          if (foundImage) {
            amiName = foundImage.imageName;
          }
        }
        angular.extend(command, {
          'instanceType': serverGroup.launchConfig.instanceType,
          'iamRole': serverGroup.launchConfig.iamInstanceProfile,
          'keyPair': serverGroup.launchConfig.keyName,
          'associatePublicIpAddress': serverGroup.launchConfig.associatePublicIpAddress,
          'ramdiskId': serverGroup.launchConfig.ramdiskId,
          'instanceMonitoring': serverGroup.launchConfig.instanceMonitoring.enabled,
          'ebsOptimized': serverGroup.launchConfig.ebsOptimized,
          'amiName': amiName
        });
      }
      var vpcZoneIdentifier = serverGroup.asg.vpczoneIdentifier;
      if (vpcZoneIdentifier !== '') {
        var subnetId = vpcZoneIdentifier.split(',')[0];
        var subnet = _($scope.subnets).find({'id': subnetId});
        command.subnetType = subnet.purpose;
        command.vpcId = subnet.vpcId;
      } else {
        command.subnetType = '';
        command.vpcId = null;
      }
      if (serverGroup.launchConfig && serverGroup.launchConfig.securityGroups.length) {
        command.securityGroups = serverGroup.launchConfig.securityGroups;
      }
      return command;
    }

    function createCommandTemplate() {
      var defaultCredentials = 'test';
      var defaultRegion = 'us-east-1';
      return {
        'application': application.name,
        'credentials': defaultCredentials,
        'region': defaultRegion,
        'usePreferredZones': true,
        'availabilityZones': $scope.preferredZones[defaultCredentials][defaultRegion],
        'capacity': {
          'min': 0,
          'max': 0,
          'desired': 0
        },
        'cooldown': 10,
        'healthCheckType': 'EC2',
        'healthCheckGracePeriod': 600,
        'instanceMonitoring': false,
        'ebsOptimized': false,

        //These two should not be hard coded here, and keyPair options should be loaded from AWS
        'iamRole': 'BaseIAMRole',
        'keyPair': 'nf-test-keypair-a',

        'terminationPolicies': ['Default'],
        'vpcId': null,
        allImageSelection: null
      };
    }

    function initializeCommand() {
      if (serverGroup) {
        $scope.command = buildCommandFromExisting(serverGroup);
      } else {
        $scope.command = createCommandTemplate();
      }
    }

    this.isValid = function () {
      return $scope.command && ($scope.command.amiName !== null) && ($scope.command.application !== null) &&
        ($scope.command.credentials !== null) && ($scope.command.instanceType !== null) &&
        ($scope.command.region !== null) && ($scope.command.availabilityZones !== null) &&
        ($scope.command.capacity.min !== null) && ($scope.command.capacity.max !== null) &&
        ($scope.command.capacity.desired !== null) &&
        modalWizardService.getWizard().isComplete();
    };

    this.showSubmitButton = function () {
      return modalWizardService.getWizard().allPagesVisited();
    };

    $scope.taskMonitor.onApplicationRefresh = function handleApplicationRefreshComplete() {
      $scope.taskMonitor.task.getCompletedKatoTask().then(function(katoTask) {
        if (katoTask.resultObjects && katoTask.resultObjects.length && katoTask.resultObjects[0].serverGroupNames) {
          var newStateParams = {
            serverGroup: katoTask.resultObjects[0].serverGroupNames[0].split(':')[1],
            accountId: $scope.command.credentials,
            region: $scope.command.region
          };
          var transitionTo = '^.^.^.clusters.serverGroup';
          if ($state.includes('**.clusters.serverGroup')) {  // clone via details, all view
            transitionTo = '^.serverGroup';
          }
          if ($state.includes('**.clusters.cluster.serverGroup')) { // clone or create with details open
            transitionTo = '^.^.serverGroup';
          }
          if ($state.includes('**.clusters')) { // create new, no details open
            transitionTo = '.serverGroup';
          }
          $state.go(transitionTo, newStateParams);
        }
      });
    };

    this.clone = function () {

      var command = angular.copy($scope.command);
      var description;
      if (serverGroup) {
        description = 'Create Cloned Server Group from ' + serverGroup.asg.autoScalingGroupName;
        command.type = 'copyLastAsg';
        command.source = {
          'account': serverGroup.account,
          'region': serverGroup.region,
          'asgName': serverGroup.asg.autoScalingGroupName
        };
      } else {
        command.type = 'deploy';
        var asgName = application.name;
        if (command.stack) {
          asgName += '-' + command.stack;
        }
        if (!command.stack && command.freeFormDetails) {
          asgName += '-';
        }
        if (command.freeFormDetails) {
          asgName += '-' + command.freeFormDetails;
        }
        description = 'Create New Server Group in cluster ' + asgName;
      }
      command.availabilityZones = {};
      command.availabilityZones[command.region] = $scope.command.availabilityZones;
      delete command.region;
      delete command.allImageSelection;
      delete command.instanceProfile;
      delete command.vpcId;
      delete command.usePreferredZones;

      $scope.taskMonitor.submit(
        function() {
          return orcaService.cloneServerGroup(command, application.name, description);
        }
      );
    };

    this.cancel = function () {
      $modalInstance.dismiss();
    };
  });
