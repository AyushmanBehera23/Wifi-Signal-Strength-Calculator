"""
Abstract base class for all Wi-Fi scanner adapters.
Future adapters (Windows, Linux) must implement this interface
without changing the frontend API contract.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.wifi import AgentCapabilities, NetworkObservation


class WiFiScanner(ABC):
    """
    Abstract scanner. Each platform-specific subclass must implement
    `scan()` and `get_capabilities()`. The scanner must not raise
    unhandled exceptions; it must return an empty list on failure
    and log the error internally.
    """

    @abstractmethod
    def scan(self) -> list[NetworkObservation]:
        """
        Return a list of normalized NetworkObservation objects.
        Returns an empty list if scanning fails — never raises.
        """

    @abstractmethod
    def get_capabilities(self) -> AgentCapabilities:
        """
        Return the runtime capabilities of this scanner on the current machine.
        Must detect available fields at runtime; must not assume command availability.
        """

    @abstractmethod
    def is_available(self) -> bool:
        """
        Return True if this scanner can produce results on the current machine.
        Should be cheap to call (no full scan).
        """

    def source_name(self) -> str:
        """Human-readable name of this scanner adapter."""
        return self.__class__.__name__
