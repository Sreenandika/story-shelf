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
	}
}
module.exports = {
	addUser,
	addBook,
};
