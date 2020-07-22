const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000

///////////////////////
/*****  ROUTING ******/
///////////////////////
app.get("/", (req,res) => {
    res.sendFile(__dirname + "/client/main.html")
});

app.get('/scripts/jquery.slim.min.js', function(req, res) {
    res.sendFile(__dirname + '/node_modules/jquery/dist/jquery.slim.min.js');
});

app.get('/scripts/bootstrap.min.js', function(req, res) {
    res.sendFile(__dirname + '/node_modules/bootstrap/dist/js/bootstrap.min.js');
});

app.get('/scripts/popper.min.js', function(req, res) {
    res.sendFile(__dirname + '/node_modules/popper.js/dist/umd/popper.min.js');
});

app.use(express.static("scripts"))

app.use(express.static("client"))

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
        this.confirmations = 0
        this.currentAction = ""
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

    nextTurn() {
        if (this.inProgress) {
            this.tracker = ++this.tracker % Object.keys(this.players).length
            this.turn = this.turn = this.players[Object.keys(this.players)[this.tracker]].name
            this.confirmations = 0
            this.currentAction = ""
        }
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

class ActionPayload { 
    constructor(actorName, actorId, intent, victimName="", victimId="") {
        this.actorName = actorName
        this.actorId = actorId
        this.intent = intent
        this.victimName = victimName
        this.victimId = victimId
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
        var done = handleActionRequest(p)
        if (done) {
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
            // send new game state
        }
    })

    socket.on('currentActionResponse', (playerId, response, responseDetail) => {
        handleActionResponse(playerId, response, responseDetail)
    })

    socket.on('challengeVerification', (challengedId, challengerId, cardIndex, expectedCardType) => {
        handleChallengeRequests(challengedId, challengerId, cardIndex, expectedCardType)
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

    socket.on('cardLost', (victimId, cardLost, endTurn) => {
        handleCardLoss(victimId, cardLost, endTurn)
    })

    socket.on('execute exchange', (selected, unselected) => {
        ExchangeCards(socket.id, selected, unselected)
        io.to('room1').emit('state change', new GameStatePayload(game))
    })
});

function handleActionRequest(actionPayload) {
    var actor = game.players[actionPayload.id]
    switch(actionPayload.intent) {
        case "income":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "income")
            io.to('room1').emit('action broadcast', game.currentAction)
            handleCoinChange(actor, 1)
            return true
        case "foreign":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "foreign")
            io.to('room1').emit('action broadcast', game.currentAction)
            return false
        case "coup":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "coup", actionPayload.to, findPlayerIdByName(actionPayload.to))
            io.to('room1').emit('action broadcast', game.currentAction)
            io.to('room1').emit('loseCard', actionPayload.to, true, "Player " +  actor.name + " is performing a coup on you! Choose a card to lose.")
            handleCoinChange(actor, -7)
            return true
        case "tax":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "tax")
            io.to('room1').emit('action broadcast', game.currentAction)
            return false
        case "steal":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "steal", actionPayload.to, findPlayerIdByName(actionPayload.to))
            io.to('room1').emit('action broadcast', game.currentAction)
            return false
        case "assassinate":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "assassinate", actionPayload.to, findPlayerIdByName(actionPayload.to))
            io.to('room1').emit('action broadcast', game.currentAction)
            return false
        case "exchange":
            game.currentAction = new ActionPayload(actor.name, actionPayload.id, "exchange")
            io.to('room1').emit('action broadcast', game.currentAction)
            return false
        default:
            break
    }
}

function processCurrentAction() {
    var action = game.currentAction.intent
    var actor = game.players[game.currentAction.actorId]
    switch(action) {
        //Probably unused as no one can block/challenge/prevent the income action and it executes without vote
        // case "income":
        //     handleCoinChange(actor, 1)
        //     break
        case "foreign":
            handleCoinChange(actor, 2)
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
            break
        //Probably unused as no one can block/challenge/prevent the coup action and it executes without vote
        // case "coup":
        //     handleCoinChange(actor, -7)
        //     io.to('room1').emit('coup', actor, game.currentAction.victimId)
        //     break
        case "tax":
            handleCoinChange(actor, 3)
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
            break
        case "steal":
            handleSteal(actor, game.currentAction.victimId)
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
            break
        case "assassinate":
            handleCoinChange(actor, -3)
            handleAssassinate(actor.name, game.currentAction.victimId)
            break
        case "exchange":
            handleExchangeRequest(game.currentAction.actorId)
            break
        default:
            break
    }
}

