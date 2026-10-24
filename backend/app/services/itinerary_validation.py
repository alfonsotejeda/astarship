"""Itinerary Validation service."""

from datetime import datetime

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.models.itinerary import Itinerary
from app.models.itinerary_validation import ItineraryValidation
from app.models.package import Package
from app.models.user.guide import Guide
from app.schemas.itinerary_validation import ItineraryValidationCreate
from app.services.authorization import get_authorization


# Auxiliary Methods
def get_itinerary_or_raise(itinerary_id: int, db: Session) -> Itinerary:
    """Return the itinerary with the given ID or raise LookupError if it does not exist."""
    itinerary = db.get(Itinerary, itinerary_id)
    if itinerary is None:
        raise LookupError("Itinerary not found")
    return itinerary

def get_guide_or_raise(guide_id: int, db: Session) -> Guide:
    """Return the guide with the given ID or raise LookupError if it does not exist."""
    guide = db.get(Guide, guide_id)
    if guide is None:
        raise LookupError("Guide not found")
    return guide

def get_package_or_raise(package_id: int, db: Session) -> Package:
    """Return the package with the given ID or raise LookupError if it does not exist."""
    package = db.get(Package, package_id)
    if package is None:
        raise LookupError("Package not found")
    return package

# 1) Validaciones de un itinerario, de la más antigua a la más nueva
def validations_by_itinerary(itinerary_id: int, db: Session) -> list[ItineraryValidation]:
    """Return the validations of an itinerary, oldest first."""
    get_itinerary_or_raise(itinerary_id, db)
    stmt = (
        select(ItineraryValidation)
        .where(ItineraryValidation.itinerary_id == itinerary_id)
        .order_by(ItineraryValidation.validation_date)
    )
    return list(db.scalars(stmt))

# 2) Validaciones hechas por un guía.
def itinerary_by_guide(guide_id: int, db: Session) -> list[ItineraryValidation]:
    """Return the validations made by a guide, oldest first."""
    get_guide_or_raise(guide_id, db)

    stmt = (
        select(ItineraryValidation)
        .where(ItineraryValidation.guide_id == guide_id)
        .order_by(ItineraryValidation.validation_date)
    )
    return list(db.scalars(stmt))

# 3) Validaciones rechazadas (result == False) con sus observaciones.
def get_rejected_validations(db: Session) -> list[ItineraryValidation]:
    """Return every rejected validation, ordered by guide."""
    stmt = (
        select(ItineraryValidation)
        .where(ItineraryValidation.result.is_(False))
        .order_by(ItineraryValidation.guide_id)
    )
    return list(db.scalars(stmt))

# 4) Validaciones dentro de un rango de fechas (between sobre validation_date).
def get_validations_between(
    start: datetime, end: datetime, db: Session
) -> list[ItineraryValidation]:
    """Return the validations made between two dates, both included, oldest first."""
    stmt = (
        select(ItineraryValidation)
        .where(ItineraryValidation.validation_date.between(start, end))
        .order_by(ItineraryValidation.validation_date)
    )
    return list(db.scalars(stmt))

# 5) Itinerarios que un guía ha validado, con su paquete.
def get_itineraries_by_guide(guide_id: int, db: Session) -> list[tuple[Itinerary, Package | None]]:
    """Return the itineraries validated by a guide, each with its package (or None)."""
    get_guide_or_raise(guide_id, db)
    stmt = (
        select(Itinerary, Package)
        .join(ItineraryValidation, ItineraryValidation.itinerary_id == Itinerary.id)
        .outerjoin(Package, Itinerary.package_id == Package.id)
        .where(ItineraryValidation.guide_id == guide_id)
        .distinct()
    )
    return [(itinerary, package) for itinerary, package in db.execute(stmt)]

# 6) Validaciones de los itinerarios de un paquete (join Itinerary y filtro por package_id).
def itineraries_by_package(package_id: int, db: Session) -> list[ItineraryValidation]:
    """Return the validations of the itineraries that belong to a package, oldest first."""
    get_package_or_raise(package_id, db)
    stmt = (
        select(ItineraryValidation)
        .join(Itinerary, ItineraryValidation.itinerary_id == Itinerary.id)
        .where(Itinerary.package_id == package_id)
        .order_by(ItineraryValidation.validation_date)
    )
    return list(db.scalars(stmt))

# 7) Guías que han validado itinerarios de un paquete.
def validation_itinerary_guide_package(package_id: int, db: Session) -> list[Guide]:
    """Return the distinct guides who validated itineraries of a package."""
    get_package_or_raise(package_id, db)
    stmt = (
        select(Guide)
        .join(ItineraryValidation, ItineraryValidation.guide_id == Guide.id)
        .join(Itinerary, ItineraryValidation.itinerary_id == Itinerary.id)
        .where(Itinerary.package_id == package_id)
        .distinct()
    )
    return list(db.scalars(stmt))

# 8) Porcentaje de aprobación por guía: aprobadas entre totales 
def approval_rate_by_guide(db: Session) -> list[tuple[int, float]]:
    """Return (guide_id, approval percentage) for every guide that has validations."""
    total = func.count()
    approved = func.count(case((ItineraryValidation.result.is_(True), 1)))
    stmt = (
        select(ItineraryValidation.guide_id, func.round(approved * 100.0 / total, 2))
        .group_by(ItineraryValidation.guide_id)
        .order_by(ItineraryValidation.guide_id)
    )
    return [(guide_id, float(rate)) for guide_id, rate in db.execute(stmt)]

# 9) Cuántas validaciones ha hecho cada guía.
def validation_count_by_guide(db: Session) -> list[tuple[int, int]]:
    """Return (guide_id, number of validations) for every guide that has validations."""
    stmt = (
        select(ItineraryValidation.guide_id, func.count())
        .group_by(ItineraryValidation.guide_id)
        .order_by(ItineraryValidation.guide_id)
    )
    return [(guide_id, total) for guide_id, total in db.execute(stmt)]

# 10) Cuántas validaciones tiene cada itinerario.
def validation_count_by_itinerary(db: Session) -> list[tuple[int, int]]:
    """Return (itinerary_id, number of validations) for every validated itinerary."""
    stmt = (
        select(ItineraryValidation.itinerary_id, func.count())
        .group_by(ItineraryValidation.itinerary_id)
        .order_by(ItineraryValidation.itinerary_id)
    )
    return [(itinerary_id, total) for itinerary_id, total in db.execute(stmt)]

# 11) Crear una validacion
def create_validation(
    itinerary_id: int, data: ItineraryValidationCreate, db: Session
) -> ItineraryValidation:
    """Validate an itinerary as a guide and update the itinerary."""
    itinerary = get_itinerary_or_raise(itinerary_id, db)
    guide = get_guide_or_raise(data.guide_id, db)

    if itinerary.creator_id == guide.id:
        raise PermissionError("A guide cannot validate an itinerary they generated")

    if itinerary.package_id is None:
        raise ValueError("The itinerary does not belong to a package")

    authorization = get_authorization(db, itinerary.package_id, guide.id)

    if authorization is None or not authorization.can_validate:
        raise PermissionError("The guide cannot validate itineraries of this package")

    validation = ItineraryValidation(
        itinerary_id=itinerary_id,
        guide_id=guide.id,
        result=data.result,
        observations=data.observations,
    )
    itinerary.validated = data.result
    db.add(validation)
    db.commit()
    db.refresh(validation)
    return validation