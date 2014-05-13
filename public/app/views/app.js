/*global define */
define(function (require, exports) {
  'use strict';

  var $           = require('jquery')
    , Backbone    = require('backbone');

  var globals     = require('utils').globals;

  // --------------------------------------------------------------------------

  exports.AppView = Backbone.View.extend({

    initialize: function () {
      /*
       * TODO: initialize relevant children views (remember to import them with
       * `require`).
       */

      /*
       * TODO: ensure the instantiated mapView's `.model` stays in sync with the
       * map that is selected (which should be available on the App model).
       */
    }

    /*
     * TODO: render logic to show this view's template
     */

  , showBuildView: function () {
      /*
       * TODO: swap out current view(s) for the (already-constructed)
       * BuilderView.
       */
    }

  , showPlayView: function () {
      /*
       * TODO: swap out current view(s) for the (already-constructed) MapView
       * and PlayerView. If no valid MapView can be shown (invalid map
       * selection, etc) then invoke some method on the MapView that renders a
       * helpful error message in the view.
       */
    }

    /*
     * TODO: bind a DOM event that starts off a new map when 'enter' is pressed
     * in the 'input.new-map' field within this view (there should be some text
     * entered in the field). Use the application's router to do this.
     */

  });

});

