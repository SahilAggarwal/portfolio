(function() {
    angular.module("Portfolio.Controllers", ["Portfolio.Services"])

        .controller("HomeCtrl", ["$location", "$scope", "$rootScope",
            function ($location, $scope, $rootScope) {
                $scope.config = CONFIG;
            }
        ])
}());