define(function (require, exports) {
  var _         = require('underscore')
    , $         = require('jquery')
    , Backbone  = require('backbone')
    , globals   = require('utils').globals;

  exports.User = Backbone.Model.extend({
    initialize: function () {
      this.set('name', 'Joe Schaffer')
      this.set('id', '530ed2a445b105b82c3f94cd')
    }
  })

});