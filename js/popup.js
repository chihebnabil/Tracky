var app = angular.module('tracky', ['Storage', 'AutocompleteDirective', 'TimerDirective','trello']);


           


app.controller('AppCtrl', function ($scope, Storage ,TrelloApi) {


     $scope.boards = [];
     $scope.trello_login = function () {
                    TrelloApi.Authenticate().then(function(){
                        console.log(TrelloApi.Token());
                    }, function(){
                        alert('no');
                    });
    };
      $scope.getMe = function () {
                    TrelloApi.Rest('GET', 'members/me').then(function(res){
                        $scope.boards = res.idBoards;
                        console.log($scope.boards);
                        console.log($scope.boards[0]);
                    }, function(err){
                        console.log(err);
                    });
                };
      $scope.getBoards = function() {
                    TrelloApi.boards("579b69e00ed00edf6260c0b1", {}).then(function(res) {
                        console.log(res);
                        //console.log($scope.boards)
                    }, function(err) {
                        console.log(err);
                    });
      };

    var background = chrome.extension ? chrome.extension.getBackgroundPage() : {};
    $scope.project = background.project ? background.project : {};
    $scope.projects = {};
    $scope.loaded = false;

    function getByName(arr, name){
        for (var i in arr) {
            var obj = arr[i];
            if (obj.name == name) {
                return obj;
            }
        }
        return false;
    }

    // Change icon when timer is started
    $scope.$watch('start', function(start){
        Storage.set('start', start);
        if(chrome.browserAction){
            chrome.browserAction.setIcon({path:"icon" + (start ? "-on" : "") + ".png"});
        }
    });

    // We keep project information using background (to avoid having to type it every time)
    $scope.$watch('project', function(value){
        background.project = value;
    });

    // Get infos from storage (Chrome.sync or localstorage)
    Storage.get('start').then(function(start){
        $scope.loaded = true;
        $scope.start = start;
    });
    Storage.get('projects').then(function(projects){
        $scope.projects = projects ? projects : [];
    })

    // Start timer
    $scope.record = function(){
        $scope.start = Date.now();
        $scope.project = {};
        
        $scope.getMe()
        $scope.getBoards()

    };

    // Cancel timer
    $scope.reset = function(){
        $scope.start = false;
        $scope.project = {};
    };

    // Save a project + task
    $scope.save = function(e){
        if(e && e.keyCode != 13){
            return false;
        }
        if($scope.project.name == '' || $scope.project.task == ''){
            alert('You have to select a task and a project');
        } else {
            var s = Math.floor((Date.now() - $scope.start) / 1000);
            var project = getByName($scope.projects, $scope.project.name);
            if(project === false){
                project = {
                    name: $scope.project.name,
                    tasks: []
                };
                $scope.projects.push(project);
            }
            var task = getByName(project.tasks, $scope.project.task);
            if(task === false){
                task = {
                    name: $scope.project.task,
                    time: 0
                };
                project.tasks.push(task);
            }
            task.time += s;
            Storage.set('projects', $scope.projects);
            $scope.project = {};
            $scope.start = 0;
        }
    };

    // Link to dashboard
    $scope.dashboard = function(){
        if(chrome.tabs){
            chrome.tabs.create({ url: chrome.extension.getURL('dashboard.html') });
        }else{
            window.location = "dashboard.html";
        }
    };

    // Custom autocomplete for projcts name and task name
    $scope.projectsAutoComplete = {
        source: function (request, response) {
            var array = [];
            angular.forEach($scope.projects, function (project) {
                var name = project.name;
                if(fuzzy(name, request.term)){
                    array.push({label: name, value: name});
                }
            });
            response(array);
        },
        minLength: 0,
        select: function (event, ui) {
            if(ui.item.label){
                $scope.project.name = ui.item.label;
                $scope.$apply();
            }
            return false;
        }
    };

    $scope.tasksAutoComplete = {
        source: function (request, response) {
            var array = [];
            var project = getByName($scope.projects, $scope.project.name);
            if(project !== false){
                angular.forEach(project.tasks, function (task) {
                    var name = task.name
                    if(fuzzy(name, request.term)){
                        array.push({label: name, value: name});
                    }
                });
            }
            response(array);
        },
        minLength: 0,
        select: function (event, ui) {
            if(ui.item.label){
                $scope.project.task = ui.item.label;
                $scope.$apply();
            }
            return false;
        }
    }

});