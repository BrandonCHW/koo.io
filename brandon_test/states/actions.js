(function(exports) {
    class Action {
        constructor(ownerName="", targetName="", card={}) {
            if (this.constructor === Action) {
                throw new Error("Can't instanciate an abstract class")
            }
            this.name = ""
            // owner: Player that owns the action
            // target: the Player who's targeted by this action
            this.ownerName = ownerName
            this.targetName = targetName
            this.card = card
            this.canBeDenied = false; // can be challenged or blocked
        }
    
        compare(action) {
            return this.name === action.name
        }
    
        
        //announceAction is to be called on the FRONTEND
        // announce() {}
    
        //Choose Card to lose phase - Assassinate, 
        preExecute(io) { return false; }

        execute(state) { throw new Error("Error: Action.execute() Not Implemented") }
    }
    
    class Income extends Action {
        constructor(ownerName, targetName) {
            super(ownerName, targetName)
            this.name = "income"
            this.canBeDenied = false
            this.temp = 1
        }

        announce() {
            console.log('income announcess')
            return `${this.ownerName} perceived Income`
        }
        
        execute() {
            // if (owner.coins <= 10) {
            //     owner.coins += 1
            // }  
            console.log('temp : ', this.temp)
            this.temp++     
        }
    }
    
    class Exchange extends Action {
        constructor(ownerName, targetName) {
            super(ownerName, targetName)
            this.name = "exchange"
            this.canBeDenied = true
        }
        
        execute() {
        }
    }
    
    class Assassinate extends Action {
        constructor(ownerName, targetName) {
            super(ownerName, targetName)
            this.name = "assassinate"
        }
    
        announce() {
            return `${this.ownerName} wants to asssassinate ${this.targetName}`
        }

        preExecute() {
            // get game state, the original targetName, and make him select a card to lose
            return `Choose a card to lose (card1) (card2)`
        }
    
        execute() {
            // get player data
            // destroy the chosen card
        }
    }
    
    class Confirm extends Action {
        constructor() {
            super()
            this.name = "confirm"
            this.canBeDenied = false
        }
    }
    
    class ChallengePlayer extends Action {
        constructor(ownerName, targetName) {
            super(ownerName, targetName)
            this.name = "challenge"
            this.canBeDenied = false
            console.log(this)
        }

        announce() {
            return `${this.ownerName} calls bluff on ${this.targetName}. ${this.targetName} choose a card to prove...`
        }
    }
    
    class Block extends Action {
        constructor(ownerName, targetName, card) {
            super(ownerName, targetName, card)
            this.name = "block"
            this.canBeDenied = false
        }

        announce() {
            return `${this.ownerName} has blocked ${this.targetName} (Claims to be ---)`
        }
    }

    class ChooseCard extends Action {
        constructor(ownerName, targetName, card) {
            super(ownerName, targetName)
            this.name = "chooseCard"
            this.canBeDenied = false

            this.cardIndex = 1
            this.card = card
        }
    }

    class Coup extends Action {
        constructor(ownerName, targetName, card) {
            super(ownerName, targetName)
            this.name = "coup"
            this.canBeDenied = false

            this.cardIndex = 1
            this.card = card
        }
    }

    var myClasses = { Income, Coup, Exchange, Confirm, Assassinate, ChallengePlayer, Block, ChooseCard }
    
    if (typeof module !== 'undefined') {
        module.exports = myClasses
    } else {
        exports = myClasses
    }
    
    })(typeof exports === 'undefined' ? this.actions = {} : exports) 
    