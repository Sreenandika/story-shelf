const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const port = 3000;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const connect = require("./db-helpers/const");
const funcs = require("./db-helpers/database");

const { MongoClient, ServerApiVersion, Db } = require("mongodb");
const uri = connect.uri;
const client = new MongoClient(uri, {
	serverApi: {
		version: ServerApiVersion.v1,
		strict: true,
		deprecationErrors: true,
	},
});

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/login.html"));
});
app.get("/signup", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/signup.html"));
});

app.get("/:username/home", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/home.html"));
});

app.post("/signup", async (req, res) => {
	await client.connect();
	const database = client.db("story_shelf");
	console.log(req.body);
	const { email, password } = req.body;
	const result = await funcs.addUser(database, email, password);
	res.send(result);
});

app.post("/addBook", async (req, res) => {
	await client.connect();
	const database = client.db("story_shelf");
	const book = req.body.book;
	const username = req.body.username;
	const result = await funcs.addBook(database,username,book);
	res.send(result);	
});
app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
