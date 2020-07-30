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

    execute() { throw new Error("Not Implemented execute") }
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
        this.name = Income
    }
}

class Tax extends Action {
    constructor() {
        this.name = Income
    }
}

class Steal extends Action {
    constructor() {
        this.name = Income
    }
}

class Assassinate extends Action {
    constructor() {
        this.name = Income
    }
}

class Exchange extends Action {
    constructor() {
        this.name = Income
    }
}

class Coup extends Action {
    constructor() {
        this.name = Income
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

    canDoAction(action) {
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
        this.action = 
    }
} 

class Assassin extends Card {
    constructor() {
    }
}

class Captain extends Card {
    constructor() {
    }
}

class Contessa extends Card {
    constructor() {
    }
}

class Duke extends Card {
    constructor() {
    }
}