
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

    var income = $("#income").on("click", function() {
        socket.emit('action', new ActionPayload("income"))
    })
    var foreign = $("#foreign").on("click", function() {
        socket.emit('action', new ActionPayload("foreign"))
    })
    var coup = $("#coup").on("click", function() {
        declareIntention("coup")
        // socket.emit('action', new ActionPayload("coup"))
    })
    var tax = $("#tax").on("click", function() {
        socket.emit('action', new ActionPayload("tax"))
    })
    var steal = $("#steal").on("click", function() {
        declareIntention("steal")
    })
    var assassinate = $("#assassinate").on("click", function() {
        declareIntention("assassinate")
    })
    var exchange = $("#exchange").on("click", function() {
    })

    //TODO remove this later
    var startGame = $("#startGame").on("click", function() {
        socket.emit('start game')
    })

    var nextTurn = $("#nextTurn").on("click", function() {
        socket.emit('next turn')
    })

    //Declares the intention (String)
    function declareIntention(intention) {
        if ($("#playerSelector").css("display") === "block") {
            $("#playerSelector").css("display","none")
        } else {
            $("#playerSelector").css("display","block")
        }
        $("#intention").text(intention)
    }

    //choose a player (steal, assassinate, Coup)
    function selectPlayer(name) {
        $("#playerSelector").css("display","none")
        socket.emit('action', 
            new ActionPayload($("#intention").text(), name))
    }

    //choose a card to lose
    function selectCardToLose(button) {
        $('#cardSelect').css("display", "none")
        cardLost = button.value.split(" ")[2]
        socket.emit('cardLost', playerId, cardLost)
    }
}