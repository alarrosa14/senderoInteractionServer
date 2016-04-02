var config = require("./config.js");

var __ = require("underscore");
var app = require('http').createServer();
var io = require('socket.io')(app);

var queue = require('amqplib');

var connections = [];

function bail(err) {
  console.error(err);
  process.exit(1);
}

// Publisher helper function
function publisher(ch, clientId, queue_name, data, type, other_options, callback) {
  ch.assertQueue(queue_name);
  ch.sendToQueue(
    queue_name, 
    new Buffer(data), 
    __(config.rabbit.publish_options)
      .extend(other_options ? other_options : {}, {
        headers: {
          web_client_id: clientId
        },
        type: type
      }),
    callback ? callback : function(err, ok) {
      if (err) {
        console.warn("Warning! %s message nacked %s", data, err);
      }
    } 
  );
}

queue.connect('amqp://' + config.rabbit.address)
  .then(
    function(conn) {

      // Create/Assert the queues
      console.log("Creating queues:");
      var channel;
      conn.createConfirmChannel()
        .then(
          function(ch) {
            channel = ch;
            var promises = [];
            __(config.rabbit.queues).each(function(q){
              console.log(" -> " + q + " ... created");
              promises.push(ch.assertQueue(q));
            });
            return Promise.all(promises);
          })
        .then(
          function(){
            io.on('connection', function(client){
              console.log('User connected: ', client.id);
              
              /* Interaction event */
              client.on('interaction', function(data){
                if (data !== undefined)
                  if (data.name !== undefined && config.interactions[data.name] !== undefined)
                    if (config.interactions[data.name].queues !== undefined)
                      __(config.interactions[data.name].queues).each(function(q) {
                          if (__(config.rabbit.queues).contains(q))
                            publisher(channel, client.id, q, data.data ? data.data : "", "interaction_data");
                          else 
                            console.warn("WARNING: %s is not defined in config.rabbit.queues", q);
                        });
              });

              /* Client disconnected event */
              client.on('disconnect', function() {
                console.log('User disconnected: %s', client.id);
                __(config.rabbit.queues).each(function(q){
                  publisher(channel, client.id, q, "", "client_disconnected");
                });
              });


            });
          });
    });

app.listen(config.web.port, function() {
  console.log("*********************************************************");
  console.log("*** Sendero Interaction Server listening on port %s ***", config.web.port);
  console.log("*********************************************************");
});
