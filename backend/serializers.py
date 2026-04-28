from datetime import datetime
from typing import Any, Dict, List, Union
from bson import ObjectId

def serialize_doc(doc: Any) -> Dict[str, Any]:
    """
    Convert a single MongoDB document into a JSON-safe dictionary.
    Handles ObjectIds (converts to string) and datetimes (ISO format).
    """
    if doc is None:
        return {}
        
    # If it's already a dict, we process it
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                result[key] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = serialize_list(value)
            else:
                result[key] = value
        return result
    
    return doc

def serialize_list(docs: List[Any]) -> List[Any]:
    """Convert a list of MongoDB documents into JSON-safe dictionaries."""
    if not docs:
        return []
    return [serialize_doc(doc) if isinstance(doc, dict) else doc for doc in docs]

def clean_doc(doc: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience helper: serializes the doc AND removes the '_id' field entirely.
    Use this when the frontend only needs the public 'id' field.
    """
    data = serialize_doc(doc)
    data.pop("_id", None)
    return data

def clean_list(docs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Clean a list of documents by removing '_id' from each."""
    return [clean_doc(doc) for doc in docs]
