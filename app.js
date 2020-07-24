const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000
const MAX_PLAYERS_PER_ROOM = 4

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
        this.actionHistory =[]
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
            // this.turn = this.turn = this.players[Object.keys(this.players)[this.tracker]].name
            this.turn = this.players[Object.keys(this.players)[this.tracker]].name
        } else {
            this.turn = nextPlayerName
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
    //Action payload destined to be sent to the client
    constructor(actorId, intent, displayText="", victimId="") {
        this.actorId = actorId
        this.intent = intent
        this.victimId = victimId
        this.displayText = displayText
    }
}

class ActionLog extends ActionPayload {
    //Stores information serverside about a move in game.actionHistory
    constructor(actionPayload, type, confirmations = 0) {
        super(actionPayload.actorId, actionPayload.intent, actionPayload.displayText, actionPayload.victimId)
        this.type = type
        this.confirmations = confirmations
    }
}

// Create new game (only 1 lobby)
var game = new GameState()

io.on('connection', (socket) => {
    
    socket.on('action', (p) => {
        handleActionRequest(p, socket)
    })

    socket.on('currentActionResponse', (playerId, response, blockRole) => {
        handleActionResponse(playerId, response, blockRole, socket)
    })

    socket.on('blockResponse', (playerId, response) => {
        handleBlockResponse(playerId, response, socket)
    })

    socket.on('challengeVerification', (challengedId, challengerId, cardIndex, expectedCardType) => {
        handleChallengeRequests(challengedId, challengerId, cardIndex, expectedCardType, socket)
    })

    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]
        game.onDisconnect(socket.id)

        //notify other players of disconnection
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
    })

    //temporary
    socket.on('start game', () => {
        console.log('start game!')

        game.onBegin()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
    })

    socket.on('find lobby', () => {
        var roomId = findEmptyRoom()

        socket.currentRoomId = roomId
        socket.join(roomId)

        SOCKET_LIST[socket.id] = socket
        game.players[socket.id] = new Player(socket.id)

        //send player identity
        var initialState = game.players[socket.id]
        io.to(socket.id).emit('self connection', initialState)

        // notify other players of new connection
        io.to(roomId).emit('state change', new GameStatePayload(game))
    })

    socket.on('cardLost', (victimId, cardLost, endTurn) => {
        handleCardLoss(victimId, cardLost, endTurn, socket)
    })

    socket.on('execute exchange', (selected, unselected) => {
        exchangeCards(socket.id, selected, unselected, socket)
        game.nextTurn()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
    })
});

function handleActionRequest(actionPayload, socket) {
    var actor = game.players[actionPayload.id]
    var displayText
    var actionRequest
    if(actionPayload.to == "") {
        displayText = actor.name + " is performing " + actionPayload.intent
    } else {
        displayText = actor.name + " is performing " + actionPayload.intent + " on " + actionPayload.to
        actionRequest = new ActionPayload(actionPayload.id, actionPayload.intent, displayText)
    }
    actionRequest = new ActionPayload(actionPayload.id, actionPayload.intent, displayText, findPlayerIdByName(actionPayload.to))
    game.actionHistory.push(new ActionLog(actionRequest, "action"))
    io.to(socket.currentRoomId).emit('action broadcast', actionRequest)

    if(actionPayload.intent == "income") {
        handleCoinChange(actor, 1)
        game.nextTurn()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
    } else if (actionPayload.intent == "coup") {
        io.to(socket.currentRoomId).emit('loseCard', findPlayerIdByName(actionPayload.to), true, "Player " +  actor.name + " is performing a coup on you! Choose a card to lose.")
        handleCoinChange(actor, -7)
    }
}

