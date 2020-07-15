const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const path = require('path')

const PORT = 3000

///////////////////////
/*****  ROUTING ******/
///////////////////////
app.get("/", (req,res) => {
    res.sendFile(__dirname + "/client/main.html")
});

app.get("*", (req,res) => {
    res.send("Error")
});

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});

///////////////////////////////////
/*****  GAMEPLAY MANAGEMENT ******/
///////////////////////////////////
const SOCKET_LIST = {}

// may not need this
class GameStatePayload {
    constructor(gameState) {
        this.gameState = gameState
    }
}

class GameState {
    constructor() {
        this.players = []
        this.turn
    }
}

class Player {
    constructor(id) {
        // this.id = id
        this.coins = 0
        this.firstCard = "Hero1"
        this.firstCardStatus = "Alive"
        this.secondCard= "Hero2"
        this.secondCardStatus = "Alive"
    }
}

// Create new game (only 1 lobby)
var game = new GameState()

io.on('connection', (socket) => {
    SOCKET_LIST[socket.id] = socket
    game.players.push(new Player(socket.id))

    //send initial game state 
    socket.emit('GameStatePayload', new GameStatePayload(game))

    socket.on('ActionPayload', (p) => {
        socket.emit('GameStatePayload', new GameStatePayload(game))
    })
    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
    })
});

var time = 100;
setInterval(function() {
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit('timer', time)
    }
    time--
},1000)