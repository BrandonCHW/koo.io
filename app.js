const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000

///////////////////////
/*****  ROUTING ******/
///////////////////////

//Static modules and files
app.use('/jquery', express.static(__dirname + "/node_modules/jquery/dist"))
app.use('/bootstrap', express.static(__dirname + "/node_modules/bootstrap/dist"))
app.use('/popper', express.static(__dirname + "/node_modules/popper.js/dist/umd"))
app.use(express.static("client"))

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
        this.deck = []
        this.turn = "" // name of the player who plays during this turn
        this.tracker = 0 // used to track the turn
        this.inProgress = false
    }

    onDisconnect(id) {
        delete this.players[id]
    }

    onBegin() {
        this.deck = this.fillDeck()
        this.shuffleDeck()
        this.dealCards()
        this.turn = this.players[Object.keys(this.players)[this.tracker]].name //the first player that connected begins...
        this.inProgress = true
    }

    nextTurn(nextPlayerName = "") {
        if (this.inProgress && nextPlayerName === "") {
            this.tracker = ++this.tracker % Object.keys(this.players).length
            this.turn = this.players[Object.keys(this.players)[this.tracker]].name
        } else {
            this.turn = nextPlayerName
        }
        console.log(`nextTurn(${nextPlayerName}): ${this.turn}'s turn`)
    }

    fillDeck() {
        return [
            "Duke","Duke","Duke",
            "Assassin","Assassin","Assassin",
            "Captain","Captain","Captain",
            "Ambassador","Ambassador","Ambassador",
            "Contessa","Contessa","Contessa"
        ]
    }

    // Fisher-Yates Algorithm
    shuffleDeck() {
        var a = this.deck        
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        this.deck = a
    }

    //TODO Move this in a service later
    //Deals 2 cards to every player 
    dealCards() {
        for(var id in this.players) {
            var player = this.players[id]
            player.firstCard = this.deck.pop()
            player.firstCardAlive = true
            player.secondCard = this.deck.pop()
            player.secondCardAlive = true
        }
    }
}

class Player {
    constructor(id) {
        this.name = parseInt(Math.ceil(Math.random()*100)) // random number for now
        this.coins = 2
        this.firstCard = "card1"
        this.firstCardAlive = false
        this.secondCard= "card2"
        this.secondCardAlive = false
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

    // notify other players of new connection
    io.to('room1').emit('state change', new GameStatePayload(game))

    socket.on('action', (p) => {
        changeGameState(p)
        // send new game state
        io.to('room1').emit('state change', new GameStatePayload(game))
    })

    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
        game.onDisconnect(socket.id)

        //notify other players of disconnection
        io.to('room1').emit('state change', new GameStatePayload(game))
    })

    //temporary
    socket.on('start game', () => {
        console.log('start game!')
        game.onBegin()
        io.to('room1').emit('state change', new GameStatePayload(game))
    })

    socket.on('cardLost', (victimId, cardLost) => {
        handleCardLoss(victimId, cardLost)
        game.nextTurn()
        io.to('room1').emit('state change', new GameStatePayload(game))
    })

    socket.on('execute exchange', (selected, unselected) => {
        exchangeCards(socket.id, selected, unselected)
        game.nextTurn()
        io.to('room1').emit('state change', new GameStatePayload(game))
    })
});

function changeGameState(actionPayload) {
    const id = actionPayload.id
    switch(actionPayload.intent) {
        case "income": handleCoinChange(id, 1); game.nextTurn(); break;
        case "foreign": handleCoinChange(id, 2); game.nextTurn(); break;
        // TODO: Verify if enough change before launching the Coup!
        case "coup": handleCoup(id); break;
        case "tax": handleCoinChange(id, 3); game.nextTurn(); break;
        case "steal": handleSteal(id, actionPayload.to); break;
        case "assassinate": handleAssassinate(id, actionPayload.to); break;
        case "exchange": handleExchangeRequest(id); break;
        default: break;
    }
} 

function handleCoup(id) {
    handleCoinChange(id, -7); 
    var victim = game.players[findPlayerIdByName(to)]
    game.nextTurn(victim.name);
    io.to('room1').emit('coup', game.players[id].name, findPlayerIdByName(actionPayload.to)); 
}

//add or remove coins by a certain amount (amount can be negative)
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
        if (victim.coins == 1) {
            victim.coins -= 1
            actor.coins += 1
        } else {
            victim.coins -= 2
            actor.coins += 2
        }
        
        game.nextTurn()
    }
}

function handleAssassinate(id, to) {
    var actorName = game.players[id].name
    var victimId = findPlayerIdByName(to)
    var victim = game.players[victimId]

    // TODO: Verify is enough money before assassination!
    if (victim) {
        game.nextTurn(victim.name);
        io.to('room1').emit('assassinateTarget', actorName, victimId)
    } else {
        console.log('cannot find victim')
    }
}

function handleCardLoss(id, cardNumber) {
    victim = game.players[id]
    if(cardNumber == 1) {
        victim.firstCardAlive = false
    } else if (cardNumber == 2) {
        victim.secondCardAlive = false
    }
    //TODO: Handle if player dies (no more cards alive)
}

function handleExchangeRequest(id) {    
    const currentPlayer = game.players[id]    
    const selection = []
    if (currentPlayer.firstCardAlive) 
        selection.push(currentPlayer.firstCard)
    if (currentPlayer.secondCardAlive) 
        selection.push(currentPlayer.secondCard)

    selection.push(game.deck.pop())
    selection.push(game.deck.pop())

    game.nextTurn(currentPlayer.name)
    io.to('room1').emit('exchange', id, selection)
}

function exchangeCards(id, selected, unselected) {
    var currentState = game.players[id]   
    console.log(currentState.secondCardAlive)
    if (currentState.firstCardAlive) {
        currentState.firstCard = selected.pop()
    } 
    if (currentState.secondCardAlive) {
        currentState.secondCard = selected.pop()
    }
    // put back unselected
    game.deck.push.apply(game.deck, unselected)
    game.shuffleDeck()
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