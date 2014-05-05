var express = require('express');
var http    = require('http');
var api_v0  = require('./api/v0');
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
app.post(api_v0.events.path, api_v0.events.create);
app.get(api_v0.events.path,  api_v0.events.getAll);
app.get(api_v0.events.eventPath,  api_v0.events.getData);
app.delete(api_v0.events.eventPath,  api_v0.events.remove);
app.post(api_v0.events.replyPath, api_v0.events.reply);
app.post(api_v0.events.sendPath, api_v0.events.send);
app.put(api_v0.recipient.path, api_v0.recipient.put);



app.post(api_v0.user.path, api_v0.user.post);
app.post(api_v0.user.verifyPath, api_v0.user.verify);

var port = 3000
app.listen(process.env.PORT || port, function() {
  // console.log(app.routes);
  console.log('Express server listening on port %d in %s mode at %s',
      port,
      app.settings.env,
      new Date());
});

