import json
from typing import Dict, Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from app.core.security import decode_token

ws_router = APIRouter()


class WSManager:
    def __init__(self):
        self.active: Dict[int, WebSocket] = {}

    async def connect(self, ws: WebSocket, user_id: int):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def broadcast(self, message: dict):
        dead = []
        for uid, ws in self.active.items():
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.disconnect(uid)

    async def send_to(self, user_id: int, message: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                self.disconnect(user_id)


ws_manager = WSManager()


@ws_router.websocket("/ws/threats")
async def threats_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    try:
        payload = await decode_token(token)
        user_id = int(payload["sub"])
    except Exception:
        await websocket.close(code=4001)
        return

    await ws_manager.connect(websocket, user_id)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(user_id)
