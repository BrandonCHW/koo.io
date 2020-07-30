class Action {
    constructor() {
        if (this.constructor === Action) {
            throw new Error("Can't instanciate an abstract class")
        }
        this.name = ""
    }

    compare(action) {
        return this.name === action.name
    }

    // owner: 'Player' type object that owns the action
    // target: 'Player' who this action is targeted against (optional)
    execute() { throw new Error("Not Implemented execute") }
}

class Income extends Action {
    constructor() {
        super()
        this.name = "Income"
    }

    execute() {
    }
}

class ForeignAid extends Action {
    constructor() {
        super()
        this.name = "Foreign"
    }
    
    execute() {
    }
    
}

class Tax extends Action {
    constructor() {
        super()
        this.name = "Tax"
    }
    
    execute() {
    }
}

class Steal extends Action {
    constructor() {
        super()
        this.name = "Steal"
    }
    
    execute() {
    }
}

class Assassinate extends Action {
    constructor() {
        super()
        this.name = "Assassinate"
    }
    
    execute() {
    }
}

class Exchange extends Action {
    constructor() {
        super()
        this.name = "Exchange"
    }
    
    execute() {
    }
}

class Coup extends Action {
    constructor() {
        super()
        this.name = "Coup"
    }
    
    execute() {
    }
}

class BlockForeignAid extends Action {
    constructor() {
        super()
        this.name = "BlockForeignAid"
    }
    
    execute() {
    }
}

class BlockStealing extends Action {
    constructor() {
        super()
        this.name = "BlockStealing"
    }
    
    execute() {
    }
}

class BlockAssassination extends Action {
    constructor() {
        super()
        this.name = "BlockAssassination"
    }
    
    execute() {
    }
}

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


//TODO change action objects to something static
class Ambassador extends Card {    
    constructor() {
        super()
        this.name = "Ambassador"
        this.actions = [ new Exchange(), new BlockStealing() ]
    }
} 

class Assassin extends Card {
    constructor() {
        super()
        this.name = "Assassin"
        this.actions = [ new Assassinate() ]
    }
}

class Captain extends Card {
    constructor() {
        super()
        this.name = "Captain"
        this.actions = [ new Steal(), new BlockStealing() ]
    }
}

class Contessa extends Card {
    constructor() {
        super()
        this.name = "Contessa"
        this.actions = [ new BlockAssassination() ]
    }
}

class Duke extends Card {
    constructor() {
        super()
        this.name = "Duke"
        this.actions = [ new Tax(), new BlockForeignAid() ]
    }
}

module.exports = { Income, ForeignAid, Tax, Steal, Assassinate, Exchange, Coup,
    BlockForeignAid, BlockStealing, BlockAssassination, Ambassador, Assassin, Captain, Contessa, Duke }