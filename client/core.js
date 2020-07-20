
window.onload = () => {
    var socket = io()
    
    var playerId = ""
    socket.on('connect',  () => {
        playerId = socket.id
    })

    // called whenever the game state changes (new connection, action, next turn)
    socket.on('state change', (payload) => {
        $("#turn").text(payload.gameState.turn)
        if (payload.gameState.turn != payload.gameState.players[playerId].name) {
            $('#nextTurn').prop('disabled', true)
        } else {
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

            playerSelector.append(`<button class="playerSel">${other.name}</button>`)
        }

        // Event listener for player select buttons (TOOD Change target.textContent for a more secure id)
        $(".playerSel").on("click", (event) => selectPlayer(event.target.textContent))
    }

    function updateTimer(time) { 
        $("#roundTimer").text(time)
    }

    class ActionPayload { 
        constructor(intent, to="") {
            this.id = socket.id
            this.intent = intent
            this.to = to
        }
    }

    $("input[name='action']").change(function() {
        const intention = $(this).attr('id')
        if (intention == "assassinate" || intention == "steal") {
            $("#intention").text(intention)
            $("#playerSelector").css("display","block")
        } else {
            console.log('NO')
            $("#playerSelector").css("display","none")
        }
    })
    
    //TODO remove this later
    $("#startGame").on("click", function() {
        socket.emit('start game')
    })

    $("#nextTurn").on("click", function() {
        const intention = $("input[name='action']:checked").attr("id")
        socket.emit('action', new ActionPayload(intention))
    })

    //choose a card to lose
    function selectCardToLose(button) {
        $('#cardSelect').css("display", "none")
        cardLost = button.value.split(" ")[2]
        socket.emit('cardLost', playerId, cardLost)
    }
}