const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const GameState = require('./server/gamestate')
const Player = require('./server/player')
const { GameStatePayload, ActionPayload, ActionLog } = require('./server/payloads')
const LobbyManager = require('./server/lobby')

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
// Create new game (only 1 lobby)
var allGames = {}
var inviteCodeToRoom = {}

io.on('connection', (socket) => {    
    socket.on('find lobby', (lobbyPayload) => {
        LobbyManager.leaveCurrentRooms(socket);
        var roomId = LobbyManager.findEmptyRoom(io)
        
        // TODo Bouger a un objet 'CurrentState' quand le refactor va etre fait
        if(!(roomId in allGames)) {
            allGames[roomId] = new GameState()
        }

        socket.currentRoomId = roomId
        handleRoomJoin(socket, lobbyPayload.playerName)
    })

    // TODO error handling for joining lobbies

    socket.on('invite friends', (lobbyPayload) => {
        LobbyManager.leaveCurrentRooms(socket);
        var roomId = LobbyManager.createNewRoom()
        allGames[roomId] = new GameState()

        var inviteCode = LobbyManager.createInviteCode(5)
        inviteCodeToRoom[inviteCode] = roomId

        socket.emit('invite code', inviteCode)

        socket.currentRoomId = roomId
        handleRoomJoin(socket, lobbyPayload.playerName)
    })

    socket.on('join lobby', (lobbyPayload) => {
        LobbyManager.leaveCurrentRooms(socket);

        var roomId = inviteCodeToRoom[lobbyPayload.inviteCode]

        socket.currentRoomId = roomId
        handleRoomJoin(socket, lobbyPayload.playerName)
    })

    socket.on('disconnect', () => {
        delete SOCKET_LIST[socket.id]

        LobbyManager.leaveCurrentRooms(socket);
        if(socket.currentRoomId) allGames[socket.currentRoomId].onDisconnect(socket.id)

        //notify other players of disconnection
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
    })
    
    //temporary
    socket.on('start game', () => {
        console.log(`${socket.currentRoomId} - start game!`)
        allGames[socket.currentRoomId].onBegin()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
    })

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

    socket.on('cardLost', (victimId, cardLost) => {
        handleCardLoss(victimId, cardLost, socket)
    })

    socket.on('execute exchange', (selected, unselected) => {
        exchangeCards(socket.id, selected, unselected, socket)
    })
});

function handleRoomJoin(socket, playerName) {
    const {currentRoomId, id} = socket

    socket.join(currentRoomId)

    SOCKET_LIST[id] = socket
    allGames[currentRoomId].players[id] = new Player(socket.id, playerName)

    //send player identity
    var initialState = allGames[currentRoomId].players[id]
    io.to(id).emit('self connection', initialState)

    // notify other players of new connection
    io.to(currentRoomId).emit('state change', new GameStatePayload(allGames[currentRoomId]))
}

function handleActionRequest(actionPayload, socket) {
    var actor = allGames[socket.currentRoomId].players[actionPayload.id]
    var displayText
    var actionRequest
    if(actionPayload.to == "") {
        displayText = actor.name + " is performing " + actionPayload.intent
    } else {
        displayText = actor.name + " is performing " + actionPayload.intent + " on " + actionPayload.to
    }
    actionRequest = new ActionPayload(actionPayload.id, actionPayload.intent, displayText, allGames[socket.currentRoomId].findPlayerIdByName(actionPayload.to))
    allGames[socket.currentRoomId].actionHistory.push(new ActionLog(actionRequest, "action"))
    io.to(socket.currentRoomId).emit('action broadcast', actionRequest)

    if(actionPayload.intent == "income") {
        handleCoinChange(actor, 1)
        allGames[socket.currentRoomId].nextTurn()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
    } else if (actionPayload.intent == "coup") {
        io.to(allGames[socket.currentRoomId].findPlayerIdByName(actionPayload.to)).emit('loseCard', "Player " +  actor.name + " is performing a coup on you! Choose a card to lose.")
        handleCoinChange(actor, -7)
    }
}

