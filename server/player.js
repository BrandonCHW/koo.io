class Player {
    constructor(name) {
        this.name = name
        this.coins = 2
        this.firstCard = {}
        this.firstCardAlive = false
        this.secondCard= {}
        this.secondCardAlive = false
    }
}

module.exports = Player