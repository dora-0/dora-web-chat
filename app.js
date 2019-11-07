// Setup basic express server
const fs = require('fs');
const ssl_options = {
    cert:fs.readFileSync('/etc/letsencrypt/live/mandora.xyz/fullchain.pem'),
    key:fs.readFileSync('/etc/letsencrypt/live/mandora.xyz/privkey.pem')
};

const express = require('express');
const app = express();
const server = require('https').createServer(ssl_options, app);
const socketio = require('socket.io');
const io = socketio.listen(server);
const port = process.env.PORT || 3001;

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

  // when the client emits 'new message', this listens and executes
  socket.on('new message', (data) => {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
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
