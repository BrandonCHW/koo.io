const express = require('express');
const app = express();
const PORT = 2000;

app.get("/", (req,res) => {
    res.sendFile(__dirname + "/views/main.html");
});

app.get("*", (req,res) => {
    res.send("Is this the real life? Is this just fantasy? (ERROR PAGE)");
});

app.listen(PORT, () => {
    console.log(`Koo.io server started on port ${PORT}`);
});