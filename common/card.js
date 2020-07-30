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
    execute() { throw new Error("Not Implemented execute()") }
}

class Income extends Action {
    constructor() {
        this.name = "Income"
    }

    execute() {
    }
}

class ForeignAid extends Action {
    constructor() {
        this.name = "Foreign"
    }
    
    execute() {
    }
    
}

class Tax extends Action {
    constructor() {
        this.name = "Tax"
    }
    
    execute() {
    }
}

class Steal extends Action {
    constructor() {
        this.name = "Steal"
    }
    
    execute() {
    }
}

class Assassinate extends Action {
    constructor() {
        this.name = "Assassinate"
    }
    
    execute() {
    }
}

class Exchange extends Action {
    constructor() {
        this.name = "Exchange"
    }
    
    execute() {
    }
}

class Coup extends Action {
    constructor() {
        this.name = "Coup"
    }
    
    execute() {
    }
}

class BlockForeignAid extends Action {
    constructor() {
        this.name = "BlockForeignAid"
    }
    
    execute() {
    }
}

class BlockStealing extends Action {
    constructor() {
        this.name = "BlockStealing"
    }
    
    execute() {
    }
}

class BlockAssassination extends Action {
    constructor() {
        this.name = "BlockAssassination"
    }
    
    execute() {
    }
}

// Abstract
class Card {
    constructor() {
        if (this.constructor() === Card) {
            this.name = ""
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


//TODO change action objects to something static
class Ambassador extends Card {    
    constructor() {
        this.name = "Ambassador"
        this.actions = [ new Exchange(), new BlockStealing() ]
    }
} 

class Assassin extends Card {
    constructor() {
        this.name = "Assassin"
        this.actions = [ new Assassinate() ]
    }
}

class Captain extends Card {
    constructor() {
        this.name = "Captain"
        this.actions = [ new Steal(), new BlockStealing() ]
    }
}

class Contessa extends Card {
    constructor() {
        this.name = "Contessa"
        this.actions = [ new BlockAssassination() ]
    }
}

class Duke extends Card {
    constructor() {
        this.name = "Duke"
        this.actions = [ new Tax(), new BlockForeignAid() ]
    }
}

module.exports = { Income, ForeignAid, Tax, Steal, Assassinate, Exchange, Coup,
    BlockForeignAid, BlockStealing, BlockAssassination, Ambassador, Assassin, Captain, Contessa, Duke }