from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
import os, secrets, re
from datetime import datetime, timezone

app = Flask(__name__)

MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    raise RuntimeError(
        "Defina a variável MONGODB_URI. Ex.: mongodb+srv://usuario:senha@cluster..."
    )

client = MongoClient(MONGODB_URI)
db = client["wallet_lab"]
wallets = db["wallets"]


def valid_cpf(cpf: str) -> bool:
    cpf = re.sub(r"\D", "", cpf)
    if len(cpf) != 11 or len(set(cpf)) == 1:
        return False
    s = sum(int(cpf[i]) * (10 - i) for i in range(9))
    d = (s * 10) % 11
    d = 0 if d == 10 else d
    if d != int(cpf[9]):
        return False
    s = sum(int(cpf[i]) * (11 - i) for i in range(10))
    d = (s * 10) % 11
    d = 0 if d == 10 else d
    return d == int(cpf[10])


def luhn_ok(number: str) -> bool:
    digits = [int(c) for c in re.sub(r"\D", "", number)]
    if len(digits) < 13 or len(digits) > 19:
        return False
    total = 0
    for i, d in enumerate(reversed(digits)):
        if i % 2 == 1:
            d *= 2
            if d > 9:
                d -= 9
        total += d
    return total % 10 == 0


def card_brand(number: str) -> str:
    n = re.sub(r"\D", "", number)
    if n.startswith("4"):
        return "VISA"
    if n.startswith(("51", "52", "53", "54", "55")) or (
        len(n) >= 4 and 2221 <= int(n[:4]) <= 2720
    ):
        return "MASTERCARD"
    if n.startswith(("34", "37")):
        return "AMEX"
    if n.startswith(("6011", "65")):
        return "DISCOVER"
    if n.startswith(("36", "38")):
        return "DINERS"
    return "CARD"


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/api/wallets")
def create_wallet():
    data = request.get_json(silent=True) or {}
    name = str(data.get("holder_name", "")).strip()
    cpf = re.sub(r"\D", "", str(data.get("cpf", "")))
    birth = str(data.get("birth_date", "")).strip()
    card = re.sub(r"\D", "", str(data.get("card_number", "")))
    exp = str(data.get("expiry", "")).strip()
    cvv = re.sub(r"\D", "", str(data.get("cvv", "")))

    if len(name) < 3:
        return jsonify(error="Nome inválido."), 400
    if not valid_cpf(cpf):
        return jsonify(error="CPF inválido."), 400
    if not luhn_ok(card):
        return jsonify(error="Número do cartão inválido."), 400
    if not re.fullmatch(r"\d{2}/\d{2}", exp):
        return jsonify(error="Validade deve estar no formato MM/AA."), 400
    if len(cvv) not in (3, 4):
        return jsonify(error="CVV inválido."), 400

    wallet_id = "wal_" + secrets.token_hex(6).upper()
    token = "card_" + secrets.token_urlsafe(10)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    doc = {
        "wallet_id": wallet_id,
        "holder_name": name,
        "cpf": cpf,
        "birth_date": birth,
        "payment_token": token,
        "brand": card_brand(card),
        "last4": card[-4:],
        "created_at": now,
    }
    wallets.insert_one(doc)

    return jsonify(
        success=True,
        wallet_id=wallet_id,
        token=token,
        brand=doc["brand"],
        last4=doc["last4"],
        message="Carteira criada com sucesso.",
    )


@app.get("/api/wallets")
def list_wallets():
    rows = list(
        wallets.find(
            {},
            {
                "_id": 0,
                "wallet_id": 1,
                "holder_name": 1,
                "brand": 1,
                "last4": 1,
                "created_at": 1,
            },
        ).sort("created_at", -1)
    )
    return jsonify(rows)


@app.get("/health")
def health():
    try:
        client.admin.command("ping")
        return jsonify(status="ok", mongo="connected")
    except Exception as e:
        return jsonify(status="error", detail=str(e)), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
