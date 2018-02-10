(function() {
    angular.module("Portfolio.Controllers", ["Portfolio.Services"])

        .controller("HomeCtrl", ["$location", "$scope", "$rootScope",
            function ($location, $scope, $rootScope) {
                $scope.config = CONFIG
            }
        ])

        .controller("BlogCtrl", ["$location", "$scope", "$rootScope",
            function($location, $scope, $rootScope) {
                $scope.config = CONFIG
            }
        ])

        .controller("BlogPostCtrl", ["$location", "$scope", "$rootScope", "$routeParams",
            function($location, $scope, $rootScope, $routeParams) {
                $scope.config = CONFIG;
                $scope.blogName = $routeParams.blogName;
                load($scope.blogName);
                $scope.metaData = $scope.config.blog.posts[$scope.blogName];
            }
        ])
}());