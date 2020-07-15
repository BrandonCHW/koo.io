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

// TODO may not need this
class GameStatePayload {
    constructor(gameState) {
        this.gameState = gameState
    }
}

class GameState {
    constructor() {
        this.players = []
    }
}

class Player {
    constructor(id) {
        this.id = id    // TODO maybe remove this later
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

    // a single lobby 
    socket.join('room1')

    //send initial game state + player's id 
    socket.to('room1').emit('GameStatePayload', new GameStatePayload(game))

    socket.on('action', (p) => {
        changeGameState(p)
        // send new game state
        socket.emit('GameStatePayload', new GameStatePayload(game))
    })
    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
    })
});

function changeGameState(actionPayload) {
    const id = actionPayload.id
    switch(actionPayload.intent) {
        case "income": handleCoinsChange(id, 1); break;
        case "foreign": handleCoinsChange(id, 2); break;
        case "coup": handleCoinsChange(id, -7); break;
        case "tax": handleCoinsChange(id, 3); break;
        case "steal": handleSteal(id, actionPayload.to);
        case "assassinate": break;
        case "exchange": break;
        default: break;
    }
} 

//add or remove coins by a certain amount
function handleCoinsChange(id, amount) {
    var player = game.players.find(p => p.id = id)
    if (player) {
        if (player.coins + amount < 0) {
            console.log("Not enough coins")
        } else if (player.coins >= 10 && amount > 0) {
            console.log("Can't perform action (Over 10 coins, must Coup)")
        } else {
            player.coins += amount
        }
    }
}

function handleSteal(id, to) {
    var player = game.players.find(p => p.id = id)
    if (player) {
    }
}

var time = 100;
setInterval(function() {
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit('timer', time)
    }
    time--
},1000)