function handleActionResponse(playerId, response, responseDetail) {
    switch(response) {
        case "confirm":
            game.confirmations++
            //If everyone except the action initiator (who cannot 'vote') confirms the action, it goes through
            if(game.confirmations == Object.keys(game.players).length - 1)
                processCurrentAction()
            break
        case "challenge":
            io.to('room1').emit('challenge', new ActionPayload(game.players[playerId].name, playerId, game.currentAction.intent, game.currentAction.actorName, game.currentAction.actorId))
            break
        case "block":
            //Shouldn't use an action payload tbh but the view updating should fit on the front end side
            // io.to('room1').emit('action broadcast', game.currentAction)
            //Emit to everyone that you are claiming to be "responseDetail"
            break
        default:
            break
    }
}

function handleChallengeRequests(challengedId, challengerId, cardIndex, expectedCardType) {
    challenged = game.players[challengedId]
    if(cardIndex == 0) {
        if(challenged.firstCard == expectedCardType) {
            //The guy didn't lie
            //TODO: Refactor into a function: takes the card, shuffles the deck and gets out a new card
            game.deck.push(challenged.firstCard)
            challenged.firstCard = ""
            game.shuffleDeck()
            challenged.firstCard = game.deck.pop()
            //TODO: [bug] turn might revert to another player before the other player can choose to lose his card
            processCurrentAction()
            io.to('room1').emit('loseCard', challengerId, false, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
        } else {
            challenged.firstCardAlive = false
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
        }
    } else if (cardIndex == 1) {
        if(challenged.secondCard == expectedCardType) {
            //The guy didn't lie
            //TODO: Refactor into a function: takes the card, shuffles the deck and gets out a new card
            game.deck.push(challenged.secondCard)
            challenged.secondCard = ""
            game.shuffleDeck()
            challenged.secondCard = game.deck.pop()
            //TODO: [bug] turn might revert to another player before the other player can choose to lose his card
            processCurrentAction()
            io.to('room1').emit('loseCard', challengerId, false, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
        } else {
            challenged.secondCardAlive = false
            game.nextTurn()
            io.to('room1').emit('state change', new GameStatePayload(game))
        }
    }
}

//add or remove coins by a certain amount (amount can be negative)
function handleCoinChange(player, amount) {
    if (player) {
        player.coins += amount
    } else {
        console.log("error couldn't find player")
    }
}

function handleSteal(actor, victimId) {
    var victim = game.players[victimId]

    if (actor.coins > 10 || victim.coins < 1) {
        console.log("Actor has too many coins, or victim has too few coins")
        return false
    }
    if (actor && victim) {
        if (victim.coins == 1) {
            victim.coins -= 1
            actor.coins += 1
        } else {
            victim.coins -= 2
            actor.coins += 2
        }
        return true
    }
}

function handleAssassinate(actorName, victimId) {
    var victim = game.players[victimId]
    if (victim) {
        io.to('room1').emit('loseCard', victimId, true, "Player " +  actorName + " has successfully assassinated you! Choose a card to lose.")
    } else {
        console.log('cannot find victim')
    }
}

function handleCardLoss(id, cardIndex, endTurn) {
    victim = game.players[id]
    if(cardIndex == 0) {
        victim.firstCardAlive = false
    } else if (cardIndex == 1) {
        victim.secondCardAlive = false
    }
    //TODO: Handle if player dies (no more cards alive)

    if(endTurn)
        game.nextTurn()
    io.to('room1').emit('state change', new GameStatePayload(game))
}

function handleExchangeRequest(id) {
    actor = game.players[id]
    const selection = []
    if (actor.firstCardAlive) 
        selection.push(actor.firstCard)
    if (actor.secondCardAlive) 
        selection.push(actor.secondCard)

    selection.push(game.deck.pop())
    selection.push(game.deck.pop())

    io.to('room1').emit('exchange', id, selection)
}

function ExchangeCards(id, selected, unselected) {
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

    // TODO: Move somewhere else?
    game.nextTurn()
    io.to('room1').emit('state change', new GameStatePayload(game))
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