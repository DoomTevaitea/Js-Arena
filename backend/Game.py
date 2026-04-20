import asyncio
import re
from datetime import datetime
from Player import Player
import time
import aiosqlite
from db import DB_PATH

# Server tick rate & tick duration
TICK_RATE = 20
TICK_DURATION = 1.0 / TICK_RATE
# Epsilon used for hitbox tolerance
EPSILON = 0.005
# is_attacking must be reset after a single tick
ATTACK_ANIMATION_DURATION = TICK_DURATION + EPSILON

# Mais comment ça mon reuf ?
KONAMI = ["L", "U", "L", "U", "R", "R"]

KONAMI2 = ["L", "U", "R", "U", "L"]

# assets path regexp
pattern = re.compile(r"^assets/\d+\.png$")


async def get_or_create_player_id(name):
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "SELECT id FROM players WHERE name = ?",
            (name,)
        )
        row = await cursor.fetchone()

        if row:
            return row[0]

        cursor = await db.execute(
            "INSERT INTO players (name) VALUES (?)",
            (name,)
        )
        await db.commit()
        return cursor.lastrowid

def player_rank_key(player):
    if player.death_tick is None:
        return float("inf")  # alive players go last
    return player.death_tick

##################################### GAME CLASS ##################################### 

class Game:
    def __init__(self, needed_players=2):
        self.players = {}
        self.connections = {}
        self.ip_map = {}  # ip -> player_id

        self.needed_players = needed_players
        self.is_running = False
        self.is_over = False
        self.timer = 0.0
        self.win_timer = 0.0

    # ================= IP LOCK =================

    def is_ip_connected(self, ip):
        # Try swarming now
        return ip in self.ip_map

    # ================= GAME LOOP =================

    def is_game_over(self):
        alive = [p for p in self.players.values() if not p.is_dead]
        return len(alive) <= 1


    async def game_loop(self):
        while True:
            if self.players:

                if self.win_timer > 0:
                    self.win_timer -= TICK_DURATION
                    if self.win_timer <= 0:
                        self.is_running = False
                        self.is_over = False
                        self.timer = 0.0
                        self.win_timer = 0.0
                        for player in self.connections.keys():
                            self.remove_player(player)

                # --- Pre-game countdown handled by the same timer ---
                if not self.is_running and len(self.players) >= self.needed_players:
                    if self.timer <= 0:
                        self.timer = 5.0  # start countdown at 10s

                    # Broadcast countdown to clients
                    await self.broadcast_state()

                    # Decrease timer
                    self.timer -= TICK_DURATION

                    # Start game when timer reaches 0
                    if self.timer <= 0:
                        self.is_running = True
                        self.timer = 0.0

                # --- Game running ---
                if self.is_running:
                    self.update()  # update players only if game is running
                    await self.broadcast_state()

                # Even during countdown, you can broadcast state to show players and timer
                if not self.is_running:
                    # Still show players and timer, but prevent movements
                    for player in self.players.values():
                        player.is_walking = False
                        player.is_attacking = False
                    await self.broadcast_state()

            await asyncio.sleep(TICK_DURATION)



    # ================= PLAYERS =================

    async def add_player(self, ws, name, skin_path, ip):

        if name == None:
            print("name is None")
            return

        if skin_path == None:
            print("skin_path is None")

        if self.is_running or self.is_over or len(name) > 32:
            print("Invalid name / moment to join the game")
            return None

        if not pattern.match(skin_path):
            print(f"Invalid skin_path : {skin_path}")
            return None  # C'est ciao
        
        if len(self.players.values()) >= self.needed_players:
            print("Too many players connected")
            return None

        print(name, skin_path)

        player = Player(name, skin_path)
        player.db_id = await get_or_create_player_id(name)
        player.ip = ip
        self.players[player.id] = player
        self.connections[player.id] = ws
        self.ip_map[ip] = player.id
        return player


    def remove_player(self, player_id):
        self.players.pop(player_id, None)
        self.connections.pop(player_id, None)

        self.ip_map = {}
        
        print(self.ip_map)
        print(self.players)
        print(self.connections)

    # ================= INPUT =================

    def input_to_command(self, input_state):
        pressed = []

        if input_state.get("up"): pressed.append("U")
        if input_state.get("down"): pressed.append("D")
        if input_state.get("left"): pressed.append("L")
        if input_state.get("right"): pressed.append("R")
        if input_state.get("attack"): pressed.append("A")

        if not pressed:
            return None  # ignore empty ticks

        return "+".join(sorted(pressed))


    def handle_input(self, player_id, data):

        if not self.is_running:
            return

        player = self.players.get(player_id)
        if not player or player.is_dead:
            return

        now = datetime.now()
        if (now - player.last_input_timestamp).total_seconds() < TICK_DURATION:
            # Nikk ommak
            return

        player.last_input_timestamp = now
        player.input_state = data.get("input", {}).copy()

        command = self.input_to_command(player.input_state)

        # Remove consecutive duplicates
        if command and command != player.last_command:
            player.commands_history.append(command)
            player.last_command = command


    # ================= UPDATE =================

    def ends_with(self, history, sequence):
        if len(history) < len(sequence):
            return False
        return list(history)[-len(sequence):] == sequence


    def update(self):
        if self.is_over == False:
            self.timer += TICK_DURATION

        for player in self.players.values():
            # We don't process dead players
            if player.is_dead:
                continue

            player.update_stats()

            # ================= https://www.youtube.com/watch?v=dQw4w9WgXcQ

            if self.ends_with(player.commands_history, KONAMI):
                print("BIBI TURFU")
                player.lvl += 5
                player.commands_history.clear()  # prevent re-trigger spam lol

            if self.ends_with(player.commands_history, KONAMI2):
                print("ALEX TURFU")
                player.speed = 10.0
                player.commands_history.clear()


            # ================= ATTACK COOLDOWN =================
            if player.current_attack_cooldown > 0:
                player.current_attack_cooldown = max(
                    0.0,
                    player.current_attack_cooldown - TICK_DURATION
                )

            # ================= ATTACK ANIMATION =================
            if player.is_attacking:
                player._attack_timer -= TICK_DURATION
                if player._attack_timer <= 0:
                    player.is_attacking = False
                    player._attack_timer = 0.0

            # ================= ATTACK TRIGGER =================
            attack_pressed = player.input_state.get("attack", False)

            if (
                attack_pressed
                and not player._attack_pressed_last_tick
                and not player.is_attacking
                and player.current_attack_cooldown <= 0
            ):
                # déclenchement attaque
                player.is_attacking = True
                player.is_walking = False
                player._attack_timer = ATTACK_ANIMATION_DURATION
                player.current_attack_cooldown = player.attack_cooldown

                self.handle_attack(player)

            player._attack_pressed_last_tick = attack_pressed

            # ================= MOVEMENT =================
            if not player.is_attacking:
                player.update_movement(TICK_DURATION)
            else:
                player.is_walking = False

            # ================= HP REGEN =================
            if player.hp < player.max_hp and player:
                player.hp = min(
                    player.max_hp,
                    player.hp + player.hp_regen_rate * TICK_DURATION
                )

        # Ends game + saves data
        if not self.is_over and self.is_game_over():
            self.is_over = True
            self.win_timer = 10.0
            asyncio.create_task(self.save_game_results())

    # ================= COMBAT =================

    def handle_attack(self, attacker):
        rx, ry, rw, rh = attacker.get_attack_hitbox()

        for target in self.players.values():
            if target.id == attacker.id or target.is_dead:
                continue

            if target.point_in_rect(rx, ry, rw, rh, EPSILON):
                target.hp -= attacker.attack_damage

                if target.hp <= 0 and target.is_dead == False:
                    target.is_dying = True
                    target.is_dead = True
                    target.is_attacking = False
                    target.is_walking = False
                    target.deaths += 1
                    target.death_tick = self.timer

                    attacker.kills += 1

                    # Level Up
                    if target.lvl > attacker.lvl:
                        attacker.lvl = target.lvl
                    else:
                        attacker.lvl += 1

    # ================= NETWORK =================

    async def save_game_results(self):
        # Sort by time of death (last one alive is first)
        sorted_players = sorted(
            self.players.values(),
            key=player_rank_key,
            reverse=True
        )

        async with aiosqlite.connect(DB_PATH) as db:
            death_order = 1
            for player in sorted_players:
                await db.execute("""
                INSERT INTO games (player_id, player_ip, kills, deaths, death_order)
                VALUES (?, ?, ?, ?, ?)
                """, (
                    player.db_id,
                    player.ip,
                    player.kills,
                    player.deaths,
                    death_order
                ))
                death_order += 1

            await db.commit()


    async def broadcast_state(self):
        state = {
            "players": {pid: player.to_dict() for pid, player in self.players.items()},
            "isRunning": self.is_running,
            "isOver": self.is_over,
            "timer": self.timer
        }

        #print(state)

        disconnected = []
        for pid, ws in list(self.connections.items()):
            try:
                await ws.send_json(state)
            except Exception:
                disconnected.append(pid)

        for pid in disconnected:
            self.remove_player(pid)

