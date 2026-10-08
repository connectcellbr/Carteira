# Wallet Lab + MongoDB

Carteira digital com Flask + MongoDB Atlas. Pronta para GitHub e Render.

## Rodar no PC

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate
# Mac/Linux:
source .venv/bin/activate

pip install -r requirements.txt

# Crie o arquivo .env com:
# MONGODB_URI=mongodb+srv://Anrq01:sua_senha@cluster0.k49zg1i.mongodb.net/?appName=Cluster0

# Linux/Mac:
export MONGODB_URI="mongodb+srv://Anrq01:sua_senha@cluster0.k49zg1i.mongodb.net/?appName=Cluster0"
# Windows (PowerShell):
# $env:MONGODB_URI="mongodb+srv://Anrq01:sua_senha@cluster0.k49zg1i.mongodb.net/?appName=Cluster0"

python app.py
```

Abra: http://127.0.0.1:5000

## Subir no GitHub

```bash
git init
git add .
git commit -m "Carteira com MongoDB"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPO.git
git push -u origin main
```

**Nunca** faça commit do arquivo `.env` (já está no `.gitignore`).

## Deploy no Render

1. render.com → New → Web Service
2. Conecte o repositório do GitHub
3. Configurações:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT`
4. Environment → Add:
   - Key: `MONGODB_URI`
   - Value: sua URI completa do Atlas
5. Create Web Service

No Atlas → Network Access → permita `0.0.0.0/0` (Allow from Anywhere).

## Testar saúde do Mongo

`GET /health` → deve retornar `{"status":"ok","mongo":"connected"}`
