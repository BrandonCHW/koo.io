class Player {
    constructor(id, name) {
        this.name = name
        this.coins = 2
        this.firstCard = "card1"
        this.firstCardAlive = false
        this.secondCard= "card2"
        this.secondCardAlive = false
    }
}

module.exports = Player