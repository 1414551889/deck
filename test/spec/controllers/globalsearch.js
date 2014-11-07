'use strict';

describe('Controller: GlobalSearch', function () {

  beforeEach(loadDeckWithoutCacheInitializer);

  // load the controller's module
  beforeEach(module('deckApp'));

  describe('keyboard navigation', function() {
    // Initialize the controller and a mock scope
    beforeEach(inject(function ($controller, $rootScope, $window, $q) {
      var inputSpy = jasmine.createSpyObj('input', ['focus']),
          infrastructureSearch = jasmine.createSpy('infrastructuresearch');
      this.$scope = $rootScope.$new();
      this.$q = $q;
      this.infrastructureSearch = infrastructureSearch;
      this.infrastructureSearch.query = angular.noop;
      this.input = inputSpy;
      this.$element = { find: function() { return inputSpy; } };

      spyOn(infrastructureSearch, 'query').and.callFake(function() { return $q.when([])});

      this.ctrl = $controller('GlobalSearchCtrl', {
        $scope: this.$scope,
        $element: this.$element,
        infrastructureSearch: function() { return infrastructureSearch }
      });

      this.$scope.showSearchResults = true;

    }));

    it('pressing escape closes the search results, clears the query, and focuses on the input', function () {
      var ctrl = this.ctrl,
          $scope = this.$scope;

      $scope.query = 'not null';
      $scope.querying = true;
      $scope.categories = [];

      ctrl.dispatchQueryInput({which: 27});

      $scope.$digest();

      expect($scope.querying).toBe(false);
      expect($scope.query).toBe(null);
      expect($scope.categories).toBe(null);
      expect($scope.showSearchResults).toBe(false);
      expect(this.input.focus).toHaveBeenCalled();
    });

    it('pressing down or tab (without shift) selects the first search result', function () {
      spyOn(this.ctrl, 'focusFirstSearchResult').and.callFake(angular.noop);
      var event = {which: 40};

      this.ctrl.dispatchQueryInput(event);

      this.$scope.$digest();

      expect(this.ctrl.focusFirstSearchResult).toHaveBeenCalledWith(event);

      event = {which: 9};
      this.ctrl.dispatchQueryInput(event);
      this.$scope.$digest();

      expect(this.ctrl.focusFirstSearchResult).toHaveBeenCalledWith(event);

      event = {which: 9, shiftKey: true};
      this.ctrl.dispatchQueryInput(event);
      this.$scope.$digest();

      expect(this.ctrl.focusFirstSearchResult).not.toHaveBeenCalledWith(event);
    });

    it('pressing up selects the last search result', function () {
      spyOn(this.ctrl, 'focusLastSearchResult').and.callFake(angular.noop);

      var event = {which: 38};
      this.ctrl.dispatchQueryInput(event);
      this.$scope.$digest();

      expect(this.ctrl.focusLastSearchResult).toHaveBeenCalledWith(event);
    });

    it('ignores left, right, shift key events', function() {
      spyOn(this.ctrl, 'focusLastSearchResult').and.callFake(angular.noop);

      this.ctrl.dispatchQueryInput({which: 39});
      this.$scope.$digest();

      expect(this.infrastructureSearch.query).not.toHaveBeenCalled();

      this.ctrl.dispatchQueryInput({which: 37});
      this.$scope.$digest();
      expect(this.infrastructureSearch.query).not.toHaveBeenCalled();

      this.ctrl.dispatchQueryInput({which: 16});
      this.$scope.$digest();
      expect(this.infrastructureSearch.query).not.toHaveBeenCalled();


      this.ctrl.dispatchQueryInput({which: 30});
      this.$scope.$digest();
      expect(this.infrastructureSearch.query).toHaveBeenCalled();
    });



  });
});
