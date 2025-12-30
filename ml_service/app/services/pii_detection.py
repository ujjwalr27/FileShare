"""
Lightweight PII (Personally Identifiable Information) Detection Service.
Uses regex patterns only - no spaCy to keep memory under 512MB on free tier.
"""
from __future__ import annotations

import re
from typing import List, Dict, Any


class PIIDetector:
    """
    Detects personally identifiable information in text using regex patterns only.
    Memory-efficient version for Render free tier (512MB limit).
    """

    # Regex patterns for common PII
    PATTERNS = {
        "email": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "phone": r'\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b',
        "ssn": r'\b(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b',
        "credit_card": r'\b(?:\d{4}[-\s]?){3}\d{4}\b',
        "ip_address": r'\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b',
        "date_of_birth": r'\b(?:0[1-9]|1[0-2])[-/](?:0[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b'
    }
    
    # Simple name detection patterns (common name patterns, not perfect but lightweight)
    NAME_PATTERNS = {
        "person_name": r'\b[A-Z][a-z]+\s+[A-Z][a-z]+\b',  # Simple two-word capitalized names
    }

    @staticmethod
    def detect_pii_lightweight(text: str) -> Dict:
        """
        Detect PII in the given text using regex only (no spaCy).
        Memory-efficient version.

        Args:
            text: Text to analyze

        Returns:
            Dict with PII findings and risk assessment
        """
        findings = {
            "has_pii": False,
            "risk_level": "low",
            "entities": [],
            "patterns": [],
            "summary": {}
        }

        if not text or not text.strip():
            return findings

        # Pattern-based detection for structured PII
        for pattern_name, pattern in PIIDetector.PATTERNS.items():
            matches = re.finditer(pattern, text)
            for match in matches:
                findings["patterns"].append({
                    "type": pattern_name,
                    "value": match.group(),
                    "start": match.start(),
                    "end": match.end()
                })

        # Simple name detection (not as accurate as spaCy but very lightweight)
        name_matches = re.finditer(PIIDetector.NAME_PATTERNS["person_name"], text)
        person_names = set()
        for match in name_matches:
            name = match.group()
            # Filter out common false positives
            common_phrases = {'The', 'This', 'That', 'These', 'Those', 'What', 'When', 
                            'Where', 'Which', 'While', 'With', 'From', 'About'}
            first_word = name.split()[0]
            if first_word not in common_phrases:
                person_names.add(name)
                findings["entities"].append({
                    "type": "person_name",
                    "value": name,
                    "start": match.start(),
                    "end": match.end()
                })

        # Calculate summary and risk level
        findings["summary"] = {
            "person_names": len(person_names),
            "organizations": 0,  # Would need NER for accurate detection
            "locations": 0,  # Would need NER for accurate detection
            "emails": len([p for p in findings["patterns"] if p["type"] == "email"]),
            "phones": len([p for p in findings["patterns"] if p["type"] == "phone"]),
            "ssns": len([p for p in findings["patterns"] if p["type"] == "ssn"]),
            "credit_cards": len([p for p in findings["patterns"] if p["type"] == "credit_card"]),
            "ip_addresses": len([p for p in findings["patterns"] if p["type"] == "ip_address"])
        }

        # Determine if PII exists and risk level
        total_pii_count = sum(findings["summary"].values())
        findings["has_pii"] = total_pii_count > 0

        if findings["summary"]["ssns"] > 0 or findings["summary"]["credit_cards"] > 0:
            findings["risk_level"] = "high"
        elif findings["summary"]["emails"] > 2 or findings["summary"]["phones"] > 2 or len(person_names) > 3:
            findings["risk_level"] = "medium"
        elif total_pii_count > 0:
            findings["risk_level"] = "low"

        return findings

    @staticmethod
    def detect_pii(nlp: Any, text: str) -> Dict:
        """
        Wrapper that uses lightweight detection (ignores nlp parameter).
        This maintains API compatibility while using regex-only detection.
        """
        return PIIDetector.detect_pii_lightweight(text)

    @staticmethod
    def redact_pii(text: str, findings: Dict, redaction_char: str = "*") -> str:
        """
        Redact PII from text based on detection findings.

        Args:
            text: Original text
            findings: PII detection findings
            redaction_char: Character to use for redaction

        Returns:
            Redacted text
        """
        if not findings["has_pii"]:
            return text

        # Collect all positions to redact
        redactions = []

        for entity in findings["entities"]:
            if entity["type"] in ["person_name", "organization"]:
                redactions.append((entity["start"], entity["end"]))

        for pattern in findings["patterns"]:
            redactions.append((pattern["start"], pattern["end"]))

        # Sort by start position (descending) to avoid position shifts
        redactions.sort(key=lambda x: x[0], reverse=True)

        # Apply redactions
        redacted_text = text
        for start, end in redactions:
            length = end - start
            replacement = redaction_char * length
            redacted_text = redacted_text[:start] + replacement + redacted_text[end:]

        return redacted_text

    @staticmethod
    def assess_file_sensitivity(findings: Dict) -> Dict:
        """
        Assess the sensitivity level of a file based on PII findings.

        Args:
            findings: PII detection findings

        Returns:
            Sensitivity assessment
        """
        return {
            "is_sensitive": findings["has_pii"],
            "risk_level": findings["risk_level"],
            "should_encrypt": findings["risk_level"] in ["high", "medium"],
            "requires_access_control": findings["has_pii"],
            "recommendations": PIIDetector._generate_recommendations(findings)
        }

    @staticmethod
    def _generate_recommendations(findings: Dict) -> List[str]:
        """Generate security recommendations based on PII findings."""
        recommendations = []

        if findings["summary"].get("ssns", 0) > 0:
            recommendations.append("File contains SSNs - enable encryption and restrict access")

        if findings["summary"].get("credit_cards", 0) > 0:
            recommendations.append("File contains credit card numbers - apply PCI-DSS controls")

        if findings["risk_level"] == "high":
            recommendations.append("High PII risk - consider data masking for non-essential users")

        if findings["summary"].get("emails", 0) > 5:
            recommendations.append("Multiple email addresses detected - verify GDPR compliance")

        if not recommendations:
            recommendations.append("Basic access controls recommended")

        return recommendations
