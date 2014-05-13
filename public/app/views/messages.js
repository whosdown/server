/*global define */
define(function (require, exports) {
  'use strict';

  var _         = require('underscore')
    , $         = require('jquery')
    , Backbone  = require('backbone')
    , globals   = require('utils').globals
    , utils     = require('utils').utils;

  exports.MessagesListView = Backbone.View.extend({
    initialize: function () {
      this.tmpl = _.template($(globals.MESSAGES_TMPL_SELECTOR).html());
      this.model.on('change:messages', this.render.bind(this));
    }


  , render: function () {
      var compiledTmpl = this.tmpl(this.model.toJSON());
      this.$el.children('#message-list').remove();
      this.$el.append(compiledTmpl);
    }
  });

});