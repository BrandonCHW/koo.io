const MAX_PLAYERS_PER_ROOM = 4

LobbyManager = {    
    findEmptyRoom: function(io) {
        var allRooms = io.sockets.adapter.rooms

        // Each new connection generates a new room so we have to filter for game rooms 
        var gameRoomKeys = Object.keys(allRooms).filter(key => {
            return key.startsWith('room') && allRooms[key].length < MAX_PLAYERS_PER_ROOM
        })

        if (gameRoomKeys.length != 0) {

            return gameRoomKeys[Math.floor(Math.random()*gameRoomKeys.length)]
        }

        return this.createNewRoom()
    },
    
    createNewRoom: function() {
        //TODO generate real uid\
        var roomId = Math.floor(Math.random()*100000)
        var newRoom = `room${roomId}`

        return newRoom
    },

    leaveCurrentRooms: function(socket) {
        Object.keys(socket.rooms)
            .filter(roomId => roomId !== socket.id)
            .forEach(id => socket.leave(id));
    }
}

module.exports = LobbyManager