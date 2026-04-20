import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from Game import Game
from db import init_db, DB_PATH
import aiosqlite


game = Game(needed_players=23)

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    asyncio.create_task(game.game_loop())
    yield


app = FastAPI(lifespan=lifespan)
# CORS back-again pour nous pourrir la vie
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],    
    allow_headers=["*"],
)



@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()

    client_ip = ws.client.host

    if game.is_ip_connected(client_ip):
        # Cheh
        await ws.close(code=4001)
        return

    try:
        join_data = await ws.receive_json()
    except WebSocketDisconnect:
        return

    name = join_data.get("name")
    skin_path = join_data.get("skinPath")

    player = await game.add_player(ws, name, skin_path, client_ip)
    if not player:
        await ws.close(code=4002)
        return

    try:
        while True:
            data = await ws.receive_json()
            game.handle_input(player.id, data)

    except WebSocketDisconnect:
        game.remove_player(player.id)



# HTTP backend code

@app.get("/api/stats")
async def get_stats(name: str):
    async with aiosqlite.connect(DB_PATH) as db:
        # Player ID
        cursor = await db.execute(
            "SELECT id FROM players WHERE name = ?",
            (name,)
        )
        row = await cursor.fetchone()
        if not row:
            return {"error": "Player not found"}

        player_id = row[0]

        print(name, row)

        # Aggregate stats
        cursor = await db.execute("""
        SELECT
            SUM(kills),
            SUM(deaths),
            COUNT(*)
        FROM games
        WHERE player_id = ?
        """, (player_id,))
        total_kills, total_deaths, games_played = await cursor.fetchone()

        print(total_kills, total_deaths, games_played)
        print("-" * 80)

        # Last game ranking
        cursor = await db.execute("""
        SELECT death_order
        FROM games
        WHERE player_id = ?
        ORDER BY played_at DESC
        LIMIT 1
        """, (player_id,))
        last_rank = (await cursor.fetchone())[0]

        # Overall ranking (average death_order)
        cursor = await db.execute("""
        SELECT AVG(death_order)
        FROM games
        WHERE player_id = ?
        """, (player_id,))
        avg_rank = (await cursor.fetchone())[0]

    kd = (
        total_kills / total_deaths
        if total_deaths > 0 else total_kills
    )

    return {
        "name": name,
        "gamesPlayed": games_played,
        "totalKills": total_kills,
        "totalDeaths": total_deaths,
        "kdRatio": round(kd, 2),
        "lastGameRank": last_rank,
        "overallRanking": round(avg_rank, 2)
    }


@app.get("/api/listPlayers")
async def list_players():
    async with aiosqlite.connect(DB_PATH) as db:
        cur = await db.execute("""
        SELECT
            p.name,
            COUNT(g.id) AS games_played,
            COALESCE(SUM(g.kills), 0) AS total_kills,
            COALESCE(SUM(g.deaths), 0) AS total_deaths
        FROM players p
        LEFT JOIN games g ON g.player_id = p.id
        GROUP BY p.id
        ORDER BY games_played DESC, total_kills DESC
        """)

        rows = await cur.fetchall()

    return [
        {
            "name": name,
            "gamesPlayed": games_played,
            "totalKills": total_kills,
            "totalDeaths": total_deaths,
            "kdRatio": round(total_kills / total_deaths, 2) if total_deaths else total_kills
        }
        for name, games_played, total_kills, total_deaths in rows
    ]
