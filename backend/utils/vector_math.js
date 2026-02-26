/**
 * vector_math.js
 * Utility functions for cosine similarity and dot product calculations.
 */

/**
 * Computes the dot product of two numeric vectors.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function dotProduct(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same dimensions.");
  }
  return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
}

/**
 * Computes the L2 (Euclidean) magnitude of a vector.
 * @param {number[]} vec
 * @returns {number}
 */
function magnitude(vec) {
  return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
}

/**
 * Computes cosine similarity between two vectors.
 * Returns a value in [-1, 1]; higher means more similar.
 * @param {number[]} vecA
 * @param {number[]} vecB
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  const magA = magnitude(vecA);
  const magB = magnitude(vecB);
  if (magA === 0 || magB === 0) return 0;
  return dotProduct(vecA, vecB) / (magA * magB);
}

/**
 * Finds the most relevant document chunks for a query vector.
 * @param {number[]} queryVector - Embedding of the user query.
 * @param {Array<{id, title, chunkIndex, content, vector}>} vectorStore - All stored chunks.
 * @param {number} topK - Number of top results to return.
 * @param {number} threshold - Minimum similarity score to include.
 * @returns {Array} Top K chunks with similarity scores.
 */
function findMostRelevant(queryVector, vectorStore, topK = 3, threshold = 0.5) {
  const scored = vectorStore.map((chunk) => ({
    ...chunk,
    score: cosineSimilarity(queryVector, chunk.vector),
  }));

  const filtered = scored.filter((chunk) => chunk.score >= threshold);
  filtered.sort((a, b) => b.score - a.score);

  return filtered.slice(0, topK);
}

module.exports = { cosineSimilarity, dotProduct, magnitude, findMostRelevant };
