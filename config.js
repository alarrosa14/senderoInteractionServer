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
  ]
}

config.interactions = {
  "drag": {
    queues: ["dragging_queue"]
  }
}

module.exports = config;