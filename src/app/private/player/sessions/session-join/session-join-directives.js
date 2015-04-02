angular.module('private.player.session.join.directives', [])
.directive('playerSessionJoinIndex', function(){
    return {
        templateUrl: 'app/private/player/sessions/session-join/session-join-directives.tmpl/session-join-index.tmpl.html',
        scope:{
            close: "&"
        },
        controller: 'PlayerSessionJoinController as playerSessionJoinCtrl'
    };
}).controller('PlayerSessionJoinController', function PlayerSessionJoinController($rootScope, $scope, $stateParams, SessionsModel){
    /* Assure access to ctrl. */
    var ctrl = this;

    /* Container for datas */
    ctrl.sessionToJoin = {};
    ctrl.newTeam = {
        name: "",
        alreadyUsed: false
    };

    ctrl.checkNameUsability = function(){
        var alreadyUsed = false;
        if(ctrl.sessionToJoin.teams){
            ctrl.sessionToJoin.teams.forEach(function(team){
                if(team.name == ctrl.newTeam.name){
                    alreadyUsed = true;
                }
            });
        }
        ctrl.newTeam.alreadyUsed = alreadyUsed;
    };

    /* Method used to create new team and join this new team in the session. */
    ctrl.createAndJoinTeam = function(){
        if(!ctrl.newTeam.alreadyUsed){
            SessionsModel.createTeam(ctrl.sessionToJoin, ctrl.newTeam.name).then(function(team){
                if(team){
                    SessionsModel.joinTeam(ctrl.sessionToJoin.id, team.id).then(function(sessionUpdated){
                        if(sessionUpdated){
                            $scope.close();
                        }
                    });
                }
            });
        }
    };

    /* Method used to join existing team in the session. */
    ctrl.joinTeam = function(teamId){
        SessionsModel.joinTeam(ctrl.sessionToJoin.id, teamId).then(function(sessionUpdated){
            if(sessionUpdated){
                $rootScope.$emit('newSession', true);
                $scope.close();
            }
        });
    };

    /* Initialize datas */
    SessionsModel.findSessionToJoin($stateParams.token).then(function(session){
        if(session){
            if(!session.properties.freeForAll){
                ctrl.sessionToJoin = session;
            }else{
                $scope.close();
            }
        }else{
            $scope.close();
        }
    });
})
.directive('playerSessionTeamsList', function() {
  return {
    templateUrl: 'app/private/player/sessions/session-join/session-join-directives.tmpl/session-join-teams-list.tmpl.html',
    scope: {
        teams : "=",
        joinTeam : "="
    }
  };
})
.directive('playerSessionAddTeam', function(){
    return {
        templateUrl: 'app/private/player/sessions/session-join/session-join-directives.tmpl/session-join-add-team.tmpl.html',
        scope: {
            newTeam: "=",
            createAndJoinTeam: "&",
            checkNameUsability: "&"   
        },
        link: function(scope, elem, attrs){
            scope.$watch(function(){return scope.newTeam.name;}, function(newVal){
                scope.checkNameUsability();
            });
        }
    };
});