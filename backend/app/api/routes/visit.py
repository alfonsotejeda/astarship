"""Visit routes."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.visit import VisitCreated, VisitRead, VisitStatus, VisitUpdate
from app.services import visit as visit_sv

router = APIRouter(prefix="/visits", tags=["visits"])


@router.post("", response_model=VisitRead, status_code=status.HTTP_201_CREATED)
def create_visit(data: VisitCreated, db: Session = Depends(get_db)) -> VisitRead:
    """Register a tourist's visit to an activity of an assigned itinerary."""
    try:
        return visit_sv.create_visit(db, data)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.get("/by_activity/{activity_id}", response_model=list[VisitRead])
def list_visit_by_activity(
    activity_id: int,
    status_param: VisitStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    """List the visits of an activity, optionally filtered by status (?status=done)."""
    try:
        return visit_sv.visit_by_activity(db, activity_id, status_param)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/by_tourist/{tourist_id}", response_model=list[VisitRead])
def list_visit_by_tourist(
    tourist_id: int,
    status_param: VisitStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[VisitRead]:
    """List all the visits of a tourist, optionally filtered by status."""
    try:
        return visit_sv.visit_by_tourist(db, tourist_id, status_param)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/by_itinerary/{itinerary_id}", response_model=list[VisitRead])
def list_visit_by_itinerary(
    itinerary_id: int,
    status_param: VisitStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
):
    """List the visits of an itinerary for all its tourists, optionally filtered by status."""
    try:
        return visit_sv.visits_by_itinerary(db, itinerary_id, status_param)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/by_dates/{first_date}/{second_date}", response_model=list[VisitRead]) 
def list_by_dates(first_date: date, second_date: date, db: Session = Depends(get_db)
                  ) -> list[VisitRead]:
    """List the visits whose assignment date is between two dates (inclusive)."""
    try:
        return visit_sv.visit_between_dates(db, first_date, second_date)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
                            ) from error


@router.get("/assignment_rating/{itinerary_id}/{tourist_id}/{assignment_date}",
            response_model=float | None)
def get_assignment_rating(  itinerary_id: int, tourist_id: int,
                            assignment_date: date, db: Session = Depends(get_db)):
    """Average rating of the done visits of an assignment (null if there are no ratings)."""
    try:
        return visit_sv.assignment_rating(db, itinerary_id, tourist_id, assignment_date)
    except LookupError as error:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/assignment_progress/{itinerary_id}/{tourist_id}/{assignment_date}")
def get_assignment_progress(itinerary_id: int, tourist_id: int,
                            assignment_date: date, db: Session = Depends(get_db)):
    """Done and skipped counts of an assignment and the activities still without a visit."""
    try:
        return visit_sv.assignment_progress(db, itinerary_id, tourist_id, assignment_date)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/activity_satisfaction/{activity_id}", response_model=tuple[float | None, int])
def get_activity_satisfaction(activity_id: int, db: Session = Depends(get_db)):
    """Average rating of an activity and how many ratings it has."""
    try:
        return visit_sv.activity_satisfaction(db, activity_id)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/activity_visit_stats", response_model=list[dict])
def activity_visit_stats(db: Session = Depends(get_db)):
    """Visit total, abandonment rate and satisfaction of every activity."""
    return visit_sv.activity_visit_stats(db)


@router.get("/{itinerary_id}/{tourist_id}/{assignment_date}", response_model=list[VisitRead])
def list_visit_by_assignment(itinerary_id: int, tourist_id: int,
                            assignment_date: date, db: Session = Depends(get_db)):
    """List the visits of a tourist within an itinerary assignment."""
    try:
        return visit_sv.visit_by_assignment(db, itinerary_id, tourist_id, assignment_date)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/{itinerary_id}/{tourist_id}/{assignment_date}/{activity_id}",
            response_model=VisitRead)
def get_visit(
    itinerary_id: int, tourist_id: int, assignment_date: date,
    activity_id: int, db: Session = Depends(get_db)
) -> VisitRead:
    """Get a visit by its primary key."""
    visit = visit_sv.get_visit(db, itinerary_id, tourist_id, assignment_date, activity_id)
    if visit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found")
    return visit


@router.patch("/{itinerary_id}/{tourist_id}/{assignment_date}/{activity_id}",
            response_model=VisitRead)
def update_visit(
    itinerary_id: int,
    tourist_id: int,
    assignment_date: date,
    activity_id: int,
    data: VisitUpdate,
    db: Session = Depends(get_db),
):
    """Partially update the status, rating or comment of a visit."""
    try:
        return visit_sv.update_visit(db, itinerary_id, tourist_id,
                                    assignment_date, activity_id, data)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error


@router.delete(
    "/{itinerary_id}/{tourist_id}/{assignment_date}/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_visit(
    itinerary_id: int, tourist_id: int,
    assignment_date: date, activity_id: int, db: Session = Depends(get_db)
) -> None:
    """Delete a visit."""
    try:
        visit_sv.delete_visit(db, itinerary_id, tourist_id, assignment_date,activity_id)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
