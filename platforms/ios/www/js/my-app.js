// Initialize app
var myApp = new Framework7({
    template7Pages: true
});
var $$ = Dom7;

// Add view
var mainView = myApp.addView('.view-main', {
    dynamicNavbar: true
});

// Connect to firebase
var config = {
    apiKey: "AIzaSyDgjJFKGBA2MBv5PvmyM4RSdAp5nqWe7eI",
    authDomain: "guma-app.firebaseapp.com",
    databaseURL: "https://guma-app.firebaseio.com",
    projectId: "guma-app",
    storageBucket: "guma-app.appspot.com",
    messagingSenderId: "755727406150",
    enableLogging: true
};
firebase.initializeApp(config);
var database = firebase.database();
var storage = firebase.storage();

// Handle Cordova Device Ready Event
$$(document).on('deviceready', function() {
    logInPopup();
});

function logInPopup(){
    if(window.localStorage.getItem("guma-login") != null){
        logIn(window.localStorage.getItem("guma-login"));
    } else {
        myApp.modalLogin("Please log in to continue", "Log In", function(username, password){
            username = $.trim(username.toLowerCase());
            var data = database.ref('drivers/').orderByChild('email').equalTo(username);
            data.once('value', function(snapshot){
                console.log(snapshot.val());
                if(snapshot.val() != null){
                    console.log(snapshot);
                    snapshot.forEach(function(childSnapshot){
                        if(childSnapshot.val() != null){
                            if(childSnapshot.val().password == password){
                                logIn(childSnapshot.key);  
                            } else {
                                myApp.alert('Incorrect password. Please try again.', '', logInPopup);
                            }
                        }
                    });   
                } else {
                    myApp.alert('Incorrect username. Please try again.', '', logInPopup);
                }
            });
        }, function(){
            myApp.alert('Please log in to continue', '', logInPopup);
        }); 
    }
}

function logIn(driverId){
    window.localStorage.setItem("guma-login", driverId);
    mainView.router.reloadPage('stops.html');
}

myApp.onPageInit('*', function(page){
    $('.signout').click(function(){
        window.localStorage.removeItem("guma-login");
        logInPopup();
    });

    if(mainView.activePage.name == 'index'){
       console.log(page.context.username); 
    }
});

myApp.onPageInit('stops', function(page){
    var stops = [];
    var driverId = window.localStorage.getItem("guma-login");
    var stopsList = myApp.virtualList('#stopsList', {
        items: stops,
        template: '<a href="{{url}}" data-context=\'{"id": {{id}}, "address": "{{address}}" } \' class="item-content item-link {{status}}">'+
                    '<div class="item-inner">'+
                        '<div class="itme-title-row">'+
                            '<div class="item-title">{{address}}</div>'+
                        '</div>'+
                        '<div class="item-subtitle">{{action}} | {{size}} yard</div>'+
                        '<div class="item-text">{{date}}</div>'+
                    '</div>'+
                   '</a>',
        searchAll: function(query, items){
            var foundItems = [];
            for (var i = 0; i < items.length; i++){
                if(items[i].address.indexOf(query.trim()) >= 0 || +
                    items[i].action.indexOf(query.trim()) >= 0 || +
                    items[i].size.indexOf(query.trim()) >= 0) foundItems.push(i);
            }
            return foundItems;
        }
    });

    var searchbar = myApp.searchbar('.searchbar', {
        searchList: '.list-block-search',
        searchIn: '.item-title'
    });

    database.ref('stops/'+driverId).on('value', function(snapshot){
        var count = 0;
        stopsList.deleteAllItems();
        if(snapshot.val() != null){
            snapshot.forEach(function(childSnapshot){
                if(childSnapshot.val() != null){
                    var address = childSnapshot.val().address;
                    var url = "";
                    var action = childSnapshot.val().action;
                    switch(action){
                        case "DD":
                            action = "Dropdown";
                            url = "dropdown.html";
                            break;
                        case "PU":
                            action = "Pick Up";
                            url = "pickup.html";
                            break;
                        case "SW":
                            action = "Switch";
                            url = "switch.html";
                            break;
                    }
                    var date = childSnapshot.val().date;
                    var size = childSnapshot.val().size;
                    var status = childSnapshot.val().status;
                    var time = childSnapshot.val().time;
                    var itemId = childSnapshot.key;

                    stopsList.appendItem({
                        address: address,
                        action: action,
                        date: date,
                        size: size,
                        status: status,
                        time: time,
                        id: itemId,
                        url: url
                    });

                } else {
                    // No data
                }
            });
        }
    });
});

