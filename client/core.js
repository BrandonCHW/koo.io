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
    var playerCoins = 0
    socket.on('connect',  () => {
        playerId = socket.id
    })

    // called whenever the game state changes (new connection, action, next turn)
    socket.on('state change', (payload) => {
        updateCurrentMove(`Waiting on <span class="turn"></span> to choose a move...`)
        if (payload.gameState.turn != payload.gameState.players[playerId].name) {
            $(".turn").text(payload.gameState.turn)
            $('#nextTurn').prop('disabled', true)
        } else {
            $(".turn").text(payload.gameState.turn + " (YOU)")
            $('#nextTurn').prop('disabled', false)
        }
        clearReactionTab()
        updateAllPlayersDisplay(payload)
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

    socket.on('action broadcast', (actionPayload) => {
        updateCurrentMove(actionPayload.displayText)
        //The player who initiated the action can't challenge or block himself/herself
        if(playerId != actionPayload.actorId) {
            clearReactionTab()
            $('#reaction').css("display", "block")
            $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="confirm">Confirm</button>`)

            //If the action is take foreign aid, can be blocked by claiming duke
            if (actionPayload.intent == "foreign") {
                $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="block-duke">Claim to be Duke</button>`)
            }
            //If the action is other than income, coup or foreign, can challenge
            else if (actionPayload.intent != "income" && actionPayload.intent != "coup") {
                $('#reaction').append(`<button class="reactionSel btn btn-secondary" id="challenge-reaction" value="challenge">Challenge</button>`)
            }

            //If the action is assassinate and the player is the target, can claim contessa
            if (actionPayload.intent == "assassinate" && playerId === actionPayload.victimId) {
                $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="block-contessa">Claim to be Contessa</button>`)
            }
            //If the action is steal and the player is the target, can claim captain or ambassador
            else if (actionPayload.intent == "steal" && playerId === actionPayload.victimId) {
                $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="block-captain">Claim to be Captain</button>`)
                $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="block-ambassador">Claim to be Ambassador</button>`)
            }
            $(".reactionSel").on("click", (event) => handleActionChallengeResponse('currentActionResponse', event.target))
        }
    })

    socket.on('block broadcast', (actionPayload) => {
        updateCurrentMove(actionPayload.displayText)
        clearReactionTab()
        //The player who claimed a role to block an action can't challenge himself/herself
        if(playerId != actionPayload.actorId) {
            $('#reaction').css("display", "block")
            $('#reaction').append(`<button class="reactionSel btn btn-secondary" value="confirm">Confirm</button>`)
            $('#reaction').append(`<button class="reactionSel btn btn-secondary" id="challenge-reaction" value="challenge">Challenge</button>`)
            $(".reactionSel").on("click", (event) => handleActionChallengeResponse('blockResponse', event.target))
        }
    })

    socket.on('challenge', (actionPayload) => {
        //Remove all challenge buttons from players still deciding as you cannot challenge the same player more than once
        $('#challenge-reaction').remove()
        //Update everyone on who is challenging who
        updateCurrentMove(actionPayload.displayText)
        //If you are the person who was challenged, choose a card to reveal
        if (actionPayload.victimId == playerId) {
            var challengedIntent = actionPayload.intent.split("-")[1]
            switch(challengedIntent) {
                case "duke":
                case "tax":
                    expectedCardType = "Duke"
                    break
                case "captain":
                case "steal":
                    expectedCardType = "Captain"
                    break
                case "assassinate":
                    expectedCardType = "Assassin"
                    break
                case "ambassador":
                case "exchange":
                    expectedCardType = "Ambassador"
                    break
                case "contessa":
                    expectedCardType = "Contessa"
                    break 
                default:
                    break
            }
            updateCardSelectMessage("Choose a card to prove your claim or to lose if you've been caught lying!")
            $(".cardSelectBtn").on("click", (event) => {
                $('.cardSelect').css("display", "none")
                $(".cardSelectBtn").off("click")
                socket.emit('challengeVerification', playerId, actionPayload.actorId, event.target.value, expectedCardType)
            })
        }
    })

    socket.on('loseCard', (message) => {
        updateCardSelectMessage(message)
        // TODO: Change target.textContent for a more secure id
        $(".cardSelectBtn").on("click", (event) => {
            $('.cardSelect').css("display", "none")
            $(".cardSelectBtn").off("click")
            socket.emit('cardLost', playerId, event.target.value)
        })
    })

    socket.on('exchange', (id, selection) => {
        if (id === playerId) {
            $("#cardExchange").css("display","block")
            var section = $("#cardExchange > div")
            section.empty()
            for(var i = 0; i < selection.length; i++) {
                section.append(`<label for="select-card-${i}">${selection[i]}</label>
                                <input type="checkbox" id="select-card-${i}" name="cardsToKeep">`)
            }
            section.append("<button id='executeExchange' disabled>Execute Exchange</button>")
            var livesLeft = selection.length - 2; //ghetto
            $("#exchangeCardSelect input:checkbox").click(function(){
                var boxesChecked = $("#exchangeCardSelect input:checkbox:checked").length
                if (boxesChecked > livesLeft) {
                  return false;
                }
                if (boxesChecked == livesLeft) {
                    $('#executeExchange').prop('disabled', false)
                } else if (boxesChecked != livesLeft) {
                    $('#executeExchange').prop('disabled', true)
                }
            });
            
            // TEMPORARY SUBMIT BUTTON FOR EXCHANGE
            $("#executeExchange").on('click', function() {
                var selectedCards = []
                var unselectedCards = []
                $.each($("input[name='cardsToKeep']:checked"), function() {
                    var cardName = $(`label[for='${$(this).attr("id")}']`).text()
                    selectedCards.push(cardName)
                })
                $.each($("input[name='cardsToKeep']:not(:checked)"), function() {
                    var cardName = $(`label[for='${$(this).attr("id")}']`).text()
                    unselectedCards.push(cardName)
                })
                
                socket.emit('execute exchange', selectedCards, unselectedCards)

                $("#cardExchange").css("display","none")
            })  
        }
    })

    //TODO remove this later
    $("#startGame").on("click", function() {
        $("#startGame").remove()
        socket.emit('start game')
    })

    $("#findLobby").on("click", function() {
        var playerName = document.getElementById('playerNameInput').value
        $("#login_view").css("display", "none")
        $("#game_view").css("display", "block")
        socket.emit('find lobby', playerName)
    })

    // PASS THE TURN TO THE NEXT PLAYER
    $("#actions-list").on("click", ".action", function(event) {
        var actionType = event.target.id
        if (actionType == "coup" || actionType == "steal" || actionType == "assassinate") {
            //Make the display of every other player available to be clicked
            $(".otherPlayerDisplay").prop("disabled", false)
            $(".otherPlayerDisplay").on("click", function(event) {
                clearVictimSelection()
                socket.emit('action', new ActionPayload(actionType, event.currentTarget.value))
            })
            //Disable all actions and make the cancel button accessible
            $(".action").prop('disabled', true)
            $("#cancelAction").css("display", "block")
            $("#cancelAction").prop('disabled', false)
            $("#cancelAction").on("click", function(event) {
                clearVictimSelection()
                limitPlayerActions()
            })
        } else{
            socket.emit('action', new ActionPayload(actionType, ""))
        }
    })

    //Updates the 'player status' 
    function updatePlayerStatus(p) {
        playerCoins = p.coins
        $("#playerName").text(p.name)
        $("#pCoins").text(p.coins)
        $("#pCard1Name").text(p.firstCard)
        $("#pCard1Alive").text(p.firstCardAlive)
        $("#pCard2Name").text(p.secondCard)
        $("#pCard2Alive").text(p.secondCardAlive)
        limitPlayerActions()
    }

    //Disable buttons of actions which are unavailable (not enough coins, must coup)
    function limitPlayerActions() {
        $(".action").prop('disabled', false)
        if (playerCoins >= 10) {
            $(".action").not("#coup").prop('disabled', true)
        } else {
            if (playerCoins < 7)
                $("#coup").prop('disabled', true)
            if (playerCoins < 3)
                $("#assassinate").prop('disabled', true)
        }
    }
    
    //Updates the circular display with all the players
    function updateAllPlayersDisplay(payload) {
        var playersInfo = payload.gameState.players
        var playersDisplay = $("#allPlayers")
        $(".player_container").remove()
        const rotationAngle = 360 / Object.keys(playersInfo).length
        var currentAngle = 0
        for(const id in playersInfo) {
            const player = playersInfo[id]

            //If the display holds information of other players, mark it with the "otherPlayerDisplay" class
            var otherPlayerDisplay = ""
            if(id != playerId) {
                otherPlayerDisplay = "otherPlayerDisplay"
            }

            playersDisplay.append(
                `<div class="player_container" style="transform: translate(-50%, -50%) rotate(${currentAngle}deg);">
                    <button value="${player.name}" class="moon ${otherPlayerDisplay}" disabled="true" style="transform: rotate(-${currentAngle}deg);">
                        <div class="card-header">
                            <h5>Name: ${player.name}</h5>
                        </div>
                        <div class="card-body">
                            <div>Card1: ${player.firstCard} (${player.firstCardAlive})</div>
                            <div>Card2: ${player.secondCard} (${player.secondCardAlive})</div>
                            <div>Coins: ${player.coins}</div>
                        </div>
                    </button>
                </div>`
            )
            currentAngle += rotationAngle
        }
    }
    
    function updateTimer(time) { 
        $("#roundTimer").text(time)
    }

    function updateCurrentMove(message) {
        var display = $('#currentMove')
        display.empty()
        display.append(message)
    }

    function updateCardSelectMessage(message) {
        $("#cardSelectMessage").text(message)
        $('.cardSelect').css("display", "block")
    }

    function clearReactionTab() {
        $('#reaction').empty()
        $('#reaction').css("display: none")
    }

    function clearVictimSelection() {
        $(".otherPlayerDisplay").prop("disabled", true)
        $(".otherPlayerDisplay").off("click")
        $("#cancelAction").off("click")
        $("#cancelAction").css("display", "none")
        $("#cancelAction").prop('disabled', true)
    }

    function handleActionChallengeResponse(eventName, button) {
        clearReactionTab()
        var buttonValue = button.value.split("-")
        var response = buttonValue[0]
        var blockRole = buttonValue[1]
        socket.emit(eventName, playerId, response, blockRole)
    }
}
