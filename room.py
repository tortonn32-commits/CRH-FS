import json
import os
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler

# Uses Upstash Redis REST if configured (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN),
# otherwise falls back to warm-instance in-memory storage.
MEM_ROOMS = {}
CLIENT_TTL = 15.0

UPSTASH_URL = (
    os.environ.get("KV_REST_API_URL")
    or os.environ.get("UPSTASH_REDIS_REST_URL")
    or ""
).rstrip("/")
UPSTASH_TOKEN = (
    os.environ.get("KV_REST_API_TOKEN")
    or os.environ.get("UPSTASH_REDIS_REST_TOKEN")
    or ""
)


def _redis_get(key: str):
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return MEM_ROOMS.get(key)
    req = urllib.request.Request(
        f"{UPSTASH_URL}/get/{urllib.parse.quote(key)}",
        headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw = data.get("result")
            return json.loads(raw) if raw else None
    except Exception:
        return MEM_ROOMS.get(key)


def _redis_set(key: str, obj: dict, ttl: int = 3600):
    MEM_ROOMS[key] = obj
    if not UPSTASH_URL or not UPSTASH_TOKEN:
        return
    payload = json.dumps(obj, ensure_ascii=False)
    req = urllib.request.Request(
        f"{UPSTASH_URL}/set/{urllib.parse.quote(key)}/{urllib.parse.quote(payload)}?EX={ttl}",
        method="POST",
        headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=4):
            pass
    except Exception:
        pass


def _prune(room: dict) -> int:
    now = time.time()
    clients = room.get("clients", {})
    room["clients"] = {cid: ts for cid, ts in clients.items() if now - ts <= CLIENT_TTL}
    return len(room["clients"])


class handler(BaseHTTPRequestHandler):
    def _send(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0") or "0")
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(min(length, 512 * 1024)).decode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = (qs.get("code") or [""])[0].strip()
        action = (qs.get("action") or [""])[0].strip()
        client_id = (qs.get("clientId") or [""])[0].strip()

        if action != "state" or not code:
            self._send(404, {"ok": False, "error": "Not found"})
            return

        key = f"room:{code}"
        room = _redis_get(key)
        if not room:
            self._send(200, {"ok": True, "exists": False, "state": None, "connectedClients": 0})
            return

        now = time.time()
        if client_id:
            room.setdefault("clients", {})[client_id] = now
        count = _prune(room)
        _redis_set(key, room)
        self._send(
            200,
            {
                "ok": True,
                "exists": True,
                "hostOnline": (now - room.get("hostSeen", 0)) < 15.0,
                "state": room.get("state", {}),
                "connectedClients": count,
            },
        )

    def do_POST(self):
        qs = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        code = (qs.get("code") or [""])[0].strip()
        action = (qs.get("action") or [""])[0].strip()
        if not code:
            self._send(400, {"ok": False, "error": "Missing room code"})
            return

        try:
            body = self._read_json()
        except Exception:
            self._send(400, {"ok": False, "error": "Invalid JSON"})
            return

        key = f"room:{code}"
        now = time.time()

        if action == "host":
            room = _redis_get(key) or {"state": {}, "commands": [], "clients": {}, "hostSeen": now}
            room["hostSeen"] = now
            if isinstance(body.get("state"), dict):
                room["state"] = body["state"]
            cmds = room.get("commands", [])
            room["commands"] = []
            count = _prune(room)
            _redis_set(key, room)
            self._send(200, {"ok": True, "commands": cmds, "connectedClients": count})
            return

        if action == "cmd":
            cmd_type = str(body.get("type") or "").strip()
            if not cmd_type:
                self._send(400, {"ok": False, "error": "Missing command type"})
                return
            room = _redis_get(key)
            if not room:
                self._send(404, {"ok": False, "error": "ไม่พบห้องรีโมตนี้ กรุณาตรวจสอบรหัสห้อง"})
                return
            client_id = str(body.get("clientId") or "").strip()
            if client_id:
                room.setdefault("clients", {})[client_id] = now
            room.setdefault("commands", []).append(
                {"type": cmd_type, "payload": body.get("payload"), "ts": now}
            )
            count = _prune(room)
            _redis_set(key, room)
            self._send(200, {"ok": True, "connectedClients": count})
            return

        self._send(404, {"ok": False, "error": "Not found"})
