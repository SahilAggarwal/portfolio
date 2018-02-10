(function() {

    angular.module("Portfolio",["ngRoute", "Portfolio.Services","Portfolio.Controllers","Portfolio.Directives"])

    // routes

        .config(['$routeProvider', function($routeProvider) {
            $routeProvider
                .when("/", {
                    templateUrl: "home.html",
                    controller: "HomeCtrl"
                })

                .when("/blog/:blogName", {
                    templateUrl: "blog-post.html",
                    controller: "BlogPostCtrl"
                })

                .when("/blog", {
                     templateUrl: "blog.html",
                     controller: "BlogCtrl"
                })

                .otherwise({
                    redirectTo: "/"
                })
        }])

        .run(['$rootScope', '$location', '$anchorScroll', function($rootScope, $location, $anchorScroll) {
                $rootScope.$on('$routeChangeSuccess', function (newRoute, oldRoute) {
                   if($location.hash()) $anchorScroll();
                });
        }])

}());