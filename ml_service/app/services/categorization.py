"""
File categorization service using rule-based approach.
Categorizes files based on MIME types and extensions without requiring ML models.
"""

from typing import Dict, List

class FileCategorizer:
    """
    Categorizes files based on their MIME types and extensions.
    Uses a rule-based approach for efficiency.
    """

    # Category mappings
    CATEGORIES = {
        "documents": {
            "mime_types": [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                "text/plain",
                "text/rtf",
                "application/rtf"
            ],
            "extensions": [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".rtf", ".odt", ".ods", ".odp"]
        },
        "images": {
            "mime_types": [
                "image/jpeg",
                "image/png",
                "image/gif",
                "image/webp",
                "image/svg+xml",
                "image/bmp",
                "image/tiff"
            ],
            "extensions": [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".tiff", ".tif", ".ico"]
        },
        "videos": {
            "mime_types": [
                "video/mp4",
                "video/mpeg",
                "video/quicktime",
                "video/x-msvideo",
                "video/x-matroska",
                "video/webm"
            ],
            "extensions": [".mp4", ".avi", ".mov", ".mkv", ".webm", ".flv", ".wmv", ".m4v"]
        },
        "audio": {
            "mime_types": [
                "audio/mpeg",
                "audio/wav",
                "audio/ogg",
                "audio/webm",
                "audio/aac",
                "audio/flac"
            ],
            "extensions": [".mp3", ".wav", ".ogg", ".webm", ".aac", ".flac", ".m4a", ".wma"]
        },
        "archives": {
            "mime_types": [
                "application/zip",
                "application/x-rar-compressed",
                "application/x-7z-compressed",
                "application/x-tar",
                "application/gzip"
            ],
            "extensions": [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"]
        },
        "code": {
            "mime_types": [
                "text/html",
                "text/css",
                "text/javascript",
                "application/javascript",
                "application/json",
                "application/xml",
                "text/xml"
            ],
            "extensions": [
                ".html", ".htm", ".css", ".js", ".jsx", ".ts", ".tsx",
                ".py", ".java", ".c", ".cpp", ".h", ".hpp", ".cs",
                ".rb", ".php", ".go", ".rs", ".swift", ".kt",
                ".json", ".xml", ".yaml", ".yml", ".sql"
            ]
        },
        "spreadsheets": {
            "mime_types": [
                "application/vnd.ms-excel",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "text/csv"
            ],
            "extensions": [".xls", ".xlsx", ".csv", ".ods"]
        },
        "presentations": {
            "mime_types": [
                "application/vnd.ms-powerpoint",
                "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            ],
            "extensions": [".ppt", ".pptx", ".odp"]
        }
    }

    @staticmethod
    def categorize_file(mime_type: str, extension: str) -> Dict:
        """
        Categorize a file based on its MIME type and extension.

        Args:
            mime_type: The MIME type of the file
            extension: The file extension (including the dot)

        Returns:
            Dict with category, confidence, and tags
        """
        extension = extension.lower() if extension else ""
        mime_type = mime_type.lower() if mime_type else ""

        # Find matching categories
        matching_categories = []

        for category, rules in FileCategorizer.CATEGORIES.items():
            mime_match = mime_type in rules["mime_types"]
            ext_match = extension in rules["extensions"]

            if mime_match or ext_match:
                confidence = 0.9 if mime_match and ext_match else 0.7
                matching_categories.append({
                    "category": category,
                    "confidence": confidence
                })

        # Return primary category or "other"
        if matching_categories:
            # Sort by confidence
            matching_categories.sort(key=lambda x: x["confidence"], reverse=True)
            primary = matching_categories[0]

            return {
                "category": primary["category"],
                "confidence": primary["confidence"],
                "tags": [c["category"] for c in matching_categories],
                "is_sensitive": FileCategorizer._check_sensitivity(mime_type, extension)
            }

        return {
            "category": "other",
            "confidence": 1.0,
            "tags": ["other"],
            "is_sensitive": False
        }

    @staticmethod
    def _check_sensitivity(mime_type: str, extension: str) -> bool:
        """
        Check if a file type might contain sensitive information.
        """
        sensitive_types = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "text/plain",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "text/csv"
        ]

        sensitive_extensions = [
            ".pdf", ".doc", ".docx", ".txt", ".xls", ".xlsx", ".csv"
        ]

        return mime_type in sensitive_types or extension in sensitive_extensions

    @staticmethod
    def categorize_batch(files: List[Dict]) -> List[Dict]:
        """
        Categorize multiple files at once.

        Args:
            files: List of dicts with 'mime_type' and 'extension' keys

        Returns:
            List of categorization results
        """
        results = []
        for file in files:
            result = FileCategorizer.categorize_file(
                file.get("mime_type", ""),
                file.get("extension", "")
            )
            result["file_id"] = file.get("id")
            results.append(result)

        return results
