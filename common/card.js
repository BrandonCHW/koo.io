const Player = require("../server/player")


///*****************************///
///*********** Actions *********///
///*****************************///

class Action {
    constructor() {
        if (this.constructor === Action) {
            throw new Error("Can't instanciate an abstract class")
        }
        this.name = ""
        // owner: Player that owns the action
        // target: the Player who's targeted by this action
        this.ownerName = ""
        this.targetName = ""
        canBeDenied = false; // can be challenged or blocked
    }

    compare(action) {
        return this.name === action.name
    }

    
    //announceAction is to be called on the FRONTEND
    announce() { throw new Error("Error: Action.announceAction() not implemented") }

    execute() { throw new Error("Error: Action.execute() Not Implemented") }
}

class Income extends Action {
    constructor() {
        super()
        this.name = "Income"
        canBeDenied = false
    }
    
    execute() {
        if (owner instanceof Player) {
            if (owner.coins <= 10) {
                owner.coins += 1
            }            
        }
    }
}

class ForeignAid extends Action {
    constructor() {
        super()
        this.name = "Foreign"
        canBeDenied = true
    }

    announce(owner) {
        var messageBox = document.querySelector("#messageBox");
        messageBox.innerHTML =  `${owner.name} calls for Foreign Aid. Will you <button id="confirmAction">Confirm</button> <button class="reactionSel" value="block-duke">Claim to be Duke</button>`
    }
    
    execute(owner, target) {
        if (owner instanceof Player) {
            if (owner.coins <= 10) {
                owner.coins += 2
            }            
        }
    }
    
}

class Coup extends Action {
    constructor() {
        super()
        this.name = "Coup"
        canBeDenied = false
    }
    
    execute(owner, target) {
        if (owner instanceof Player) {
            if (owner.coins <= 10) {
                owner.coins -= 7
            }            
        }
    }
}

class Tax extends Action {
    constructor() {
        super()
        this.name = "Tax"
        canBeDenied = true
    }
    
    execute(owner, target) {
        if (owner instanceof Player) {
            if (owner.coins <= 10) {
                owner.coins += 3
            }            
        }
    }
}

class Steal extends Action {
    constructor() {
        super()
        this.name = "Steal"
        canBeDenied = true
    }
    
    execute() {
    }
}

class Assassinate extends Action {
    constructor() {
        super()
        this.name = "Assassinate"
        canBeDenied = true
    }

    announce(owner, target) {
        var messageBox = document.querySelector("#messageBox");
        messageBox.innerHTML =  `${owner.name} wants to Assassinate ${target.name}. Will you <button id="confirmAction">Confirm</button> 
        <button class="reactionSel" id="challenge-reaction" value="challenge">Challenge</button>`
    }
    
    execute() {
    }
}

class Exchange extends Action {
    constructor() {
        super()
        this.name = "Exchange"
        canBeDenied = true
    }
    
    execute() {
    }
}

// NOT sure about those actions vvvvvvvvvvvvvv

class BlockForeignAid extends Action {
    constructor() {
        super()
        this.name = "BlockForeignAid"
        canBeDenied = false
    }
}

class BlockStealing extends Action {
    constructor() {
        super()
        this.name = "BlockStealing"
        canBeDenied = false
    }
}

class BlockAssassination extends Action {
    constructor() {
        super()
        this.name = "BlockAssassination"
        canBeDenied = false
    }
}

///*****************************///
///*********** CARDS ***********///
///*****************************///

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