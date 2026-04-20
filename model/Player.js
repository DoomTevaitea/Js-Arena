const directions = { north: 0, east: 1, south: 2, west: 3 };

export default class Player {
  constructor(id, name, skinPath, position) {
    this.id = id;
    this.name = name;
    this.skinPath = skinPath;
    this.position = position;

    // --- Positions ---
    this.prevX = position[0];
    this.prevY = position[1];
    this.renderX = position[0];
    this.renderY = position[1];
    this.x = position[0];
    this.y = position[1];

    // --- Stats ---
    this.lvl = 1;
    this.hp = 100;
    this.maxHp = 100;
    this.speed = 0.2;

    // --- States ---
    this.direction = directions.south;
    this.isWalking = false;
    this.isAttacking = false;
    this.isDying = false;
    this.isDead = false;

    // === WALK ===
    this.walkFrameCounter = 0;
    this.walkSpriteIndex = 0;
    this.walkSpritesNumber = 9;
    this.walkFramesPerSprite = 10;

    // === ATTACK ===
    this.attackFrameCounter = 0;
    this.attackSpriteIndex = 0;
    this.attackSpritesNumber = 6;
    this.attackFramesPerSprite = 8;

    // === DEATH ===
    this.deathFrameCounter = 0;
    this.deathSpriteIndex = 0;
    this.deathSpritesNumber = 6;
    this.deathFramesPerSprite = 10;
  }

  update(updateData) {
    // Sauvegarde position précédente
    this.prevX = this.x;
    this.prevY = this.y;

    // Position serveur
    this.x = updateData.position[0];
    this.y = updateData.position[1];

    // Autres données
    this.name = updateData.name;
    this.lvl = updateData.lvl;
    this.hp = updateData.hp;
    this.maxHp = updateData.maxHp;
    this.speed = updateData.speed;
    this.direction = updateData.direction;
    this.isWalking = updateData.isWalking;
    this.isAttacking = updateData.isAttacking;
    this.isDying = updateData.isDying;
    this.skinPath = updateData.skinPath;
    this.attackCooldown = updateData.attackCooldown;
    this.currentAttackCooldown = updateData.currentAttackCooldown;
  }

  animate() {
    // ================= WALK =================
    if (this.isWalking) {
      this.walkFrameCounter++;
      this.walkSpriteIndex =
        Math.floor(this.walkFrameCounter / this.walkFramesPerSprite) %
        this.walkSpritesNumber;
    } else {
      this.walkFrameCounter = 0;
      this.walkSpriteIndex = 0;
    }

    // ================= ATTACK =================
    if (
      this.isAttacking ||
      this.attackFrameCounter > 0 ||
      this.attackSpriteIndex > 0
    ) {
      this.attackFrameCounter++;
      // On vérifie si on a attendu assez longtemps
      if (this.attackFrameCounter >= this.attackFramesPerSprite) {
        this.attackFrameCounter = 0;
        this.attackSpriteIndex++;
      }
      if (this.attackSpriteIndex >= this.attackSpritesNumber) {
        this.attackSpriteIndex = 0;
        // Optionnel : Si vous voulez que l'animation s'arrête pile à la fin
        // vous pouvez ajouter ici : this.isAttacking = false;
      }
    } else {
      // MODIFICATION ICI : On ne remet PLUS AttackSpriteDuration à 0
      // On reset juste l'index et le frame actuel
      this.attackFrameCounter = 0;
      this.attackSpriteIndex = 0;
    }

    // ================= DEATH =================
    if (this.isDying) {
      this.deathFrameCounter++;
      if (this.deathFrameCounter >= this.deathFramesPerSprite) {
        this.deathFrameCounter = 0;
        this.deathSpriteIndex++;
      }
      if (this.deathSpriteIndex >= this.deathSpritesNumber) {
        this.isDead = true;
      }
    }
  }

  interpolate(alpha) {
    this.renderX = this.prevX + (this.x - this.prevX) * alpha;
    this.renderY = this.prevY + (this.y - this.prevY) * alpha;
  }
}
