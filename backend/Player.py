import uuid
import random
from datetime import datetime
from collections import deque
import time

BASE_SPEED = 0.2
BASE_HP_REGEN_RATE = 5
BASE_ATTACK_DAMAGE = 30
BASE_ATTACK_COOLDOWN = 1.0
BASE_ATTACK_RANGE = 0.075
BASE_ATTACK_WIDTH = 0.10
BASE_MAX_HP = 100


class Player:
    def __init__(self, name, skin_path):
        self.id = str(uuid.uuid4())
        self.name = name
        self.skin_path = skin_path

        # Stats storage stuff
        self.kills = 0
        self.deaths = 0
        self.death_order = None
        self.death_tick = None

        # https://www.youtube.com/watch?v=cCu0Z7GwFo4
        self.commands_history = deque(maxlen=20)
        self.last_command = None

        self.x = random.random()
        self.y = random.random()

        self.lvl = 1
        self.hp = (BASE_MAX_HP * 1.2 ** self.lvl)
        self.max_hp = (BASE_MAX_HP * 1.2 ** self.lvl)
        self.hp_regen_rate = BASE_HP_REGEN_RATE
        self.speed = BASE_SPEED

        self.direction = 0
        self.is_dead = False
        self.is_dying = False

        self.attack_damage = BASE_ATTACK_DAMAGE
        self.attack_cooldown = BASE_ATTACK_COOLDOWN
        self.current_attack_cooldown = 0.0

        self.last_input_timestamp = datetime.now()

        self.input_state = {
            "up": False,
            "down": False,
            "left": False,
            "right": False,
            "attack": False
        }
        self.is_attacking = False
        self.is_walking = False

        self._attack_timer = 0.0
        self._attack_pressed_last_tick = False

    # ================= INPUT =================

    def set_input(self, input_state):
        self.input_state = input_state.copy()

    # ================= MOVEMENT =================

    def update_movement(self, dt):
        dx = dy = 0
        self.is_walking = False

        if self.input_state["up"]:
            dy -= 1
            self.direction = 0
        elif self.input_state["down"]:
            dy += 1
            self.direction = 2
        elif self.input_state["right"]:
            dx += 1
            self.direction = 1
        elif self.input_state["left"]:
            dx -= 1
            self.direction = 3

        if dx != 0 or dy != 0:
            self.is_walking = True
            self.x = min(max(self.x + dx * self.speed * dt, 0), 1)
            self.y = min(max(self.y + dy * self.speed * dt, 0), 1)


    # ================= COMBAT =================

    def get_attack_hitbox(self):
        px, py = self.x, self.y

        if self.direction == 0:
            return px - BASE_ATTACK_WIDTH / 2, py - BASE_ATTACK_RANGE, BASE_ATTACK_WIDTH, BASE_ATTACK_RANGE
        if self.direction == 2:
            return px - BASE_ATTACK_WIDTH / 2, py, BASE_ATTACK_WIDTH, BASE_ATTACK_RANGE
        if self.direction == 1:
            return px, py - BASE_ATTACK_WIDTH / 2, BASE_ATTACK_RANGE, BASE_ATTACK_WIDTH
        if self.direction == 3:
            return px - BASE_ATTACK_RANGE, py - BASE_ATTACK_WIDTH / 2, BASE_ATTACK_RANGE, BASE_ATTACK_WIDTH

    def point_in_rect(self, rx, ry, rw, rh, epsilon=0.0):
        return (
            rx - epsilon <= self.x <= rx + rw + epsilon and
            ry - epsilon <= self.y <= ry + rh + epsilon
        )


    def update_stats(self):
        new_max_hp = (BASE_MAX_HP * 1.2 ** self.lvl)
        self.max_hp = new_max_hp if new_max_hp > self.max_hp else self.max_hp
        new_hp_regen_rate = (BASE_HP_REGEN_RATE * 1.2 ** self.lvl)
        self.hp_regen_rate = new_hp_regen_rate if new_hp_regen_rate > self.hp_regen_rate else self.hp_regen_rate
        new_speed = (BASE_SPEED * 1.1 ** self.lvl)
        self.speed = new_speed if new_speed > self.speed else self.speed
        self.attack_damage = (BASE_ATTACK_DAMAGE * 1.2 ** self.lvl)
        self.attack_cooldown = max(0.4, (BASE_ATTACK_COOLDOWN / 1.2 ** self.lvl))

    # ================= SYNC =================

    def to_dict(self):
        return {
            "name": self.name,
            "skinPath": self.skin_path,
            "position": [self.x, self.y],
            "lvl": self.lvl,
            "hp": self.hp,
            "maxHp": self.max_hp,
            "hpRegenRate": self.hp_regen_rate,
            "speed": self.speed,
            "direction": self.direction,
            "isAttacking": self.is_attacking,
            "isWalking": (
                self.input_state.get("up") or
                self.input_state.get("down") or
                self.input_state.get("left") or
                self.input_state.get("right")
            ) if self.is_attacking == False else False,
            "isDying": self.is_dying,
            "attackCooldown": self.attack_cooldown,
            "currentAttackCooldown": self.current_attack_cooldown
        }
