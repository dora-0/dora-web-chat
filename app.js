// Setup basic express server
// const fs = require('fs');

// const ssl_options = {
//   cert:fs.readFileSync('fullchain.pem'),
//   key:fs.readFileSync('privkey.pem')
// };

const express = require('express');
const app = express();
// const server = require('https').createServer(ssl_options, app);
const server = require('http').createServer(app);
const socketio = require('socket.io');
const io = socketio.listen(server);
const port = process.env.PORT || 443;

server.listen(port, () => {
  console.log('Server listening at port %d', port);
});

// Routing
app.use('/public', express.static('./public'));
app.get('/', function(req, res) {
  res.redirect(302, '/public')
});

// Chatroom

var numUsers = 0;

io.on('connection', (socket) => {
  var addedUser = false;

  const client_ip = socket.handshake.headers['x-forwarded-for'].split(",")[0];
  const tmp = client_ip.split(".");
  socket.ipaddr = tmp[0] + "." + tmp[1];
  console.log("New connection from " + client_ip + " (ID: " + socket.id + ")");

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    if (data.toString() == "!help") {
      // console.log('OUT: %s', data.toString().charAt(0));

      io.to(socket.id).emit('new message', {
        username: "",
        message: "서버 도움말:",
        color: "red"
      });
      io.to(socket.id).emit('new message', {
        username: "",
        message: "!id : 당신의 고유 ID를 출력합니다.",
        color: "red"
      });
      io.to(socket.id).emit('new message', {
        username: "",
        message: "!help : 도움말을 출력합니다.",
        color: "red"
      });
      return;
    }
    else if (data.toString() == "!id") {
      io.to(socket.id).emit('new message', {
        username: "",
        message: "당신의 고유 ID: " + socket.id,
        color: "red"
      });
      return;
    }
    console.log("AddChatMessageEvent : socket.ipaddr? : " + socket.ipaddr);
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      // message: data,
      ipaddr: socket.ipaddr
    });
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', (username) => {
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', () => {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', () => {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', () => {
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
