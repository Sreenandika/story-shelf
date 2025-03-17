const express = require("express");
const path = require("path");
const app = express();
const bodyParser = require("body-parser");
const { TfIdf } = require("natural");
const port = 3000;
const axios = require("axios");
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
app.get("/:username/profile", (req, res) => {
	res.sendFile(path.join(__dirname, "../public/profile.html"));
});

function calculateCosineSimilarity(vecA, vecB) {
	const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
	const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
	const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
	return dotProduct / (magnitudeA * magnitudeB);
}

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
	const result = await funcs.addBook(database, username, book);
	res.send(result);
});

app.post("/recommendations", async (req, res) => {
	const { userId } = req.body;
	if (!userId) {
		return res.status(400).json({ error: "User ID is required" });
	}
	try {
		await client.connect();
		const database = client.db("story_shelf");
		const likedBooks = await funcs.getBooks(database, userId);
		console.log(likedBooks);
		const likedBookIds = likedBooks.map((book) => book.book.bookId);
		console.log(likedBookIds);
		if (likedBookIds.length === 0) {
			return res
				.status(200)
				.json({ recommendations: [], message: "User has no liked books." });
		}
		const likedBookFeatures = [];
		for (const bookId of likedBookIds) {
			const response = await axios.get(
				`https://www.googleapis.com/books/v1/volumes/${bookId}`
			);
			const bookInfo = response.data.volumeInfo;
			likedBookFeatures.push({
				title: bookInfo.title || "",
				authors: bookInfo.authors || [],
				categories: bookInfo.categories || [],
				description: bookInfo.description || "",
			});
		}

		// TF-IDF and User Profile
		const tfidf = new TfIdf();
		const descriptions = likedBookFeatures.map((book) => book.description);
		descriptions.forEach((description) => tfidf.addDocument(description));
		const userProfile = tfidf
			.tfidfs(descriptions)
			.flat()
			.reduce((acc, tfidfValue, index) => {
				acc[index] = (acc[index] || 0) + tfidfValue;
				return acc;
			}, []);

		// Candidate Book Retrieval (Example: Search by authors)
		let candidateBookIds = new Set();
		for (const book of likedBookFeatures) {
			for (const authors of book.authors) {
				const searchResponse = await axios.get(
					`https://www.googleapis.com/books/v1/volumes?q=author:${authors}`
				);
				if (searchResponse.data.items) {
					searchResponse.data.items.forEach((item) =>
						candidateBookIds.add(item.id)
					);
				}
			}
		}

		candidateBookIds = [...candidateBookIds];

		const recommendations = [];
		for (const candidateBookId of candidateBookIds) {
			const response = await axios.get(
				`https://www.googleapis.com/books/v1/volumes/${candidateBookId}`
			);
			const candidateBookInfo = response.data.volumeInfo;
			if (candidateBookInfo.description) {
				const candidateVector = tfidf.tfidfs([candidateBookInfo.description]);
				console.log(candidateVector);
				if (candidateVector.length > 0) {
					const similarity = calculateCosineSimilarity(
						userProfile,
						candidateVector
					);
					recommendations.push({ bookId: candidateBookId, similarity });
				}
			}
		}

		recommendations.sort((a, b) => b.similarity - a.similarity);
		const recommendedBookIds = recommendations
			.filter((rec) => !likedBookIds.includes(rec.bookId))
			.slice(0, 20)
			.map((rec) => rec.bookId);

		res.json({ recommendations: recommendedBookIds });
	} catch (err) {
		console.error("Error generating recommendations:", err);
		res.status(500).json({ error: "Internal server error" });
	}
});

app.post("/profile",async(req,res)=>{
	const username = req.body.username;
	if (!username) {
		return res.status(400).json({ error: "User ID is required" });
	}
	try {
		await client.connect();
		const database = client.db("story_shelf");
		const profile = await funcs.getProfile(database, username);
		res.send(profile);
	}
	catch(error){
		res.send(error);
		
	}
});
app.post("/login", async (req, res) => {
	const { email, password } = req.body;
	if (!email || !password) {
		return res.status(400).json({ error: "Email and password are required" });
	}
	try {
		await client.connect();
		const database = client.db("story_shelf");
		const user = await funcs.checkLogin(database, email, password);
		if (user.success) {
			res.json({ message: "Login successful", user });
		} else {
			res.status(401).json({ error: "Invalid email or password" });
		}
	} catch (error) {
		console.error("Error during login:", error);
		res.status(500).json({ error: "Internal server error" });
	}
});


app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