myApp.onPageInit('pickup', function(page){
    $('.preloader').hide();
    $('.save').click(function(){
        var containerNumber = $('#containerNum').val();
        if(containerNumber <= 0){
            myApp.alert('Please enter a valid container number', '');
        } else {
            $('.preloader').show();
            var location = window.localStorage.getItem("guma-login") + "/" + page.context.id + "/";
            database.ref('stops/'+location).update({'container': containerNumber, 'status': 'complete'}).then(function(){
                $('.preloader').hide();
                mainView.router.loadPage('stops.html');
            });
        }
    });
});

myApp.onPageInit('dropdown', function(page){
    $('#signature').jSignature();

    $('.preloader').hide();
    $('.save').click(function(){
        var error = false;
        var message = '';

        var containerNumber = $('#containerNum').val();
        if(containerNumber <= 0){
            error = true;
            message = 'Please entera a valid containerNumber';
        }

        var borough = $('#borough')[0].selectedOptions[0].value;
        var comments = $('#comments').val();

        if(error == true){
            myApp.alert('Please enter a valid container number', '');
        } else {
            $('.preloader').show();

            var datapair = $('#signature').jSignature("getData", "svg");
            var date = new Date();
            var signature = 'signatures/' + page.context.address + "-" + (date.getMonth() + 1) + date.getDay() + date.getYear() + '.svg';
            storage.ref(signature).putString(datapair[1])
            .then(function(snapshot){
                console.log(snapshot.ref);
                var location = window.localStorage.getItem("guma-login") + "/" + page.context.id + "/";
                database.ref('stops/'+location).update({
                    'container': containerNumber, 
                    'borough': borough,
                    'comments': comments,
                    'signature': signature,
                    'status': "complete"
                }).then(function(){
                    $('.preloader').hide();
                    mainView.router.loadPage('stops.html');
                });           
            });
        }

    });
});

myApp.onPageInit('switch', function(page){
    $('#signature').jSignature();

    $('.preloader').hide();
    $('.save').click(function(){
        var error = false;
        var message = '';

        var containerNumber = $('#containerNum').val();
        if(containerNumber <= 0){
            error = true;
            message = 'Please entera a valid container number';
        }

        var container2Number = $('#container2Num').val();
        if(container2Number <= 0){
            error = true;
            message = 'Please entera a valid container number';
        }

        var borough = $('#borough')[0].selectedOptions[0].value;
        var comments = $('#comments').val();

        if(error == true){
            myApp.alert('Please enter a valid container number', '');
        } else {
            $('.preloader').show();

            var datapair = $('#signature').jSignature("getData", "svg");
            var date = new Date();
            var signature = 'signatures/' + page.context.address + "-" + (date.getMonth() + 1) + date.getDay() + date.getYear() + '.svg';
            storage.ref(signature).putString(datapair[1])
            .then(function(snapshot){
                console.log(snapshot.ref);
                var location = window.localStorage.getItem("guma-login") + "/" + page.context.id + "/";
                database.ref('stops/'+location).update({
                    'container': containerNumber, 
                    'container2': container2Number,
                    'borough': borough,
                    'comments': comments,
                    'signature': signature,
                    'status': "complete"
                }).then(function(){
                    $('.preloader').hide();
                    mainView.router.loadPage('stops.html');
                });
            });
        }

    });
});
