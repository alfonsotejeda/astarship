"""Report routes: the RC queries, as table rows and chart data; the PDF is built by the client."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_role
from app.db.session import get_db
from app.models.user.user import UserRole
from app.schemas.report import Rc1Report, Rc1SortColumn, SortOrder
from app.services import report as report_service

router = APIRouter(prefix="/reports", tags=["reports"])


def _check_date_range(date_from: date | None, date_to: date | None) -> None:
    """Reject a date range that ends before it starts."""
    if date_from is not None and date_to is not None and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="date_from must not be after date_to",
        )


@router.get(
    "/rc1",
    response_model=Rc1Report,
    dependencies=[
        Depends(require_role(UserRole.ADMIN, UserRole.OPERATIONS_MANAGER, UserRole.GUIDE))
    ],
)
def rc1_generated_itineraries(
    package_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    sort: Rc1SortColumn = Rc1SortColumn.CREATION_DATE,
    order: SortOrder = SortOrder.DESC,
    db: Session = Depends(get_db),
) -> Rc1Report:
    """RC-1: itineraries generated for a package, with creator, creation date and parameters."""
    _check_date_range(date_from, date_to)
    return report_service.rc1_generated_itineraries(
        db, package_id, date_from, date_to, sort, order
    )
