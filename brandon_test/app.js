const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)
const { ChooseAction, PendingChallenge, PendingBlock, Execute, Blocked, CounterBlocked, Challenge, ChallengerLoses, ChallengedLoses, BlockerLoses, BlockedLoses} 
    = require('./states/states.js')
const { Income, Exchange, Confirm, Assassinate, ChallengerPlayer, Block, ChallengePlayer, ChooseCard } = require('./states/actions.js')

app.use(express.static("./"))
app.use('/jquery', express.static(__dirname + "/node_modules/jquery/dist"))

app.get('/', (req,res) => res.sendFile(__dirname+"/index.html" ))

http.listen(3005, () => { console.log('listening on 3005 ')})

var game = {
    roundAction: {},
    currentAction: {},
    players: {
        p1: {
            name: "firstplayer",
            coins: 2,
            firstCard: {},
            firstCardAlive: true,
            secondCard: {},
            secondCardAlive: true
        },
        p2: {
            name: "secondPlayer",
            coins: 2,
            firstCard: {},
            firstCardAlive: true,
            secondCard: {},
            secondCardAlive: true
        }
    },
    currentState: new ChooseAction(),

    isChangingState: function() {
        return typeof this.currentState === typeof this.currentState.followingState
    },

    setFollowingState: function() {
        this.currentState = this.currentState.followingState
    }
}

io.on('connection', (socket) => {
    //begin
    socket.emit('state change', game)

    socket.on('action', (actionPayload) => {
        game.currentAction = convertToAction(actionPayload)
        game.currentState.decide(game.currentAction)
        if (game.isChangingState()) {
            game.setFollowingState()
        }      

        socket.emit('state change', game)
    })
})

// do something better
function convertToAction(actionPayload) {
    actionName = actionPayload.intent
    ownerName = actionPayload.owner
    targetName = actionPayload.target
    card = actionPayload.card
    // Comment faire une reference a une classe??? ou bien comment passer une nouvel objet a chaque fois
    switch(actionName) {
        case "confirm": return new Confirm(ownerName, targetName)
        case "income": return new Income(ownerName, targetName);
        case "assassinate": return new Assassinate(ownerName, targetName)
        case "exchange": return new Exchange(ownerName, targetName);
        case "challengePlayer":  return new ChallengePlayer(ownerName, targetName, card)
        case "chooseCard": return new ChooseCard(ownerName, targetName, card)
        case "block": return new Block(ownerName, targetName, card)
        default: break;
    }
}