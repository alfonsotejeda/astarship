"""Test de Coverage Schema"""
import pytest
from pydantic import ValidationError
from app.schemas.coverage import (
    CoverageCreate,
    CoverageUpdate,
    CoverageRead,
)

# ==========================================
# TESTS PARA: CoverageCreate
# ==========================================

def test_category_package_create_valid():
    """Verifica que se pueda crear el esquema con datos válidos."""
    data = {"category_id": 1, "package_id": 5}
    schema = CoverageCreate(**data)
    
    assert schema.category_id == 1
    assert schema.package_id == 5


@pytest.mark.parametrize(
    "invalid_data",
    [
        {"category_id": "no-es-un-entero", "package_id": 5},  # ID de categoría inválido (string)
        {"category_id": 1, "package_id": "tambien-invalido"},    # ID de paquete inválido (string)
        {"category_id": 1},                                     # Falta package_id
        {"package_id": 5},                                      # Falta category_id
        {},                                                     # Vacío
    ],
)
def test_category_package_create_invalid(invalid_data):
    """Verifica que Pydantic rechace datos incorrectos en la creación."""
    with pytest.raises(ValidationError):
        CoverageCreate(**invalid_data)


# ==========================================
# TESTS PARA: CoverageUpdate
# ==========================================

def test_category_package_update_valid():
    """Verifica el esquema de actualización con datos válidos."""
    data = {"category_id": 2, "package_id": 10}
    schema = CoverageUpdate(**data)
    
    assert schema.category_id == 2
    assert schema.package_id == 10


@pytest.mark.parametrize(
    "invalid_data",
    [
        {"category_id": 2, "package_id": None},
        {"category_id": "abc", "package_id": 10},
        {},
    ],
)
def test_category_package_update_invalid(invalid_data):
    """Verifica que Pydantic falle si faltan campos obligatorios o son del tipo incorrecto."""
    with pytest.raises(ValidationError):
        CoverageUpdate(**invalid_data)


# ==========================================
# TESTS PARA: CoverageRead
# ==========================================

def test_category_package_read_from_attributes():
    """
    Verifica que el esquema de lectura (ORMSchema) pueda construirse 
    correctamente usando el mapeo de atributos (from_attributes=True o similar).
    """
    # Simulamos un objeto de base de datos (o un objeto plano con atributos)
    class FakeDBModel:
        def __init__(self, category_id, package_id):
            self.category_id = category_id
            self.package_id = package_id

    db_object = FakeDBModel(category_id=3, package_id=7)
    
    # Dependiendo de cómo esté configurado tu ORMSchema (en Pydantic v2 usa model_validate)
    schema = CoverageRead.model_validate(db_object)

    assert schema.category_id == 3
    assert schema.package_id == 7