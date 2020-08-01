// TODO may not need this
class GameStatePayload {
    constructor(gameState) {
        this.gameState = gameState
    }
}

class ActionPayload {
    //Action payload destined to be sent to the client
    constructor(actorId, action, displayText="", victimId="") {
        this.actorId = actorId
        // this.intent = intent
        this.action = action // An Action (Income, ForeignAid, ...)
        this.victimId = victimId
        this.displayText = displayText
    }
}

class ActionLog extends ActionPayload {
    //Stores information serverside about a move in game.actionHistory
    constructor(actionPayload, type, confirmations = 0) {
        super(actionPayload.actorId, actionPayload.intent, actionPayload.displayText, actionPayload.victimId)
        this.type = type
        this.confirmations = confirmations
    }
}

module.exports = { GameStatePayload, ActionPayload, ActionLog }