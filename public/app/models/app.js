/*global define */
define(function (require, exports) {
  'use strict';

  var Backbone    = require('backbone')
    , EventList   = require('models/events').EventList
    , Event       = require('models/events').Event
    , User        = require('models/user').User    
    , globals     = require('utils').globals;

  var DIMENSIONS  = globals.BUILDER_DIMENSIONS;

  exports.App = Backbone.Model.extend({

    initialize: function () {
      this.set('user', new User({ app: this }));
      this.set('eventlist', new EventList({ app: this }));
      this.set('event', new Event());

      var eventList = this.get('eventlist');
      eventList.refresh();

      this.listenTo(eventList, 'init', function () {
        this.trigger('ready');
      });
    }

  , refreshEvents: function () {
      console.log('refreshing events');    

      var eventList = this.get('eventlist');
      eventList.refresh();
    }

  });

});