function processLastAction(socket) {
    var currentAction = getLastAction(socket)
    var action = currentAction.intent
    var actor = allGames[socket.currentRoomId].players[currentAction.actorId]
    switch(action) {
        //No switch case for income/coup actions because no one can block/challenge it. It just executes automatically on receiving the request from client
        case "foreign":
            handleCoinChange(actor, 2)
            allGames[socket.currentRoomId].nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            break
        case "tax":
            handleCoinChange(actor, 3)
            allGames[socket.currentRoomId].nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            break
        case "steal":
            handleSteal(actor, currentAction.victimId, socket)
            allGames[socket.currentRoomId].nextTurn()
            io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            break
        case "assassinate":
            handleCoinChange(actor, -3)
            handleAssassinate(actor.name, currentAction.victimId, socket)
            break
        case "exchange":
            handleExchangeRequest(currentAction.actorId, socket)
            break
        default:
            break
    }
}

function handleActionResponse(playerId, response, blockRole, socket) {
    switch(response) {
        case "confirm":
            var numberConfirmations = ++allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].confirmations
            //If everyone except the action initiator (who cannot 'vote') confirms the action, it goes through
            if(numberConfirmations == Object.keys(allGames[socket.currentRoomId].players).length - 1)
                processLastAction(socket)
            break
        case "challenge":
            var victimId = allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].actorId
            //TODO: Change action descriptors to the role which they correspond to facilitate clientside display and variable handling (ie: tax -> duke, steal -> captain)
            var displayText = allGames[socket.currentRoomId].players[playerId].name + " is challenging " + allGames[socket.currentRoomId].players[victimId].name
            var challengeAction = new ActionPayload(playerId, "challenge-" + allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].intent, displayText, victimId)
            allGames[socket.currentRoomId].actionHistory.push(new ActionLog(challengeAction, "challenge"))
            io.to(socket.currentRoomId).emit('challenge', challengeAction)
            break
        case "block":
            var victimId = allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].actorId
            var displayText = allGames[socket.currentRoomId].players[playerId].name + " is claiming to be " + blockRole + " to block " + allGames[socket.currentRoomId].players[victimId].name + " 's action."
            var blockAction = new ActionPayload(playerId, "block-" + blockRole, displayText)
            allGames[socket.currentRoomId].actionHistory.push(new ActionLog(blockAction, "block"))
            io.to(socket.currentRoomId).emit('block broadcast', blockAction)
            break
        default:
            break
    }
}

function handleBlockResponse(playerId, response, socket) {
    switch(response) {
        case "confirm":
            var numberConfirmations = ++allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].confirmations
            //If everyone except the blocker (who cannot 'vote') confirms the block, the action is blocked
            if(numberConfirmations == Object.keys(allGames[socket.currentRoomId].players).length - 1)
            allGames[socket.currentRoomId].nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            break
        case "challenge":
            var victimId = allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].actorId
            //TODO: Change action descriptors to the role which they correspond to facilitate clientside display and variable handling (ie: tax -> duke, steal -> captain)
            var displayText = allGames[socket.currentRoomId].players[playerId].name + " is challenging " + allGames[socket.currentRoomId].players[victimId].name
            var roleClaimed = allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 1].intent.split("-")[1]
            var challengeAction = new ActionPayload(playerId, "challenge-" + roleClaimed, displayText, victimId)
            allGames[socket.currentRoomId].actionHistory.push(new ActionLog(challengeAction, "challenge"))
            io.to(socket.currentRoomId).emit('challenge', challengeAction)
            break
        default:
            break
    }
}

