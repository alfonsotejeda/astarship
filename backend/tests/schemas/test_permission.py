"""Tests for the Permission schema."""

import pytest
from pydantic import ValidationError

from app.schemas.permission import PermissionCreate


def test_permission_create_invalid():
    """Test creating a permission with invalid data"""
    with pytest.raises(ValidationError):
        PermissionCreate(name="")


def test_permission_create_valid():
    """Test creating a permission with valid data"""
    permission = PermissionCreate(name="test")
    assert permission.name == "test"
