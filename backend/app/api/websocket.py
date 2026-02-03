"""WebSocket endpoint for real-time sync notifications."""

from fastapi import WebSocket, WebSocketDisconnect
from typing import List, Dict, Any
import json
import asyncio
from datetime import datetime


class ConnectionManager:
    """Manages WebSocket connections for sync notifications."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcast a message to all connected clients."""
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        # Clean up disconnected clients
        async with self._lock:
            for conn in disconnected:
                if conn in self.active_connections:
                    self.active_connections.remove(conn)

    async def send_personal(self, message: Dict[str, Any], websocket: WebSocket):
        """Send a message to a specific client."""
        try:
            await websocket.send_json(message)
        except Exception:
            await self.disconnect(websocket)

    def get_connection_count(self) -> int:
        """Get the number of active connections."""
        return len(self.active_connections)


# Global connection manager instance
manager = ConnectionManager()


async def websocket_sync_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for sync notifications.

    Clients connect here to receive real-time updates when:
    - New activities are synced (hourly job)
    - Dashboard is refreshed (daily job)
    """
    await manager.connect(websocket)

    try:
        # Send welcome message
        await manager.send_personal(
            {
                "type": "connected",
                "timestamp": datetime.now().isoformat(),
                "message": "WebSocket connection established",
            },
            websocket,
        )

        # Keep connection alive and handle ping/pong
        while True:
            try:
                # Wait for messages from client (with timeout)
                data = await asyncio.wait_for(
                    websocket.receive_text(),
                    timeout=30.0,  # 30 second timeout for heartbeat
                )

                # Handle ping from client
                if data == "ping":
                    await websocket.send_text("pong")
                else:
                    # Echo back any other messages
                    await websocket.send_json({"type": "echo", "data": data})

            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                try:
                    await websocket.send_json(
                        {"type": "ping", "timestamp": datetime.now().isoformat()}
                    )
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        await manager.disconnect(websocket)
