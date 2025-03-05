import PouchDB from "pouchdb";

const db = new PouchDB("shifts_db");

// Helper function to safely update a document
export const updateDocument = async (id, updateFn) => {
  try {
    // Fetch the existing document
    const doc = await db.get(id);
    // Apply updates to the document
    const updatedDoc = updateFn(doc);
    // Save the updated document
    await db.put(updatedDoc);
  } catch (error) {
    if (error.name === "not_found") {
      // If the document doesn't exist, create it
      const newDoc = updateFn({ _id: id });
      await db.put(newDoc);
    } else {
      throw error;
    }
  }
};

export default db;
