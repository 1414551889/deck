'use strict';

let angular = require('angular');

require('./groupings.html');

module.exports = angular
  .module('spinnaker.securityGroup', [
    require('./AllSecurityGroupsCtrl.js'),
    require('./filter/SecurityGroupFilterCtrl.js'),
    require('./securityGroup.pod.directive.js'),
    require('./SecurityGroupCtrl.js'),
    require('./securityGroup.directive.js'),
    require('./securityGroup.read.service.js'),
    require('./securityGroup.write.service.js'),
    require('./securityGroupCounts.directive.js'),
    require('./details/aws/SecurityGroupDetailsCtrl.js'),
    require('./configure/aws/EditSecurityGroupCtrl.js'),
    require('./configure/aws/CreateSecurityGroupCtrl.js'),
    require('./clone/aws/cloneSecurityGroup.controller.js'),
    require('./SecurityGroupsNavCtrl.js')
  ]).name;
