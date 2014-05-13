require.config({

  paths: {
    jquery:     '../lib/js/jquery-1.11.0'
  , underscore: '../lib/js/underscore'
  , backbone:   '../lib/js/backbone'
  , mousetrap:  '../lib/js/mousetrap.min'
  , utils:      './utils'
  }

, shim: {
    backbone: {
      deps:     ['underscore', 'jquery']
    , exports:  'Backbone'
    }
  , underscore: {
      exports:  '_'
    }
  , mousetrap: {
      exports:  'Mousetrap'
    }
  }

});

require(['./wd']);