function handleChallengeRequests(challengedId, challengerId, cardIndex, expectedCardType, socket) {
    challenged = allGames[socket.currentRoomId].players[challengedId]
    if(cardIndex == 0) {
        //The challenged didn't lie
        if(challenged.firstCard == expectedCardType) {
            getReplacementCard(challenged, cardIndex, socket)
            //If the last move logged was an action, execute it (ie: the player who performs the action actually had the corresponding role)
            if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "action") {
                allGames[socket.currentRoomId].currentActionToExecute = getLastAction(socket)
                io.to(challengerId).emit('loseCard', "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
            //Else if the last move logged as a block, end the turn (ie: the player who blocked actually had the required role to block)
            else if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "block") {
                io.to(challengerId).emit('loseCard', "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
        //The challenged lied
        } else {
            challenged.firstCardAlive = false
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action DID NOT actually have (or choose to reveal) the required role card)
            if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "action") {
                allGames[socket.currentRoomId].nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            }
            //Else if the last move logged before the challenge was a block, end the turn (ie: the player who blocked DID NOT actually have the required card to block)
            else if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "block") {
                processLastAction(socket)
            }
        }
    } else if (cardIndex == 1) {
        //The challenged didn't lie
        if(challenged.secondCard == expectedCardType) {
            getReplacementCard(challenged, cardIndex, socket)
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action actually had the corresponding role)
            if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "action") {
                allGames[socket.currentRoomId].currentActionToExecute = getLastAction(socket)
                io.to(challengerId).emit('loseCard', "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
            //Else if the last move before the challenge logged was a block, end the turn (ie: the player who blocked actually had the required role to block)
            else if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "block") {
                io.to(challengerId).emit('loseCard', "Player " +  challenged.name + " was really a " + expectedCardType + "! You have lost the challenge, choose a card to lose.")
            }
        //The challenged lied
        } else {
            challenged.secondCardAlive = false
            //If the last move logged before the challenge was an action, execute it (ie: the player who performs the action DID NOT actually have (or choose to reveal) the required role card)
            if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "action") {
                allGames[socket.currentRoomId].nextTurn()
                io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
            }
            //Else if the last move logged before the challenge was a block, end the turn (ie: the player who blocked DID NOT actually have the required card to block)
            else if(allGames[socket.currentRoomId].actionHistory[allGames[socket.currentRoomId].actionHistory.length - 2].type == "block") {
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

function handleSteal(actor, victimId, socket) {
    var victim = allGames[socket.currentRoomId].players[victimId]

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
    var victim = allGames[socket.currentRoomId].players[victimId]
    if (victim) {
        io.to(victimId).emit('loseCard', "Player " +  actorName + " has successfully assassinated you! Choose a card to lose.")
    } else {
        console.log('cannot find victim')
    }
}

function handleCardLoss(id, cardIndex, socket) {
    victim = allGames[socket.currentRoomId].players[id]
    if(cardIndex == 0) {
        victim.firstCardAlive = false
    } else if (cardIndex == 1) {
        victim.secondCardAlive = false
    }
    //TODO: Handle if player dies (no more cards alive)

    if (allGames[socket.currentRoomId].currentActionToExecute != "") {
        processLastAction(socket)
    } else {
        allGames[socket.currentRoomId].nextTurn()
        io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
    }
}

function handleExchangeRequest(id, socket) {    
    const currentPlayer = allGames[socket.currentRoomId].players[id]    
    const selection = []
    if (currentPlayer.firstCardAlive) 
        selection.push(currentPlayer.firstCard)
    if (currentPlayer.secondCardAlive) 
        selection.push(currentPlayer.secondCard)

    selection.push(allGames[socket.currentRoomId].deck.pop())
    selection.push(allGames[socket.currentRoomId].deck.pop())

    io.to(socket.currentRoomId).emit('exchange', id, selection)
}

function exchangeCards(id, selected, unselected, socket) {
    var currentState = allGames[socket.currentRoomId].players[id]   
    if (currentState.firstCardAlive) {
        currentState.firstCard = selected.pop()
    } 
    if (currentState.secondCardAlive) {
        currentState.secondCard = selected.pop()
    }
    // put back unselected
    allGames[socket.currentRoomId].deck.push.apply(allGames[socket.currentRoomId].deck, unselected)
    allGames[socket.currentRoomId].shuffleDeck()

    // TODO: Move somewhere else?
    allGames[socket.currentRoomId].nextTurn()
    io.to(socket.currentRoomId).emit('state change', new GameStatePayload(allGames[socket.currentRoomId]))
}


function getReplacementCard(player, cardIndex, socket) {
    if(cardIndex == 0) {
        allGames[socket.currentRoomId].deck.push(player.firstCard)
        allGames[socket.currentRoomId].shuffleDeck()
        player.firstCard = ""
        player.firstCard = allGames[socket.currentRoomId].deck.pop()
    } else if (cardIndex == 1) {
        allGames[socket.currentRoomId].deck.push(player.secondCard)
        allGames[socket.currentRoomId].shuffleDeck()
        player.secondCard = ""
        player.secondCard = allGames[socket.currentRoomId].deck.pop()
    }
}

function getLastAction(socket) {
    for (var i = allGames[socket.currentRoomId].actionHistory.length - 1; i >= 0; --i) {
        if (allGames[socket.currentRoomId].actionHistory[i].type == "action") {
            return allGames[socket.currentRoomId].actionHistory[i]
        }
    }
    //Return error message
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