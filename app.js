var express = require('express');
var http    = require('http');
var api     = require('./api/v0');
var routes  = require('./routes')

var app = module.exports = express();

app.configure(function() {
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser());
});

// Routes
app.get('/', routes.index);

// API
app.post('/api/event', api.post_event);
app.get('/api/event',  api.get_event);

var port = 3000
app.listen(port, function() {
  console.log('Express server listening on port %d in %s mode at %s', port, app.settings.env, new Date());
});