function processLastAction(socket) {
    var currentAction
    //Find the last action to execute in the action history
    for (var i = game.actionHistory.length - 1; i >= 0; --i) {
        if (game.actionHistory[i].type == "action") {
            currentAction = game.actionHistory[i]
            break;
        }
    }
    var action = currentAction.intent
    var actor = game.players[currentAction.actorId]
    switch(action) {
        //No switch case for income/coup actions because no one can block/challenge it. It just executes automatically on receiving the request from client
        case "foreign":
            handleCoinChange(actor, 2)
            game.nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            break
        case "tax":
            handleCoinChange(actor, 3)
            game.nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            break
        case "steal":
            handleSteal(actor, currentAction.victimId)
            game.nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            break
        case "assassinate":
            handleCoinChange(actor, -3)
            handleAssassinate(actor.name, currentAction.victimId)
            break
        case "exchange":
            handleExchangeRequest(currentAction.actorId)
            break
        default:
            break
    }
}

function handleActionResponse(playerId, response, blockRole, socket) {
    switch(response) {
        case "confirm":
            var numberConfirmations = ++game.actionHistory[game.actionHistory.length - 1].confirmations
            //If everyone except the action initiator (who cannot 'vote') confirms the action, it goes through
            if(numberConfirmations == Object.keys(game.players).length - 1)
                processLastAction(socket)
            break
        case "challenge":
            var victimId = game.actionHistory[game.actionHistory.length - 1].actorId
            //TODO: Change action descriptors to the role which they correspond to facilitate clientside display and variable handling (ie: tax -> duke, steal -> captain)
            var displayText = game.players[playerId].name + " is challenging " + game.players[victimId].name
            var challengeAction = new ActionPayload(playerId, "challenge-" + game.actionHistory[game.actionHistory.length - 1].intent, displayText, victimId)
            game.actionHistory.push(new ActionLog(challengeAction, "challenge"))
            io.to(socket.currentRoomId).emit('challenge', challengeAction)
            break
        case "block":
            var victimId = game.actionHistory[game.actionHistory.length - 1].actorId
            var displayText = game.players[playerId].name + " is claiming to be " + blockRole + " to block " + game.players[victimId].name + " 's action."
            var blockAction = new ActionPayload(playerId, "block-" + blockRole, displayText)
            game.actionHistory.push(new ActionLog(blockAction, "block"))
            io.to(socket.currentRoomId).emit('block broadcast', blockAction)
            break
        default:
            break
    }
}

function handleBlockResponse(playerId, response) {
    switch(response) {
        case "confirm":
            var numberConfirmations = ++game.actionHistory[game.actionHistory.length - 1].confirmations
            //If everyone except the blocker (who cannot 'vote') confirms the block, the action is blocked
            if(numberConfirmations == Object.keys(game.players).length - 1)
                game.nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            break
        case "challenge":
            var victimId = game.actionHistory[game.actionHistory.length - 1].actorId
            //TODO: Change action descriptors to the role which they correspond to facilitate clientside display and variable handling (ie: tax -> duke, steal -> captain)
            var displayText = game.players[playerId].name + " is challenging " + game.players[victimId].name
            var roleClaimed = game.actionHistory[game.actionHistory.length - 1].intent.split("-")[1]
            var challengeAction = new ActionPayload(playerId, "challenge-" + roleClaimed, displayText, victimId)
            game.actionHistory.push(new ActionLog(challengeAction, "challenge"))
            io.to(socket.currentRoomId).emit('challenge', challengeAction)
            break
        default:
            break
    }
}

