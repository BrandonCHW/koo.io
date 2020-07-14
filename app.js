const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/client/main.html")
});

const SOCKET_LIST = {}

class GameStatePayload {
    constructor() {
        this.message = "hello"
    }
}

io.on('connection', (socket) => {
    SOCKET_LIST[socket.id] = socket
    socket.on('ActionPayload', (p) => {
        console.log('received')
        socket.emit('GameStatePayload', new GameStatePayload())
    })
    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
    })
});

app.get("*", (req,res) => {
    res.send("Error")
});

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});

setInterval(function() {
    // console.log("hello")
    
},1000)