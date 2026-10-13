"""Tests for the permission service."""

from app.schemas.permission import PermissionCreate
from app.services import permission as permission_sv


def test_list_permissions(db_session):
    """Test listing permissions"""
    permission_sv.create_permission(db_session, PermissionCreate(name="Test Permission"))
    list_permission = permission_sv.list_permissions(db_session)
    assert isinstance(list_permission, list)

    assert len(list_permission) >= 1


def test_get_permission(db_session):
    """Test getting a specific permission"""
    permission_sv.create_permission(db_session, PermissionCreate(name="Test Permission"))
    permission = permission_sv.get_permission(db_session, name="Test Permission")
    assert permission is not None
    assert permission.name == "Test Permission"


def test_get_permission_not_found(db_session):
    """Test getting a permission that does not exist"""
    test_permission = permission_sv.get_permission(db_session, name="Non-existent Permission")
    assert test_permission is None


def test_delete_permission(db_session):
    """Test deleting a permission"""
    permission = permission_sv.create_permission(
        db_session, PermissionCreate(name="Test Permission")
    )
    permission_sv.delete_permission(db_session, permission)
    test_permission = permission_sv.get_permission(db_session, name="Test Permission")
    assert test_permission is None
