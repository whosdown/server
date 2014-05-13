/*global define */
define(function (require) {
  'use strict';

  var $         = require('jquery')
    , Backbone  = require('backbone');

  var App           = require('models/app').App
    , EventListView = require('views/events').EventListView
    , Messages      = require('views/messages').MessagesListView
    , globals       = require('utils').globals;

  var DIMENSIONS  = globals.BUILDER_DIMENSIONS
    , MAP_SIZE    = globals.VIEWABLE_MAP_SIZE;

  // --------------------------------------------------------------------------

  var app = new App()
    , eventsView
    , messagesView;

  // Init AppView
  // --------------------------------------------------------------------------

  // Only start application once maps are loaded from server
  app.once('ready', function () {
    // Ensure DOM ready
    $(function () {
      eventsView = new EventListView({ model: app.get('eventlist') });

      $('body').append(eventsView.$el);
      eventsView.render();

      Backbone.history.start();
    });
  });


  // Router
  // --------------------------------------------------------------------------

  var Router = Backbone.Router.extend({

    routes: {

      'event': 'listEvents'

    , 'event/:eventId': 'displayEvent'  

    //   'build/:mapName': 'build'

    // , 'play': 'defaultPlay'

    // , 'play/:mapName/r:row/c:col': 'play'

    // , 'reset': 'reset'

    // , 'new/:mapName': 'newMap'

    }



    // Route handlers
    // ---------------------------------------------------
    , listEvents: function () {
      app.refreshEvents();
    }

    , displayEvent: function (eventId) {
      var event = app.get('event');
      event.set('eventId', eventId);
      event.refresh();


      if (!messagesView) {
        messagesView = new Messages({ model : event });
          messagesView.setElement($('#event-list').parent());
        messagesView.render();
      }
    }


  });


  // Initialize app
  // --------------------------------------------------------------------------

  var router = new Router();

  // Give the App model a reference to the router
  app.set('router', router);

});
