const express = require('express');
const app = express();
const PORT = 2000;

app.listen(PORT, () => {
    console.log(`Koo.io server started on port ${PORT}`);
});