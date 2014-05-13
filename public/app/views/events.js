/*global define */
define(function (require, exports) {
  'use strict';

  var _         = require('underscore')
    , $         = require('jquery')
    , Backbone  = require('backbone')
    , globals   = require('utils').globals
    , utils     = require('utils').utils;

  exports.EventListView = Backbone.View.extend({

    events: {
      'mousedown .event':  'onMouseDownEvent'
    }

  , initialize: function () {
      this.tmpl = _.template($(globals.EVENTS_TMPL_SELECTOR).html());
      this.model.on('change:eventlist', this.render.bind(this));
    }

  , render: function () {
      var compiledTmpl = this.tmpl(this.model.toJSON());
      this.$el.html(compiledTmpl);
    }


    // Event handlers
    // ------------------------------------------------

  , onMouseDownEvent: function (e) {
      var $target = $(e.target);

      var eventId = $target.closest('.event').find('.event-id').text(); 
      this.model.parent.get('router').navigate('event/' + eventId, { trigger : true });
    }

  });

});

