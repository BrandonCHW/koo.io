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