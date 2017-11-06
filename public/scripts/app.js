function Api() {
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyDLb_EBKjJLAS9sZEtc4gJ0x5sS53k268M",
        authDomain: "student-toolkit-d9c41.firebaseapp.com",
        databaseURL: "https://student-toolkit-d9c41.firebaseio.com",
        projectId: "student-toolkit-d9c41",
        storageBucket: "student-toolkit-d9c41.appspot.com",
        messagingSenderId: "712182325492"
    };

    // Initialize the default app
    firebase.initializeApp(config);

    // database creation through firebase hosting
    var database = firebase.database();

    this.startLoginDialog = function(callback) {
        // FirebaseUI config.
        var uiConfig = {
            signInOptions: [
                // Leave the lines as is for the providers you want to offer your users.
                // firebase.auth.GoogleAuthProvider.PROVIDER_ID,
                // firebase.auth.FacebookAuthProvider.PROVIDER_ID,
                firebase.auth.EmailAuthProvider.PROVIDER_ID
            ],
            signInFlow: "popup",
            credentialHelper: firebaseui.auth.CredentialHelper.NONE
        };

        var unsubscribe = firebase.auth().onAuthStateChanged(function (user) {
            if (user) {
                callback();
                unsubscribe();
            }
        }, function(error) {
            console.log(error);
            unsubscribe();
        });


        // Initialize the FirebaseUI Widget using Firebase.
        var ui = new firebaseui.auth.AuthUI(firebase.auth());
        // The start method will wait until the DOM is loaded.
        ui.start('#firebaseui-auth-container', uiConfig);
    };

    this.isSignedIn = function(callback) {
        var unsubscribe = firebase.auth().onAuthStateChanged(function (currentUser) {
            callback(!!currentUser);
            unsubscribe();
        }, function(error) {
            console.log(error);
            unsubscribe();
        });
    };

    this.getAvailableWidgets = function(callback) {
        var widgets = database.ref('widgetList/');
        widgets.once('value').then(function (snapshot) {
            callback(snapshot.val());
        })
    };

    this.getUserWidgets = function(callback) {
        var unsubscribe = firebase.auth().onAuthStateChanged(function (currentUser) {
            var widgets = database.ref('userWidgets/'+currentUser.uid+'/');
            widgets.once('value').then(function (snapshot) {
                callback(snapshot.val());
            });
            unsubscribe();
        }, function(error) {
            console.error("User is not signed in: "+error);
            unsubscribe();
        });
    };

    this.postUserWidgets = function(widgetData, callback) {
        //Get the ID from the widget and use that for the push.
        var unsubscribe = firebase.auth().onAuthStateChanged(function (currentUser) {
            var key = database.ref('userWidgets/'+currentUser.uid+'/').push();
            key.set(widgetData, function (error) {
                callback(error);
            });
            unsubscribe();
        }, function(error) {
            console.error("User is not signed in: "+error);
            unsubscribe();
        });
    };

    this.getWidgetTemplate = function(widgetName, callback) {
        var widgets = database.ref('widgetTemplates/'+widgetName);
        widgets.once('value').then(function (snapshot) {
            var map = [];
            var data = snapshot.val();
            //Change the id of the widget.
            data.id = new Date().getTime()+data.id;

	    for (componentIndex in snapshot.val().components) {
                var id = data.components[componentIndex].id;
                var timestamp = new Date();
                var nId = timestamp.getTime()+id;

                map[map.length] = { oldId : id, newId : nId };

                //Change the ID of the component;
                data.components[componentIndex].id = nId;
            }

            //Reiterate over components for actions. Rename all actions
            for (componentIndex in data.components) {
                var action = data.components[componentIndex].action;
                if (action == null) {
                    continue;
                }
		//Change the ids in the action
                for (idIndex in map) {
                    oldId = map[idIndex].oldId;
                    newId = map[idIndex].newId;

                    action = action.split(oldId).join(newId);
                }
                data.components[componentIndex].action = action;
            }
            callback(data);
        })
    }
}

