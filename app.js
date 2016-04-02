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

// Publisher
function publisher(ch, clientId, queue_name, data, custom_options, callback) {
  ch.assertQueue(queue_name);
  ch.sendToQueue(
    queue_name, 
    new Buffer(data), 
    __(config.rabbit.publish_options)
      .extend(custom_options ? custom_options : {}, {
        headers: {
          web_client_id: clientId
        }
      })
  );
}

queue.connect('amqp://' + config.rabbit.address)
  .then(
    function(conn) {

      // Create/Assert the queues
      console.log("Creating queues:");
      var channel;
      conn.createChannel()
        .then(
          function(ch) {
            channel = ch;
            var promises = [];
            promises.push(ch.assertQueue("control_queue"));
            console.log(" -> control_queue ... created");
            __(config.rabbit.queues).each(function(q){
              console.log(" -> " + q + " ... created");
              promises.push(ch.assertQueue(q));
            });
            return Promise.all(promises);
          })
        .then(
          function(){
            channel.close();
          });


      io.on('connection', function(client){
        console.log('User connected: ', client.id);
        conn.createChannel()
          .then(
            function(ch) {
              client.channel = ch;
              client.on('interaction', function(data){
                if (data !== undefined)
                  if (data.name !== undefined && config.interactions[data.name] !== undefined)
                    if (config.interactions[data.name].queues !== undefined)
                      __(config.interactions[data.name].queues).each(function(q) {
                          if (__(config.rabbit.queues).contains(q))
                            publisher(ch, client.id, q, data.data ? data.data : "");
                          else 
                            console.warn("WARNING: " + q + " is not defined in config.rabbit.queues");
                        });
              });
            });

        client.on('disconnect', function() {
          console.log('Got disconnected!');
          if (client.channel) {
            client.channel.close();
            conn.createConfirmChannel().then(function(ch) {

              ch.assertQueue("control_queue");
              ch.sendToQueue(
                "control_queue", 
                new Buffer("disconnected"), 
                __(config.rabbit.publish_options).extend({
                  headers: {
                    web_client_id: client.id
                  }
                }),
                function(err, ok) {
                  if (err !== null)
                    console.warn('Message nacked!');
                  else
                    console.log('Message acked');
                  console.log("Closing channel for disconnected client");
                  ch.close();
                });
              });
          };
        });
      });
  });

app.listen(config.web.port, function() {
  console.log("*********************************************************");
  console.log("*** Sendero Interaction Server listening on port " + config.web.port + " ***");
  console.log("*********************************************************");
});
