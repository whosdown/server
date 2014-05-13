/*global define, window */
define(function (require, exports) {
  'use strict';

  var _         = require('underscore')
    , $         = require('jquery')
    , Backbone  = require('backbone')
    , globals   = require('utils').globals;

  // Models
  // -------------------------------------------------------------------------

  exports.EventList = Backbone.Model.extend({

    initialize: function (params) {
      this.parent = params.app;

      var events = [
        {
          title   : 'Fun Times',
          message : 'Anyone up for fun times'
        }
      ]
      this.set('eventlist', events)
    }

  , refresh: function () {
      var userId = this.parent.get('user').get('id');

      $.ajax({
        type: 'GET'
      , url: globals.TLD + '/api/v0/event?userId=' + userId
      , success: function (data, status, jqXHR) {
          this.set('eventlist', data.data);
          this.trigger('init');
        }.bind(this)
      , error: function (jqXHR, textStatus, errorThrown) {
          console.log('errorThrown : ');
          console.log(errorThrown);
        }
      })

    }
  })


  exports.Event = Backbone.Model.extend({
    initialize: function (eventId, eventArrayIndex) {
      this.set('eventId', eventId);
      this.set('eventArrayIndex', eventArrayIndex);
      this.set('messages', []);
      this.set('people', []);
    }
  , refresh: function () {
      var eventId = this.get('eventId');

      $.ajax({
        type: 'GET'
      , url: globals.TLD + '/api/v0/event/' + eventId
      , success: function (data, status, jqXHR) {
          this.set('messages', data.data.messages);
          this.set('people', data.data.people);
          this.trigger('init');
        }.bind(this)
      , error: function (jqXHR, textStatus, errorThrown) {
          console.log('errorThrown : ');
          console.log(errorThrown);
        }
      })
  }
  })

});

