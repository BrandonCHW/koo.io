window.onload = () => {

    class ActionPayload { 
        constructor(intent, to="") {
            this.id = socket.id
            this.intent = intent
            this.to = to
        }
    }
    
    var socket = io()
    
    var playerId = ""
    socket.on('connect',  () => {
        playerId = socket.id
    })

    // called whenever the game state changes (new connection, action, next turn)
    socket.on('state change', (payload) => {
        if (payload.gameState.turn != payload.gameState.players[playerId].name) {
            $("#turn").text(payload.gameState.turn)
            $('#nextTurn').prop('disabled', true)
        } else {
            $("#turn").text(payload.gameState.turn + " (YOU)")
            $('#nextTurn').prop('disabled', false)
        }
        updateOtherPlayersView(payload)
        updatePlayerStatus(payload.gameState.players[playerId])
    })
    
    // called when the player bitconnects to the game
    socket.on('self connection', (p) => {
        updatePlayerStatus(p)
    })

    // Receive timer update (periodically updated)
    socket.on('timer', (time) => {
        updateTimer(time)
    })

    socket.on('assassinateTarget', (attackerName, victimId) => {
        if(playerId === victimId) {
            $("#attackerName").text(attackerName)
            $("#attackType").text("assassinating")
            $('#cardSelect').css("display", "block")

            // TODO: Bullshit Mechanic
            // TODO: Change target.textContent for a more secure id
            $(".loseCardSel").on("click", (event) => selectCardToLose(event.target))
        }
    })

    socket.on('Coup', (attackerName, victimId) => {
        if(playerId === victimId) {
            $("#attackerName").text(attackerName)
            $("#attackType").text("doing a Coup on")
            $('#cardSelect').css("display", "block")

            // TODO: Change target.textContent for a more secure id
            $(".loseCardSel").on("click", (event) => selectCardToLose(event.target))
        }
    })

    socket.on('exchange', (selection) => {
        $("#cardExchange").css("display","block")
        var section = $("#cardExchange > div")
        section.empty()
        for(var i = 0; i < selection.length; i++) {
            section.append(`<label for="select-card-${i}">${selection[i]}</label>
                            <input type="checkbox" id="select-card-${i}" name="cardsToKeep">`)
        }
    })

    //TODO remove this later
    $("#startGame").on("click", function() {
        socket.emit('start game')
    })

    $("#nextTurn").on("click", function() {
        const intention = $("input[name='action']:checked").attr("id")
        if (intention == "assassinate" || intention == "steal")
            var to = $("input[name='playerSel']:checked").data('name').toString() // gets data-name
        socket.emit('action', new ActionPayload(intention, to))
    })
    
    // Toggle player selection (assassinate, steal)
    $("input[name='action']").change(function() {
        const intention = $(this).attr('id')
        if (intention == "assassinate" || intention == "steal") {
            $("#intention").text(intention)
            $("#playerSelector").css("display","block")
        } else {
            $("#playerSelector").css("display","none")
        }
    })

    //Updates the 'player status' 
    function updatePlayerStatus(p) {
        $("#playerName").text(p.name)
        $("#pCoins").text(p.coins)
        $("#pCard1Name").text(p.firstCard)
        $("#pCard1Alive").text(p.firstCardAlive)
        $("#pCard2Name").text(p.secondCard)
        $("#pCard2Alive").text(p.secondCardAlive)
    }
    
    //Updates the 'other players'
    function updateOtherPlayersView(payload) {
        var otherPlayers = Object.keys(payload.gameState.players)
            .filter(key => key != playerId)
            .reduce((obj, key) => {
                obj[key] = payload.gameState.players[key]
                return obj
            }, {})
        var otherSection = $("#otherPlayers > div")
        var playerSelector = $("#playerSelector > div")
        otherSection.empty()
        playerSelector.empty()
        for(const id in otherPlayers) {
            const other = otherPlayers[id]
            otherSection.append(`<p>Name: ${other.name}; 
                Card1: ${other.firstCard} 
                (${other.firstCardAlive}); 
                Card2: ${other.secondCard} 
                (${other.secondCardAlive}); 
                Coins: ${other.coins}</p>`)
    
            playerSelector.append(`<label for="player-${other.name}">${other.name}</label>
                                    <input type="radio" id="player-${other.name}" data-name="${other.name}" name="playerSel"></button>`)
        }
    }
    
    function updateTimer(time) { 
        $("#roundTimer").text(time)
    }
    
    //choose a card to lose
    function selectCardToLose(button) {
        $('#cardSelect').css("display", "none")
        cardLost = button.value.split(" ")[2]
        socket.emit('cardLost', playerId, cardLost)
    }
}
