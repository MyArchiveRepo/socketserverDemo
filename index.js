const log  = require ('ololog').configure ({ locate: false });
require ('ansicolor').nice
const _ = require('lodash')
var redis = require('redis');
var pub = redis.createClient();
var sub = redis.createClient();
sub.subscribe("ticker");

const httpServer = require("http").createServer();
const Redis = require("ioredis");
const redisClient = new Redis();
const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*" , 
    // origin: "http://localhost:3000" , 
    // origin: "http://localhost:8080" , 
  },
  adapter: require("socket.io-redis")({
    pubClient: redisClient,
    subClient: redisClient.duplicate(),
  }),
});

const { setupWorker } = require("@socket.io/sticky");
const crypto = require("crypto");
const randomId = () => crypto.randomBytes(8).toString("hex");

const { RedisSessionStore } = require("./sessionStore");
const sessionStore = new RedisSessionStore(redisClient);

const { RedisMessageStore } = require("./messageStore");
const messageStore = new RedisMessageStore(redisClient);

let ticker={} ;
let tickerDemo={} ;
// عدد رندوم میسازد
function getRandomValue(){
  return Math.floor(Math.random() * (50 - 5 + 1)) + 5;
}

setInterval(() => {
  tickerDemo= JSON.stringify({'spot': {'BTC-USDT':getRandomValue() , 'ETH-USDT':getRandomValue() , 'LTC-USDT':getRandomValue()}});
  // log.red(tickerDemo)
}, 5000);

sub.on('message', function(channel, message){
  message=JSON.parse(message)
  log.yellow(`${message.exchange}.${message.type}.${message.coinName}`);
  _.set(ticker, `${message.exchange}.${message.type}.${message.coinName}` , message.price);
})

io.use(async (socket, next) => {

  log.blue("io.on(connection) =>" , socket.id);

  if (socket.id) {

      return next();

  }

  // const sessionID = socket.handshake.auth.sessionID;
  // if (sessionID) {
  //   const session = await sessionStore.findSession(sessionID);
  //   if (session) {
  //     socket.sessionID = sessionID;
  //     socket.userID = session.userID;
  //     socket.username = session.username;
  //     return next();
  //   }
  // }
  // const username = socket.handshake.auth.username;
  // if (!username) { 
  //   return next(new Error("invalid username"));
  // }
  // socket.sessionID = randomId();
  // socket.userID = randomId();
  // socket.username = username;
  // next();
});

// زمانی که یک سوکت کانکت می شود
io.on("connection", async (socket) => {        // log.blue("io.on(connection) =>" , socket);

    setInterval(() => {
        socket.emit("ticker", tickerDemo );    // زمانی که سوکت مورد نظر به این امیت گوش میدهد
    }, 7000);

    // publicClient.on('message', function(channel, message){
    //   console.log(message);
    //   socket.broadcast.emit("ticker", message );
    //   // socket.send(message);
    // })

  // persist session
  // sessionStore.saveSession(socket.sessionID, {
  //   userID: socket.userID,
  //   username: socket.username,
  //   connected: true,
  // });

  // emit session details
  // socket.emit("session", {                      
  //   sessionID: socket.sessionID,
  //   userID: socket.userID,
  // });

  // var i = 0;
  // Broadcast "tick" event every second
  // Or do whatever you want with io ;)
  // setInterval(() => {
  //     socket.emit("tick", i);
  // }, 2000);

  // join the "userID" room
  // socket.join(socket.userID);

  // fetch existing users
  // const users = [];
  // const [messages, sessions] = await Promise.all([
  //   messageStore.findMessagesForUser(socket.userID),
  //   sessionStore.findAllSessions(),
  // ]);
  // const messagesPerUser = new Map();
  // messages.forEach((message) => {
  //   const { from, to } = message;
  //   const otherUser = socket.userID === from ? to : from;
  //   if (messagesPerUser.has(otherUser)) {
  //     messagesPerUser.get(otherUser).push(message);
  //   } else {
  //     messagesPerUser.set(otherUser, [message]);
  //   }
  // });

  // let price = 22222 ;


  // sessions.forEach((session) => {
  //   users.push({
  //     userID: session.userID,
  //     username: session.username,
  //     connected: session.connected,
  //     messages: messagesPerUser.get(session.userID) || [],
  //   });
  // });
  // socket.emit("users", users);

  // notify existing users
  // socket.broadcast.emit("user connected", {
  //   userID: socket.userID,
  //   username: socket.username,
  //   connected: true,
  //   messages: [],
  // });

  // forward the private message to the right recipient (and to other tabs of the sender)
  socket.on("private message", ({ content, to }) => {
    const message = {
      content,
      from: socket.userID,
      to,
    };
    socket.to(to).to(socket.userID).emit("private message", message);
    messageStore.saveMessage(message);
  });

  socket.on("private test", ({p}) => {

    setInterval(() => {
      socket.to(socket.userID).emit("private test", price=socket.userID);
      // socket.to("a7239547a22516a6").emit("private test", price);
      // socket.to("fcb4cf2f271237a1").emit("private test", price);
    }, 2000);

  });

  // notify users upon disconnection
  socket.on("disconnect", async () => {
    const matchingSockets = await io.in(socket.userID).allSockets();
    const isDisconnected = matchingSockets.size === 0;
    if (isDisconnected) {
      // notify other users
      socket.broadcast.emit("user disconnected", socket.userID);
      // update the connection status of the session
      sessionStore.saveSession(socket.sessionID, {
        userID: socket.userID,
        username: socket.username,
        connected: false,
      });
    }
  });
});

setupWorker(io);


// Sample +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++

// const myClientList = {};

//   server.on("connection", (socket) => {
//     console.info(`Client connected [id=${socket.id}]`);
//      myClientList[socket.id] = socket;   
//   });
//   socket.on("disconnect", (socket) => {
//     delete myClientList[socket.id];
//   });


// io.on('connection', function(client) {
//   client.on('message', function(message) {

//     if(message.rediskey) {
//       //fetch session info from redis
//       redisclient.get(message.rediskey, function(e, c) {
//         client.user_logged_in = c.username;
//       });
//     }

//   });
// });