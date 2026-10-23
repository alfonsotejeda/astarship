"""Test de Coverage service."""
import pytest
from app.models.category import Category
from app.models.package import Package
from app.schemas.category_package import CategoryPackageCreate
from app.services.category_package import (
    isValid_category,
    isValid_package,
    get_relation,
    categories_by_package,
    packages_by_category,
    get_relations,
    create_relation,
    delete_relation,
)

# ==========================================
# FIXTURE LOCAL DE DATOS DE PRUEBA
# ==========================================
@pytest.fixture
def sample_data(db_session):
    """Crea categorías y paquetes iniciales usando la sesión global de test."""
    cat1 = Category(name="Playa")
    cat2 = Category(name="Montaña")
    pkg1 = Package(name="Viaje Caribe", destination="Cancún")
    pkg2 = Package(name="Tour Los Andes", destination="Bariloche")
    
    db_session.add_all([cat1, cat2, pkg1, pkg2])
    db_session.commit()
    
    db_session.refresh(cat1)
    db_session.refresh(cat2)
    db_session.refresh(pkg1)
    db_session.refresh(pkg2)
    
    return {"cat1": cat1, "cat2": cat2, "pkg1": pkg1, "pkg2": pkg2}


# ==========================================
# TESTS PARA: Validaciones auxiliares
# ==========================================

def test_is_valid_category_success(db_session, sample_data):
    cat = isValid_category(sample_data["cat1"].id, db_session)
    assert cat is not None
    assert cat.name == "Playa"


def test_is_valid_category_not_found(db_session):
    with pytest.raises(ValueError, match="Category not found"):
        isValid_category(999, db_session)


def test_is_valid_package_success(db_session, sample_data):
    pkg = isValid_package(sample_data["pkg1"].id, db_session)
    assert pkg is not None
    assert pkg.name == "Viaje Caribe"


def test_is_valid_package_not_found(db_session):
    with pytest.raises(ValueError, match="Package not found"):
        isValid_package(999, db_session)


# ==========================================
# TESTS PARA: create_relation
# ==========================================

def test_create_relation_success(db_session, sample_data):
    data = CategoryPackageCreate(category_id=sample_data["cat1"].id, package_id=sample_data["pkg1"].id)
    relation = create_relation(data, db_session)
    
    assert relation is not None
    assert relation.category_id == sample_data["cat1"].id
    assert relation.package_id == sample_data["pkg1"].id


def test_create_relation_duplicate_error(db_session, sample_data):
    data = CategoryPackageCreate(category_id=sample_data["cat1"].id, package_id=sample_data["pkg1"].id)
    create_relation(data, db_session)
    
    with pytest.raises(ValueError, match="This category-package relation already exists"):
        create_relation(data, db_session)


def test_create_relation_invalid_foreign_keys(db_session, sample_data):
    data_bad_cat = CategoryPackageCreate(category_id=999, package_id=sample_data["pkg1"].id)
    with pytest.raises(ValueError, match="Category not found"):
        create_relation(data_bad_cat, db_session)


# ==========================================
# TESTS PARA: Consultas y Relaciones
# ==========================================

def test_categories_and_packages_by_relation(db_session, sample_data):
    c_id = sample_data["cat1"].id
    p_id = sample_data["pkg1"].id
    
    create_relation(CategoryPackageCreate(category_id=c_id, package_id=p_id), db_session)
    
    pkgs = packages_by_category(c_id, db_session)
    assert len(pkgs) == 1
    assert pkgs[0].id == p_id
    
    cats = categories_by_package(p_id, db_session)
    assert len(cats) == 1
    assert cats[0].id == c_id


def test_get_relations_list(db_session, sample_data):
    create_relation(CategoryPackageCreate(category_id=sample_data["cat1"].id, package_id=sample_data["pkg1"].id), db_session)
    create_relation(CategoryPackageCreate(category_id=sample_data["cat2"].id, package_id=sample_data["pkg2"].id), db_session)
    
    relations = get_relations(db_session)
    assert len(relations) >= 2


# ==========================================
# TESTS PARA: delete_relation
# ==========================================

def test_delete_relation_success(db_session, sample_data):
    c_id = sample_data["cat1"].id
    p_id = sample_data["pkg1"].id
    
    create_relation(CategoryPackageCreate(category_id=c_id, package_id=p_id), db_session)
    assert get_relation(c_id, p_id, db_session) is not None
    
    delete_relation(c_id, p_id, db_session)
    assert get_relation(c_id, p_id, db_session) is None


def test_delete_relation_not_found(db_session, sample_data):
    with pytest.raises(ValueError, match="Relation not found"):
        delete_relation(sample_data["cat1"].id, sample_data["pkg1"].id, db_session)