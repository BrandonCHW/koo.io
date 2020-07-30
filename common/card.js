class Action {
    constructor() {
        if (this.constructor() === Action) {
            this.name = ""
            throw new Error("Invalid instantiation - Abstract Class")
        }
    }

    compare(action) {
        return this.name === action.name
    }

    // owner: 'Player' type object that owns the action
    // target: 'Player' who this action is targeted against (optional)
    execute(owner, target=undefined) { throw new Error("Not Implemented execute()") }
}

class Income extends Action {
    constructor() {
        this.name = "Income"
    }

    execute(owner) {
    }
}

class ForeignAid extends Action {
    constructor() {
        this.name = "Foreign"
    }
}

class Tax extends Action {
    constructor() {
        this.name = "Tax"
    }
}

class Steal extends Action {
    constructor() {
        this.name = "Steal"
    }
}

class Assassinate extends Action {
    constructor() {
        this.name = "Assassinate"
    }
}

class Exchange extends Action {
    constructor() {
        this.name = "Exchange"
    }
}

class Coup extends Action {
    constructor() {
        this.name = "Coup"
    }
}

class BlockForeignAid extends Action {
    constructor() {
        this.name = "BlockForeignAid"
    }
}

class BlockStealing extends Action {
    constructor() {
        this.name = "BlockStealing"
    }
}

class BlockAssassination extends Action {
    constructor() {
        this.name = "BlockAssassination"
    }
}

// Abstract
class Card {
    constructor() {
        if (this.constructor() === Card) {
            this.action = [] // will be an array of Powers
            console.log("Invalid instantiation - Abstract Class")
        }
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

class Ambassador extends Card {    
    constructor() {
        this.actions = [ new Exchange(), new BlockStealing() ]
    }
} 

class Assassin extends Card {
    constructor() {
        this.actions = [ new Assassinate() ]
    }
}

class Captain extends Card {
    constructor() {
        this.actions = [ new Steal(), new BlockStealing() ]
    }
}

class Contessa extends Card {
    constructor() {
        this.actions = [ new BlockAssassination() ]
    }
}

class Duke extends Card {
    constructor() {
        this.actions = [ new Tax(), new BlockForeignAid() ]
    }
}