
window.onload = () => {
    var socket = io()
    
    var playerId = ""
    socket.on('connect',  () => {
        playerId = socket.id
    })

    // called whenever the game state changes (new connection, action)
    socket.on('state change', (payload) => {
        updateOtherPlayersView(payload)
        updatePlayerStatus(payload.gameState.players[playerId])
    })
    
    // called when the player bitconnects to the game
    socket.on('self connection', (p) => {
        updatePlayerStatus(p)
    })

    // Receive timer update (regularly updated)
    socket.on('timer', (time) => {
        updateTimer(time)
    })

    //Updates the 'player status' 
    function updatePlayerStatus(p) {
        $("#playerName").text(p.name)
        $("#pCoins").text(p.coins)
        $("#pCard1Name").text(p.firstCard)
        $("#pCard1Status").text(p.firstCardStatus)
        $("#pCard2Name").text(p.secondCard)
        $("#pCard1Status").text(p.secondCardStatus)
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
            otherSection.append(`<p>Name: ${other.name} 
                Card1: ${other.firstCard}, 
                StatusCard1: ${other.firstCardStatus}; 
                Card2: ${other.secondCard} 
                StatusCard2: ${other.secondCardStatus}; 
                Coins: ${other.coins}</p>`)

            playerSelector.append(`<button class="playerSel">${other.name}</button>`)
        }

        // Event listener for player select buttons
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
        socket.emit('action', new ActionPayload("coup"))
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

    //Declares the intention (String)
    function declareIntention(intention) {
        if ($("#playerSelector").css("display") === "block") {
            $("#playerSelector").css("display","none")
        } else {
            $("#playerSelector").css("display","block")
        }
        $("#intention").text(intention)
    }

    //choose a player (steal, assassinate)
    function selectPlayer(name) {
        $("#playerSelector").css("display","none")
        socket.emit('action', 
            new ActionPayload($("#intention").text(), name))
    }
}