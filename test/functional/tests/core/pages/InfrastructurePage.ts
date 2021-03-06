import { Page } from './Page';

export class InfrastructurePage extends Page {
  public static locators = {
    clickableServerGroup: '.server-group.clickable',
    actionsButton: '.details-panel .actions button',
    cloneMenuItem: `//*[contains(@class, 'dropdown-menu')]//a[contains(text(), 'Clone')]`,
    createServerGroupButton: `//*[contains(@class, 'application-actions')]//button[contains(., 'Create Server Group')]`,
  };

  public openClustersForApplication(application: string) {
    return browser.url(`/#/applications/${application}/clusters`);
  }
}
