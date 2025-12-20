"""
Semantic search service using sentence transformers.
Provides intelligent file search based on meaning rather than exact keyword matching.
"""
from __future__ import annotations

import numpy as np
from typing import List, Dict, Tuple, TYPE_CHECKING, Any

if TYPE_CHECKING:
    from sentence_transformers import SentenceTransformer

class SemanticSearch:
    """
    Semantic search using MiniLM-L3-v2 model for generating embeddings.
    """

    @staticmethod
    def generate_embedding(model: SentenceTransformer, text: str) -> List[float]:
        """
        Generate an embedding vector for the given text.

        Args:
            model: The sentence transformer model
            text: Text to embed

        Returns:
            Embedding vector as a list of floats
        """
        embedding = model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score between 0 and 1
        """
        v1 = np.array(vec1)
        v2 = np.array(vec2)

        dot_product = np.dot(v1, v2)
        norm_v1 = np.linalg.norm(v1)
        norm_v2 = np.linalg.norm(v2)

        if norm_v1 == 0 or norm_v2 == 0:
            return 0.0

        return float(dot_product / (norm_v1 * norm_v2))

    @staticmethod
    def search_files(
        model: SentenceTransformer,
        query: str,
        files: List[Dict],
        threshold: float = 0.3,
        top_k: int = 10
    ) -> List[Dict]:
        """
        Search files semantically based on query.

        Args:
            model: The sentence transformer model
            query: Search query
            files: List of files with 'id', 'name', and optionally 'description'
            threshold: Minimum similarity threshold (0-1)
            top_k: Maximum number of results to return

        Returns:
            List of matching files with similarity scores
        """
        if not files:
            return []

        # Generate query embedding
        query_embedding = SemanticSearch.generate_embedding(model, query)

        # Calculate similarities
        results = []
        try:
            for file in files:
                # Combine filename and description for better matching
                text = file.get("name", "")
                if file.get("description"):
                    text += " " + file["description"]

                # Generate file embedding
                try:
                    file_embedding = SemanticSearch.generate_embedding(model, text)
                except Exception as e:
                    print(f"Error generating embedding for file {file.get('name')}: {e}")
                    continue

                # Calculate similarity
                try:
                    similarity = SemanticSearch.cosine_similarity(query_embedding, file_embedding)
                except Exception as e:
                    print(f"Error calculating similarity for file {file.get('name')}: {e}")
                    continue

                if similarity >= threshold:
                    results.append({
                        "file_id": file.get("id"),
                        "name": file.get("name"),
                        "similarity": similarity,
                        "relevance_score": similarity  # Alias for clarity
                    })

            # Sort by similarity (descending) and limit to top_k
            results.sort(key=lambda x: x["similarity"], reverse=True)
            return results[:top_k]
            
        except Exception as e:
            print(f"Error in search_files: {e}")
            import traceback
            traceback.print_exc()
            return []

    @staticmethod
    def generate_file_tags(model: SentenceTransformer, filename: str, content_preview: str = "") -> List[str]:
        """
        Generate relevant tags for a file based on its name and content.

        Args:
            model: The sentence transformer model
            filename: Name of the file
            content_preview: Preview of file content (optional)

        Returns:
            List of suggested tags
        """
        # Predefined tag categories
        tag_categories = {
            "work": ["work", "business", "project", "meeting", "presentation", "report"],
            "personal": ["personal", "family", "vacation", "photo", "memory"],
            "finance": ["invoice", "receipt", "tax", "payment", "budget", "financial"],
            "legal": ["contract", "agreement", "legal", "terms", "policy"],
            "education": ["course", "lecture", "study", "notes", "assignment", "homework"],
            "creative": ["design", "art", "music", "video", "creative", "draft"],
            "technical": ["code", "technical", "documentation", "manual", "guide", "api"]
        }

        # Combine filename and content
        text = filename
        if content_preview:
            text += " " + content_preview

        text_embedding = SemanticSearch.generate_embedding(model, text)

        # Find most relevant tags
        relevant_tags = []
        for category, tags in tag_categories.items():
            category_text = " ".join(tags)
            category_embedding = SemanticSearch.generate_embedding(model, category_text)

            similarity = SemanticSearch.cosine_similarity(text_embedding, category_embedding)

            if similarity > 0.4:  # Threshold for tag relevance
                relevant_tags.append({
                    "category": category,
                    "similarity": similarity
                })

        # Sort by similarity and return top 3 categories
        relevant_tags.sort(key=lambda x: x["similarity"], reverse=True)
        return [tag["category"] for tag in relevant_tags[:3]]