window.onload = function () {
    //do work
    var api = new Api();

    var app = {
        isLoading: true,
        spinner: document.querySelector('.loader'),
        cardTemplate: document.querySelector('.cardTemplate'),
        container: document.querySelector('.main'),
        dialogContainer: document.querySelector('.dialog-container'),
        addDialog: document.querySelector('#addWidgetDialog'),
        loginDialog: document.querySelector('#loginDialog'),
        dialogIsOpen: false,
	widgets: []
    };


    /*****************************************************************************
    *
    * Event listeners for UI elements
    *
    ****************************************************************************/
    document.getElementById('addWidgetButton').addEventListener('click', function() {
        if (!app.dialogIsOpen && !app.isLoading) {
            app.dialogContainer.classList.add('dialog-container--visible');
            app.addDialog.classList.add('dialog--visible');
            app.dialogIsOpen = true;
        }
    });

    document.getElementById('cancelButton').addEventListener('click', function() {
        app.dialogContainer.classList.remove('dialog-container--visible');
        app.addDialog.classList.remove('dialog--visible');
        app.dialogIsOpen = false;
    });

    document.getElementById('addConfirmButton').addEventListener('click', function() {
        //Get the selected Widget Data
        //TODO This is not done.
        selector = document.getElementById('selectWidgetToAdd')
        widgetToAdd = selector.options[selector.selectedIndex].text;

        // Add the widget components into the dashboard in a specific grid location
        api.getWidgetTemplate(widgetToAdd, function(data) {
            widget = new Widget(data);

            //Close the dialog
            app.dialogContainer.classList.remove('dialog-container--visible');
            app.addDialog.classList.remove('dialog--visible');
            app.dialogIsOpen = false;
	    app.addWidgetToDashboard(widget);
        });
    });

    	function showLoader() {
		//Turn off the loader.
		if (!app.isLoading) {
			app.spinner.setAttribute('visible', true);
			app.container.removeAttribute('visible');
			app.isLoading = true;
      		}
    	}

    	function hideLoader() {
		//Turn off the loader.
		if (app.isLoading) {
			app.spinner.setAttribute('hidden', true);
			app.container.removeAttribute('hidden');
			app.isLoading = false;
      		}
	}

    	function pushWidget(widgetId) {
		widget = app.widgets[widgetId];
		if (widget !== null) {
			widget.getUpdatedData(function(data) {
				console.log(data);
			});
		}
    	}

    /*****************************************************************************
    *
    * Methods to update/refresh the UI
    *
    ****************************************************************************/
    app.addWidgetToDashboard = function(widget) {
        widget.getHTML(function (data) {
 		//Add the widget to the dashboard.
		document.getElementById('column1').innerHTML = data;
        });
	//Add the widget to the widget list.
	app.widgets[widget.widgetData.id] = widget;
    }

    //Main Method run after startup run everything in here.
    app.main = function(data) {

    	// Retrieve The list of available widget templates
	api.getAvailableWidgets(function (widgets) {
		// Dynamically load the values from the widget list to html DOM
		var select = document.getElementById("selectWidgetToAdd")
		for(index in widgets) {
			select.options[select.options.length] = new Option(widgets[index], index);
		}

		//Turn off the loader.
		hideLoader();

	    	// User authentication process
		api.isSignedIn(function (signedIn) {
    			console.log(signedIn);

    			if (!signedIn) {
				//Force Login. make the dialog visible;
				app.dialogContainer.classList.add('dialog-container--visible');
				app.loginDialog.classList.add('dialog--visible');
				app.dialogIsOpen = true;


				// Prompt the login screen
				api.startLoginDialog(function () {
		    			console.log("Login successfully complete!");

			    		//Make the dialog invisible
			    		app.dialogContainer.classList.remove('dialog-container--visible');
			    		app.loginDialog.classList.remove('dialog--visible');
		    			app.dialogIsOpen = false;

			    		// Fetch all the available widgets for the signed in user
					showLoader();
					api.getUserWidgets(function (widgets) {
						//Implement this.
						console.log("Got widgets: "+widgets);
						hideLoader();
    					});
				});
			} else {
		    		// Fetch all the available widgets for the signed in user
				showLoader();
				api.getUserWidgets(function (widgets) {
					//Implement this.
					console.log("Got widgets: "+widgets);
					hideLoader();
				});
			}
		});
	});
    };

    app.main();

    // TODO add service worker code here
    //if ('serviceWorker' in navigator) {
    //navigator.serviceWorker
    //         .register('./service-worker.js')
    //         .then(function() { console.log('Service Worker Registered'); });
    //}

};
