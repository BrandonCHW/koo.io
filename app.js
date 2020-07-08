const express = require('express')
const app = express()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

const PORT = 3000

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/client/main.html")
});

app.get("*", (req,res) => {
    res.send("Is this the real life? Is this just fantasy? (ERROR PAGE)")
});

io.on('connection', (socket) => {
    console.log("new socket connection")
    socket.on('disconnect', () => {
        console.log("socket disconnected")
    })
});

http.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
});