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
        this.players = {}
    }

    onDisconnect(id) {
        delete this.players[id]
    }
}

class Player {
    constructor(id) {
        this.name = parseInt(Math.ceil(Math.random()*100)) // random number for now
        this.coins = 2
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
    game.players[socket.id] = new Player(socket.id)

    // a single lobby 
    socket.join('room1')

    //send player identity
    var initialState = game.players[socket.id]
    io.to(socket.id).emit('self connection', initialState)   

    //TODO notify other players of new connection
    io.to('room1').emit('state change', new GameStatePayload(game))

    socket.on('action', (p) => {
        changeGameState(p)
        // send new game state
        io.to('room1').emit('state change', new GameStatePayload(game))
    })
    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
        game.onDisconnect(socket.id)
        //TODO notify other players of disconnection
        io.to('room1').emit('state change', new GameStatePayload(game))
    })
});

function changeGameState(actionPayload) {
    const id = actionPayload.id
    switch(actionPayload.intent) {
        case "income": handleCoinChange(id, 1); break;
        case "foreign": handleCoinChange(id, 2); break;
        case "coup": handleCoinChange(id, -7); break;
        case "tax": handleCoinChange(id, 3); break;
        case "steal": handleSteal(id, actionPayload.to); break;
        case "assassinate": handleAssassinate(actionPayload.to); break;
        case "exchange": break;
        default: break;
    }
} 

//add or remove coins by a certain amount
function handleCoinChange(id, amount) {
    var player = game.players[id]
    if (player) {
        if (player.coins + amount < 0) {
            console.log("Not enough coins")
        } else if (player.coins >= 10 && amount > 0) {
            console.log("Can't perform action (Over 10 coins, must Coup)")
        } else {
            player.coins += amount
        }
    } else {
        console.log("error couldn't find player")
    }
}

function handleSteal(id, to) {
    var actor = game.players[id]
    var victim = game.players[findPlayerIdByName(to)]

    if (actor.coins > 10 || victim.coins < 1) {
        console.log("Actor has too many coins, or victim has too few coins")
        return
    }
    if (actor && victim) {
        victim.coins -= 2
        actor.coins += 2
    } 
}

function handleAssassinate(to) {
    
}

function findPlayerIdByName(name) {
    return Object.keys(game.players).find(key => game.players[key].name.toString() === name)
}

var time = 100;
setInterval(function() {
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit('timer', time)
    }
    if (time > 0)
        time--
},1000)