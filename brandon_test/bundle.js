(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const { Income, Exchange, Confirm, Assassinate, ChallengePlayer, Block } = require('./states/actions.js')
const { ChooseAction, PendingChallenge, PendingBlock, Execute, Blocked, CounterBlocked, Challenge, ChallengerLoses, ChallengedLoses, BlockerLoses, BlockedLoses} = require('./states/states.js')

console.clear()

window.onload = () => {
    class ActionPayload { 
        constructor(intent, owner="p1", target="p2", card={}) {
            this.intent = intent
            this.owner = owner
            this.target = target
            this.card = card
        }
    }
    var socket = io()

    socket.on('state change', (payload) => {
        var currentState = document.querySelector("#currentState")
        currentState.textContent = payload.currentState.name

        if (payload.currentAction) {
            var act = JSONtoAction(payload.currentAction)
            var state = JSONtoState(payload.currentState)
            updateMainMessage(act, state)
        }
    })
    
    $("#next").on("click", function() {
        const intention = $("input[name='action']:checked").attr("id")
        const owner = $("input[name='owner']:checked").data('name').toString()
        const target = $("input[name='target']:checked").data('name').toString()
        const card = $("input[name='cardSelector']:checked").attr('id').toString()
        if (intention) {
            if (intention == "assassinate" || intention == "steal" || intention == "coup") {
                // var target = $("input[name='playerSel']:checked").data('name').toString() // gets data-name
            }
            const p = new ActionPayload(intention, owner, target, { name: card })
            console.log(p)
            socket.emit('action', p)
        }
    })
}


function updateMainMessage(action, state) {
    $("#actionMessage").empty()
    $("#stateMessage").empty()
    $("#counterMessage").empty()
    
    if (action.announce) {
        $("#actionMessage").text(action.announce())
    } 
    if (state.announce) {
        $('#stateMessage').text(state.announce())
    }
}

function JSONtoAction(action) {
    // Comment faire une reference a une classe??? ou bien comment passer une nouvel objet a chaque fois
    var a = action
    switch(action.name) {
        case "confirm": Object.setPrototypeOf(a, Confirm.prototype); break;
        case "income": Object.setPrototypeOf(a, Income.prototype); break;
        case "assassinate": Object.setPrototypeOf(a, Assassinate.prototype); break;
        case "exchange": Object.setPrototypeOf(a, Exchange.prototype); break;
        case "challenge": Object.setPrototypeOf(a, ChallengePlayer.prototype); break;
        case "block": Object.setPrototypeOf(a, Block.prototype); break;
        default: break;
    }

    return a
}

//transformer pour avoir le announce() des states
function JSONtoState(state) {
    var s = state
    switch(s.name) {
        case "PendingBlock": Object.setPrototypeOf(s, PendingBlock.prototype); break;
        case "ChallengedLoses": Object.setPrototypeOf(s, ChallengedLoses.prototype); break;
        case "ChallengerLoses":  Object.setPrototypeOf(s, ChallengerLoses.prototype); break;
        case "PendingChallenge": Object.setPrototypeOf(s, PendingChallenge.prototype); break;
        case "Blocked": Object.setPrototypeOf(s, Blocked.prototype); break;
        case "CounterBlocked": Object.setPrototypeOf(s, CounterBlocked.prototype); break;
        case "BlockerLoses": Object.setPrototypeOf(s, BlockerLoses.prototype); break;
        case "BlockedLoses": Object.setPrototypeOf(s, BlockedLoses.prototype); break;
        default: break;
    }

    return s
}

},{"./states/actions.js":2,"./states/states.js":3}],2:[function(require,module,exports){
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
    
    //https://caolan.uk/articles/writing-for-node-and-the-browser/
    // use classes for both frontend and backend
    // wtf: 
    //https://stackoverflow.com/questions/2421911/what-is-the-purpose-of-wrapping-whole-javascript-files-in-anonymous-functions-li
    
    
    /**
     * Javascript closure
     * Ce fichier est lu par un autre fichier (probablement javascript). 
     * le premier set de parenthese cree un 'object literal', aussi nomme anonymous function.
     * c'est seulement une fonction qui ne possede pas de nom. a l'interieur de la deuxieme set de parentheses se trouve '(exports)'
     * c'est juste le nom d'un argument qu'on passe a l'anonymous function, un argument qui va etre utilise a l'interieur de celui-ci
     * pour en fait le modifier (dans le cas ici, c'est pour faire une affectation avec un objet qui contient toutes mes classes). A la fin,
     * on a un autre set de parenthese. c'est pour activer la fonction juste une fois. c'est comme si je fais...
     * 
     * const hello = fonctionAnonyme();
     * 
     * hello(); 
     * 
     * Mais ca evite que cette fonction ait un scope global (c'est-a-dire, il est cree et ensuite peut etre utilise n'importe ou ailleurs, parce que je
     * l'ai affecte a ma variable hello -- j'aurais pu faire hello() ailleurs dans mon code, mais je ne veux pas faire ca plus qu'une fois)
     * 
     * Donc, en fait dans cette parenthese je mets un argument, qui va etre passe a ma fonction anonyme pour qu'elle soit run une fois.
     * L'expression est: typeof exports === 'undefined'? this.actions={} : exports
     * 
     * En fait, c'est juste dire si exports est defini ou pas. Si il est defini, il reste tel quel. Sinon, le javascript qui fait appel a ce script 
     * (par exemple, dans html, <script src="actions.js"></script>), va avoir un objet nul {} assigne a la propriete 'actions'. 
     * 
     * Sur Node.JS, quand on fait un require sur ce module, il va run la fonction anonyme et va lui passer exports, qui est une variable deja defini et qui referencie module.exports
     * ... et ainsi exports sera affecte a la fin avec toutes les classes que j'ai defini dans ce fichier.
     * 
     * Sur le frontend, quand on fait <script>...</script>, puisque exports n'est pas une variable definie (c'est seulement avec NodeJS)
     * une nouvelle propriete appelee 'actions' sera cree sur le 'this' global (?) et ensuite quand la fonction anonyme va run
     * il va affecte toutes mes classes a cet objet vide (ligne exports = {mes classes et fonctions a exporter...})
     */
},{}],3:[function(require,module,exports){
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
},{"./actions":2}]},{},[1]);
