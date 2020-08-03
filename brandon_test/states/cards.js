const { Steal, BlockStealing, Tax, BlockForeignAid } = require("actions.js")


// Abstract
class Card {
    constructor() {
        if (this.constructor === Card) {
            throw new Error("Can't instanciate an abstract class")
        }
        this.name = ""
        this.action = [] // will be an array of Powers
    }

    canExecute(action) {
        for (var a in this.actions) {
            if (a.compare(action)) {
                return true
            }
        }
        return false
    }
}

class Captain extends Card {
    constructor() {
        super()
        this.name = "Captain"
        this.actions = [ new Steal(), new BlockStealing() ]
    }
}

class Duke extends Card {
    constructor() {
        super()
        this.name = "Duke"
        this.actions = [ new Tax(), new BlockForeignAid() ]
    }
}
