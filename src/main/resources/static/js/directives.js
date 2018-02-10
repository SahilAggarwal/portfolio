(function() {

    angular.module("Portfolio.Directives", ["Portfolio.Controllers"])

    .directive("headerNav", function() {
        return {
            restrict: "E",
            templateUrl: "header-nav.html",
            controller: function($scope, $rootScope, $location, $sce) {
                $scope.config = CONFIG;
            }
         }
    })

    .directive("blogList", function() {
        return {
            restrict: "E",
            templateUrl: "blog-list.html",
            controller: function($scope, $rootScope, $location, $sce) {
                $scope.config = CONFIG;
            }
        }
    })
}());