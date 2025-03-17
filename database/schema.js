db.createCollection("users", {
	validator: {
		$jsonSchema: {
			bsonType: "object",
			required: ["username", "email", "password", "books"],
			properties: {
				username: {
					bsonType: "string",
					description: "Unique username for login",
				},
				email: {
					bsonType: "string",
					description: "User's email address",
				},
				password: {
					bsonType: "string",
					description: "Hashed password for authentication",
				},
				books: {
					bsonType: "array",
					description: "Array of books associated with the user",
					items: {
						bsonType: "object",
						required: ["bookName", "category"],
						properties: {
							bookName: {
								bsonType: "string",
								description: "Name of the book",
							},
							coverLink: {
								bsonType: "string",
								description: "Link to the book cover image",
							},
							description: {
								bsonType: "string",
								description: "Description of the book",
							},
							subject: {
								bsonType: "string",
								description: "Subject or genre of the book",
							},
							category: {
								bsonType: "string",
								enum: ["wants to read", "currently reading", "dropped"],
								description: "Category of the book",
							},
						},
					},
				},
			},
		},
	},
	validationLevel: "strict", // Enforces validation on all inserts and updates
	validationAction: "error", // Rejects documents that don't match the schema
});
