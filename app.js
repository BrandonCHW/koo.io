const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/client/main.html")
});

const SOCKET_LIST = {};

io.on('connection', (socket) => {
    socket.on('action payload', (obj) => {
        console.log(obj)
    })
    // console.log("new socket connection")
    socket.on('disconnect', () => {
        // console.log("socket disconnected")
    })
});

app.get("*", (req,res) => {
    res.send("Error")
});

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});

setInterval(function() {
    // console.log("hello")
    
},1000)