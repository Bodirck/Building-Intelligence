"""GET /api/portfolio — aggregate KPIs and series from the structures store."""
from __future__ import annotations

from fastapi import APIRouter

from api.db.seed import get_portfolio
from api.schemas import PortfolioSummary

router = APIRouter()


@router.get("/portfolio", response_model=PortfolioSummary)
def portfolio() -> PortfolioSummary:
    return PortfolioSummary(**get_portfolio())