//TODO: [bug] turn might revert to another player before the other player can choose to lose his card
function handleChallengeRequests(challengedId, challengerId, cardIndex, expectedCardType, socket) {
    challenged = game.players[challengedId]
    if(cardIndex == 0) {
        //The challenged didn't lie
        if(challenged.firstCard == expectedCardType) {
            getReplacementCard(challenged, cardIndex)
            //If the last move logged was an action, execute it (ie: the player who performs the action actually had the corresponding role)
            if(game.actionHistory[game.actionHistory.length - 2].type == "action") {
                processLastAction(socket)
                io.to(socket.currentRoomId).emit('loseCard', challengerId, false, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
            //Else if the last move logged as a block, end the turn (ie: the player who blocked actually had the required role to block)
            else if(game.actionHistory[game.actionHistory.length - 2].type == "block") {
                io.to(socket.currentRoomId).emit('loseCard', challengerId, true, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
        //The challenged lied
        } else {
            challenged.firstCardAlive = false
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action DID NOT actually have (or choose to reveal) the required role card)
            if(game.actionHistory[game.actionHistory.length - 2].type == "action") {
                game.nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            }
            //Else if the last move logged before the challenge was a block, end the turn (ie: the player who blocked DID NOT actually have the required card to block)
            else if(game.actionHistory[game.actionHistory.length - 2].type == "block") {
                processLastAction(socket)
            }
        }
    } else if (cardIndex == 1) {
        //The challenged didn't lie
        if(challenged.secondCard == expectedCardType) {
            getReplacementCard(challenged, cardIndex)
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action actually had the corresponding role)
            if(game.actionHistory[game.actionHistory.length - 2].type == "action") {
                processLastAction(socket)
                io.to(socket.currentRoomId).emit('loseCard', challengerId, false, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
            //Else if the last move before the challenge logged was a block, end the turn (ie: the player who blocked actually had the required role to block)
            else if(game.actionHistory[game.actionHistory.length - 2].type == "block") {
                io.to(socket.currentRoomId).emit('loseCard', challengerId, true, "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
        //The challenged lied
        } else {
            challenged.secondCardAlive = false
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action DID NOT actually have (or choose to reveal) the required role card)
            if(game.actionHistory[game.actionHistory.length - 2].type == "action") {
                game.nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
            }
            //Else if the last move logged before the challenge was a block, end the turn (ie: the player who blocked DID NOT actually have the required card to block)
            else if(game.actionHistory[game.actionHistory.length - 2].type == "block") {
                processLastAction(socket)
            }
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

function handleAssassinate(actorName, victimId, socket) {
    var victim = game.players[victimId]
    if (victim) {
        io.to(socket.currentRoomId).emit('loseCard', victimId, true, "Player " +  actorName + " has successfully assassinated you! Choose a card to lose.")
    } else {
        console.log('cannot find victim')
    }
}

function handleCardLoss(id, cardIndex, endTurn, socket) {
    victim = game.players[id]
    if(cardIndex == 0) {
        victim.firstCardAlive = false
    } else if (cardIndex == 1) {
        victim.secondCardAlive = false
    }
    //TODO: Handle if player dies (no more cards alive)

    if(endTurn)
        game.nextTurn()
    io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
}

function handleExchangeRequest(id, socket) {    
    const currentPlayer = game.players[id]    
    const selection = []
    if (currentPlayer.firstCardAlive) 
        selection.push(currentPlayer.firstCard)
    if (currentPlayer.secondCardAlive) 
        selection.push(currentPlayer.secondCard)

    selection.push(game.deck.pop())
    selection.push(game.deck.pop())

    game.nextTurn()
    io.to(socket.currentRoomId).emit('exchange', id, selection)
}

function exchangeCards(id, selected, unselected, socket) {
    var currentState = game.players[id]   
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
    io.to(socket.currentRoomId).emit('state change', new GameStatePayload(game))
}

function findPlayerIdByName(name) {
    return Object.keys(game.players).find(key => game.players[key].name.toString() === name)
}

function findEmptyRoom() {
    var allRooms = io.sockets.adapter.rooms

    var gameRoomKeys = Object.keys(allRooms).filter(key => {
        return key.startsWith("room") 
    })

    for (var roomId in allRooms) {
        if (gameRoomKeys.includes(roomId) && allRooms[roomId].length < MAX_PLAYERS_PER_ROOM) {

            return roomId
        }
    }

    return createNewRoom()
}

function createNewRoom() {
    //TODO generate real uid
    var roomId = Math.floor(Math.random()*10000)

    return `room${roomId}`
function getReplacementCard(player, cardIndex) {
    if(cardIndex == 0) {
        game.deck.push(player.firstCard)
        game.shuffleDeck()
        player.firstCard = ""
        player.firstCard = game.deck.pop()
    } else if (cardIndex == 1) {
        game.deck.push(player.secondCard)
        game.shuffleDeck()
        player.secondCard = ""
        player.secondCard = game.deck.pop()
    }
}

var time = 100;
setInterval(function() {
    for(var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i]
        socket.emit('timer', time)
    }
    if (time > 0)
        time--
},1000)}