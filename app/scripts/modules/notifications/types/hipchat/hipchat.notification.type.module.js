'use strict';

let angular = require('angular');

require('./additionalFields.html');

module.exports = angular.module('spinnaker.notification.types.hipchat', [])
  //BEN_TODO: what is addressTemplateUrl?
  .config(function(notificationTypeConfigProvider) {
    notificationTypeConfigProvider.registerNotificationType({
      label: 'HipChat',
      key: 'hipchat',
      addressTemplateUrl: 'app/scripts/modules/notifications/types/hipchat/additionalFields.html',
    });
  }).name;
