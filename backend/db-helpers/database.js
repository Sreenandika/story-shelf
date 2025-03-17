const bcrypt = require("bcrypt");

async function addUser(db, email, password) {
	try {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new Error("Invalid email format");
		}
		if (password.length < 8) {
			throw new Error("Password must be at least 8 characters long");
		}
		const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds
		const username = email.split("@")[0];
		const user = {
			username: username,
			email: email,
			password: hashedPassword,
			books: [], // Initialize an empty array for books
		};
		const result = await db.collection("users").insertOne(user);
		if (result.acknowledged) {
			return { success: true, message: "User added successfully" };
		} else {
			return { success: false, message: "Failed to add user" };
		}
	} catch (error) {
		return { success: false, message: error.message };
	}
}
async function addBook(db, username, book) {
	try {
		const users = db.collection("users");
		const result = await users.updateOne(
			{ username: username },
			{ $push: { books: book } }
		);
		if (result.matchedCount > 0) {
			return { success: true, message: "User added successfully" };
		} else {
			return { success: false, message: "Failed to add user" };
		}
	} catch (error) {
		return { success: false, message: error.message };
	} finally {
	}
}

async function getBooks(db, username) {
	try {
		const users = db.collection("users");
		const pipeline = [
			{ $match: { username: username } },
			{ $unwind: "$books" },
			{ $match: { "books.category": "want-to-read" } },
			{ $project: { _id: 0, book: "$books" } },
		];
		const books = await users.aggregate(pipeline).toArray();
		console.log(books);
		return books;
	} catch (error) {
		console.error(`Error retrieving books: ${error}`);
		return [];
	}
}
async function getProfile(db, username) {
	try {
		const users = db.collection("users");
		const user = await users.findOne(
			{ username: username },
			{ projection: { _id: 0, password: 0 } }
		);
		if (user) {
			return user;
		} else {
			throw new Error("User not found");
		}
	} catch (error) {
		console.error(`Error retrieving books: ${error}`);
		return [];
	}
}
async function checkLogin(db, email, password) {
	try {
		const users = db.collection("users");
		const user = await users.findOne({ email: email });
		if (!user) {
			return { success: false, message: "User not found" };
		}
		const passwordMatch = await bcrypt.compare(password, user.password);
		if (passwordMatch) {
			return { success: true, message: "Login successful", user: user };
		} else {
			return { success: false, message: "Invalid password" };
		}
	} catch (error) {
		return { success: false, message: error.message };
	}
}
module.exports = {
	addUser,
	addBook,
	getBooks,
	getProfile,
	checkLogin
};
