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
