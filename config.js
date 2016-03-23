var config = {};

config.web = {};
config.rabbit = {};
config.interactions = {};

config.web = {
  ip: "localhost",
  port: 8081
}

config.rabbit = {
  address: "localhost",
  queues: [
    "dragging_queue"
  ],
  publish_options: {
    expiration: 5000, // milliseconds to expire inside the queue
    persistent: false, // if broker restarts, messagges will be deleted.

    
  }
}

config.interactions = {
  "drag": {
    queues: ["dragging_queue"]
  }
}

module.exports = config;