require("dotenv").config();
const { createApp } = require("./app");
const { createStore } = require("./store");

const port = process.env.PORT || 4000;
const app = createApp(createStore(), { apiKey: process.env.API_KEY });

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
