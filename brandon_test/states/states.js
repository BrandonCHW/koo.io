const { Income, Coup, Exchange, Confirm, Assassinate, ChallengePlayer, Block, ChooseCard } = require("./actions");

class State {
    constructor(...args) {
        this.followingState = undefined
    }

    //a message to display which describes the state
    announce() {}

    //based on the action, decide if next() or deny() be called after
    decide(currentAction=null) { throw new Error("Not implemented")}

    next() { throw new Error("Not implemented")}
    deny() { throw new Error("Not implemented")}
}

class ChooseAction extends State {
    constructor() { 
        super(); 
        this.name = "ChooseAction"
        console.log('State change-> ChooseAction')
    }

    decide(currentAction) {
        if (currentAction instanceof Income) {
            this.followingState = new Execute()
        } if (currentAction instanceof Coup) {
            this.followingState = new PreExecute()
        } else {
            this.next()
        }
    }

    next() {
        this.followingState = new PendingChallenge()
    }
}

class PendingChallenge extends State {
    constructor() { 
        super(); 
        this.name = "PendingChallenge"
        console.log('State change-> PendingChallenge')
        this.playerConfirms = 0
        this.awaitConfirms = true
    }

    announce() {
        return `AwaitingConfirms: ${5-this.playerConfirms}/5`
    }

    decide(action) {
        //instead, get state, then for each player except the owner of action, get confirm
        if (action instanceof Confirm) {
            this.playerConfirms++
            if (this.playerConfirms == 5) {
                this.next()
            }
        } else if (action instanceof ChallengePlayer) {
            this.awaitConfirms = false;
            this.deny()
        } else {
            console.log('not a valid action')
        }
    }

    next() {
        this.followingState = new PendingBlock()
    }

    deny() {
        this.followingState = new Challenge()
    }
}

class Challenge extends State {
    constructor() {
        super();        
        this.name = "Challenge";
        console.log('State change-> Challenge')
    }

    //Owner of currentAction exposes an influence
    decide(currentAction) {
        if (currentAction instanceof ChooseCard) { 
            if (currentAction.card.name === "firstCard") { // ex: Duke. prendre la vraie carte et voir si Card.actions contient le counter du 'game.currentAction'
                this.next()
            } else {
                this.deny()
            }
        }
    }

    next() {        
        this.followingState = new ChallengerLoses()
    }

    deny() {

        this.followingState = new ChallengedLoses()
    }
}

class ChallengedLoses extends State {
    constructor() {
        super(); 
        this.name = "ChallengedLoses"
        console.log('State change-> ChallengedLoses')
    }

    announce() {
        return `The challenged has lost. He is choosing a card to lose`
    }

    decide(action) {
        if (action instanceof ChooseCard) {
            //get the player card and destroy it
            this.next()
        }
    }

    next() {
        this.followingState = new ChooseAction()
    }
}

class ChallengerLoses extends State {
    constructor() {
        super();         
        this.name = "ChallengerLoses"
        console.log('State change-> ChallengerLoses')}

    announce() {
        return `The challenger has lost. He is choosing a card to lose`
    }

    decide(action) {
        if (action instanceof ChooseCard) {
            //get the player card and destroy it
            this.next()
        }
    }

    next() {
        this.followingState = new PendingBlock()
    }
}

class PendingBlock extends State {
    constructor() {
         super(); 
         this.name = "PendingBlock"
         console.log('State change-> PendingBlock')
         this.playerConfirms = 0
    }

    announce() {
        return `p1 is wants to ---- p2. What will you do? (confirm) (Block with your ---)`
    }

    decide(currentAction) {
        if (currentAction instanceof Confirm) {
            this.next()
        } else if (currentAction instanceof Block) {
            console.log('pending block - block')
            this.deny()
        }
    }

    next() { 
        this.followingState = new PreExecute()
    }

    deny() {
        this.followingState = new Blocked()
    }
}

class Blocked extends State {
    constructor() { super();
        this.name = "Blocked";
         console.log('State change-> Blocked')
    }

    announce() {
        return `Blocked! Confirm or Call Bluff`
    }

    decide(currentAction) {        
        if (currentAction instanceof Confirm) {
            this.next()
        } else {
            this.deny()
        }
    }

    next() {
        this.followingState = new ChooseAction()
    }

    deny() {
        this.followingState = new CounterBlocked()
    }
}

class CounterBlocked extends State {
    constructor() { super();
        this.name = "CounterBlocked"
        console.log('State change-> CounterBlocked')
    }

    announce() {
        return `The blocker called bluff on the blocker. Blocker choosing a card to prove...`
    }

    decide(currentAction) {
        if (currentAction instanceof ChooseCard) {
            console.log(currentAction.card.name)
            if (currentAction.card.name === "firstCard") { //ex: Duke. "Shows right card, blocker loses"
                this.deny()
            } else {
                this.next()
            }
        }
    }

    next() {
        this.followingState = new BlockedLoses()
    }

    deny() {
        this.followingState = new BlockerLoses()
    }
}

class BlockerLoses extends State {
    constructor() { super(); 
        this.name = "BlockerLoses"
        console.log('State change-> BlockerLoses')}

    announce() {
        return `The blocker has lost. He is choosing a card to lose...`
    }

    decide(action) {
        if (action instanceof ChooseCard) {
            //destroy card
            this.next()
        }
    }

    next() {
        
        this.followingState = new PreExecute()
    }
}

class BlockedLoses extends State {
    constructor() { 
        super();
        this.name = "BlockedLoses"
        console.log('State change-> BlockedLoses')}

    announce() {
        return `The blocked has lost. He is choosing a card to lose...`
    }
    
    decide(action) {
        if (action instanceof ChooseCard) {
            //destroy card
            this.next()
        }
    }

    next() {
        this.followingState = new ChooseAction()
    }
}

class PreExecute extends State {
    constructor() {
        super()
        this.name = "Resolve"
        console.log('State change-> Resolve')
    }

    decide(action) {
        
    }
}

class Execute extends State {
    constructor() {
        super(); 
        this.name = "Execute";
        console.log('State change-> Execute')
        
    }

    decide(action) {            
        //in execute, actions are immediatelly activated
        if (action.preExecutes)
        action.execute()
    }

    next() {
        this.followingState = new ChooseAction()
    }
}

module.exports = { ChooseAction, PendingChallenge, PendingBlock, Execute, Blocked, CounterBlocked, Challenge, ChallengerLoses, ChallengedLoses, BlockerLoses, BlockedLoses, PreExecute}