"""Tests for the Permission model."""

from app.models.permission import Permission


def test_permission_creation():
    """Test permission creation"""
    assert Permission.__tablename__ == "permissions"


def test_permission_attributes():
    """Test permission attributes"""
    columns = [c.name for c in Permission.__table__.columns]
    assert columns == ["name"]
