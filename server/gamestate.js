const { Ambassador, Assassin, Captain, Contessa, Duke } = require('../common/card')

class GameState {
    constructor() {
        this.players = {}
        this.deck = []
        this.turn = "" // name of the player who plays during this turn
        this.tracker = 0 // used to track the turn
        this.inProgress = false
        this.currentActionToExecute = ""
        this.actionHistory = []
    }

    onDisconnect(id) {
        delete this.players[id]
    }

    onBegin() {
        this.deck = this.fillDeck(3)
        this.shuffleDeck()
        this.dealCards()
        this.turn = this.players[Object.keys(this.players)[this.tracker]].name //the first player that connected begins...
        this.inProgress = true
    }

    nextTurn(nextPlayerName = "") {
        if (this.inProgress && nextPlayerName === "") {
            this.tracker = ++this.tracker % Object.keys(this.players).length
            this.currentActionToExecute = ""
            this.turn = this.players[Object.keys(this.players)[this.tracker]].name
        } else {
            this.turn = nextPlayerName
        }
    }

    fillDeck(copies) {
        var deck = []
        for (var i = 0; i < copies; i++) {
            deck.push(new Ambassador())
            deck.push(new Assassin())
            deck.push(new Captain())
            deck.push(new Contessa())
            deck.push(new Duke())
        }
        return deck
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
    
    findPlayerIdByName(name) {
        return Object.keys(this.players).find(key => this.players[key].name.toString() === name)
    }
}

module.exports = GameState