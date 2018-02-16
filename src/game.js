'use strict';

var gamePlayer;
var platforms = [];

const fieldWidth = 800;
const fieldHeight = 600;

const platformDistance = 120;
const platformHeight = 20;

const delta = 20;
const stateTime = 5000;
const levelTimeLimit = 30000;
const jumpHeight = -10;
const characterSpriteSize = 48;

var gameState = {
  LEVEL_STARTING: 1,
  LEVEL_PLAYING: 2,
  LEVEL_FINISHED: 3,
  LEVEL_FAILED: 4
};
var direction = {
  RIGHT: 0,
  LEFT: 1
};

var backgroundImage = new Image();
backgroundImage.src = 'img/background.png';

var platformImage = new Image();
platformImage.src = 'img/platform.png';

function startGame() {
  game.start();
  gamePlayer = new Player();
  initLevel();
}

var game = {
  canvas: document.createElement('canvas'),
  start: function () {
    this.time = 0;
    this.level = 1;
    this.score = 0;
    this.state = gameState.LEVEL_STARTING;
    this.previousScore = 0;
    this.statusMessage = '';
    this.canvas.width = fieldWidth;
    this.canvas.height = fieldHeight;
    this.context = this.canvas.getContext('2d');
    this.interval = setInterval(updateGame, delta);
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    window.addEventListener('keydown', function (e) {
      game.keys = (game.keys || []);
      game.keys[e.keyCode] = true;
    });
    window.addEventListener('keyup', function (e) {
      game.keys[e.keyCode] = false;
    });
  },
  clear: function () {
    this.context.drawImage(backgroundImage, 0, 0);
  },
  changeState: function (newState) {
    this.time = 0;
    this.state = newState;
  }
};

function Platform(width, x, y) {
  this.width = width;
  this.height = platformHeight;
  this.x = x;
  this.y = y;
  this.update = function () {
    this.y += Platform.speed;
  };
  this.draw = function () {
    var ctx = game.context;
    ctx.drawImage(platformImage, 0, 0, this.width, this.height, this.x, this.y, this.width, this.height);
  };
}

function Player() {
  this.image = new Image();
  this.image.src = 'img/character.png';
  this.direction = direction.RIGHT;
  this.animationState = 0;
  this.width = 32;
  this.height = 48;
  this.speedX = 0;
  this.speedY = 0;
  this.dead = false;
  this.onGround = false;
  this.x = fieldWidth / 2 - this.width / 2;
  this.y = fieldHeight - 80;
  this.draw = function () {
    if (!this.dead) {
      var ctx = game.context;
      if (this.onGround) {
        ctx.drawImage(this.image, Math.floor(this.animationState) * characterSpriteSize + 4, this.direction * characterSpriteSize, this.width + 8, this.height, this.x - 4, this.y, this.width + 8, this.height);
      } else {
        ctx.drawImage(this.image, Math.floor(this.animationState) * characterSpriteSize + 4, (this.direction + 2) * characterSpriteSize, this.width + 8, this.height, this.x - 4, this.y, this.width + 8, this.height);
      }
    }
  };

  this.reset = function () {
    this.x = fieldWidth / 2 - this.width / 2;
    this.y = fieldHeight - 80;
    this.speedX = 0;
    this.speedY = 0;
    this.animationState = 0;
    this.direction = direction.RIGHT;
    this.dead = false;
  };

  this.jump = function () {
    if (this.onGround) {
      this.animationState = 0;
      this.speedY = jumpHeight;
    }
  };

  this.moveLeft = function (step) {
    this.direction = direction.LEFT;
    if (this.speedX > -5) {
      this.speedX = mathClamp(this.speedX - 0.3 * step, -5, 5);
    }
  };

  this.moveRight = function (step) {
    this.direction = direction.RIGHT;
    if (this.speedX < 5) {
      this.speedX = mathClamp(this.speedX + 0.3 * step, -5, 5);
    }
  };

  this.updateAnimation = function (step) {
    gamePlayer.animationState += step / 1000;
    if (gamePlayer.animationState > 4) {
      gamePlayer.animationState = 0;
    }
  };

  this.update = function (step) {
    // Makes sure the player stays within the screen bounds
    if (this.x < 0) {
      this.x = 0;
      this.speedX = 0;
    }
    if (this.x + this.width > fieldWidth) {
      this.x = fieldWidth - this.width;
      this.speedX = 0;
    }

    if (this.y < 0) {
      this.y = 0;
      this.speedY = 0;
    }
    // Lower bound only checked when game is won since dying is not possible
    if (game.state === gameState.LEVEL_FINISHED && this.y + this.height > fieldHeight) {
      this.y = fieldHeight - this.height;
      this.speedY = 0;
    }

    // Updates position according to current speed
    this.y += Platform.speed;
    if (this.speedX === 0 || !this.onGround) {
      this.animationState = 0;
    } else {
      this.updateAnimation(Math.abs(this.speedX) * step);
    }
    this.x += this.speedX * (step / 30);
    this.y += this.speedY * (step / 30);

    // Reduces speed according to friction and gravity
    if (this.speedX > 0) {
      this.speedX = mathClamp(this.speedX - 0.01 * step, 0, 5);
    }
    if (this.speedX < 0) {
      this.speedX = mathClamp(this.speedX + 0.01 * step, -5, 0);
    }
    if (this.onGround === false && this.speedY <= 10) {
      this.speedY += 0.25 * (step / 30);
    }
  };

  this.checkIfOnGround = function (object) {
    if (Math.abs((this.y + this.height) - object.y) < 0.2 && this.x >= object.x - this.width && this.x <= object.x + object.width) {
      this.onGround = true;
    }
    return false;
  };

  this.checkCollision = function (platform) {
    var distanceX = (this.x + (this.width / 2)) - (platform.x + (platform.width / 2));
    var distanceY = (this.y + (this.height / 2)) - (platform.y + (platform.height / 2));
    var halfWidths = (this.width / 2) + (platform.width / 2);
    var halfHeights = (this.height / 2) + (platform.height / 2);

    if (Math.abs(distanceX) < halfWidths && Math.abs(distanceY) < halfHeights) {
      var originX = halfWidths - Math.abs(distanceX);
      var originY = halfHeights - Math.abs(distanceY);
      if (originX >= originY) {
        if (distanceY > 0) {
          this.y += originY + 5;
          this.speedY = 0;
        } else {
          this.y -= originY;
          this.speedY = 0;
        }
      } else {
        if (distanceX > 0) {
          this.x += originX;
          this.speedX = 0;
        } else {
          this.x -= originX;
          this.speedX = 0;
        }
      }
    }
  };

  this.checkIfDead = function () {
    if (this.y + this.height > fieldHeight) {
      this.dead = true;
      return true;
    }
    return false;
  };
}

function initLevel() {
  platforms = []; // clear old platforms
  gamePlayer.reset();
  var numberOfPlatforms = fieldHeight / platformDistance;
  Platform.speed = 0;
  Platform.previousLo = 0;
  Platform.previousHi = 0;
  for (var i = 0; i <= numberOfPlatforms; ++i) {
    if (i === 0) {
      // create a solid platform without a gap at the level bottom
      platforms.push(new Platform(fieldWidth, 0, (fieldHeight - platformHeight) - i * platformDistance));
    } else {
      createPlatform((fieldHeight - platformHeight) - i * platformDistance);
    }
  }
}

function createPlatform(height) {
  var minGap = 80;
  var maxGap = 200;
  var minWidth = 5;
  var maxWidth = fieldWidth - (maxGap + minWidth);
  var width = getRandomInt(minWidth, maxWidth);
  var gap = getRandomInt(minGap, maxGap);
  if (mathIntervalOverlap(Platform.previousLo, Platform.previousHi, width, width + gap)) {
    var oldGap = Platform.previousHi - Platform.previousLo;
    if (Platform.previousLo + oldGap / 2 > fieldWidth / 2) {
      width = Platform.previousLo - gap;
    } else {
      width = Platform.previousHi;
    }
  }
  platforms.push(new Platform(width, 0, height));
  platforms.push(new Platform(fieldWidth - width - gap, width + gap, height));
  Platform.previousLo = width;
  Platform.previousHi = width + gap;
}

function drawUI() {
  drawOutlinedText('Level: ' + game.level, 5, 30, 'left');
  drawOutlinedText('Score: ' + (game.score + game.previousScore), fieldWidth - 5, 30, 'right');

  if (game.state === gameState.LEVEL_STARTING) {
    drawOutlinedText('Level starting in ' + Math.ceil((stateTime - game.time) / 1000) + ' seconds', 5, fieldHeight - 20, 'left');
  } else if (game.state === gameState.LEVEL_FINISHED) {
    drawOutlinedText('Level complete!', 5, fieldHeight - 20, 'left');
  } else if (game.state === gameState.LEVEL_FAILED) {
    drawOutlinedText('Level failed!', 5, fieldHeight - 20, 'left');
  }
}

function drawOutlinedText(text, x, y, align) {
  var ctx = game.context;
  ctx.textAlign = align;
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 6;
  ctx.lineJoin = 'miter';
  ctx.miterLimit = 2;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = 'white';
  ctx.font = '30px Arial';
  ctx.fillText(text, x, y);
}

function updateGame() {
  game.time += delta;

  if (game.state === gameState.LEVEL_STARTING) {
    if (game.time >= stateTime) {
      game.changeState(gameState.LEVEL_PLAYING);
      Platform.speed = game.level * (1 / 5) + 0.2;
    }
  }

  if (game.state === gameState.LEVEL_PLAYING) {
    game.score = game.time;

    if (game.time >= levelTimeLimit) {
      game.changeState(gameState.LEVEL_FINISHED);
      Platform.speed = 0;
    }

    if (platforms[platforms.length - 1].y > platformDistance - 20) {
      createPlatform(platforms[platforms.length - 1].y - platformDistance);
    }
  }

  if (game.state === gameState.LEVEL_FINISHED) {
    if (game.time >= stateTime) {
      game.changeState(gameState.LEVEL_STARTING);
      game.previousScore += game.score;
      game.score = 0;
      game.level++;
      initLevel();
    }
  }

  if (game.state === gameState.LEVEL_FAILED) {
    if (game.time >= stateTime) {
      initLevel();
      game.changeState(gameState.LEVEL_STARTING);
      game.score = 0;
    }
  }

  if (game.state !== gameState.LEVEL_FAILED) {
    gamePlayer.onGround = false;
    for (var i = 0; i < platforms.length; ++i) {
      gamePlayer.checkIfOnGround(platforms[i]);
      gamePlayer.checkCollision(platforms[i]);
      platforms[i].update();
    }
    if (game.keys && game.keys[37]) {
      gamePlayer.moveLeft(delta);
    }
    if (game.keys && game.keys[38]) {
      gamePlayer.jump();
    } else if (gamePlayer.speedY < 0) {
      gamePlayer.speedY = mathClamp(gamePlayer.speedY + delta / 100, jumpHeight, 0);
    }
    if (game.keys && game.keys[39]) {
      gamePlayer.moveRight(delta);
    }

    if (game.state !== gameState.LEVEL_FINISHED) {
      if (gamePlayer.checkIfDead()) {
        game.changeState(gameState.LEVEL_FAILED);
      }
    }
    if (!gamePlayer.dead) {
      gamePlayer.update(delta);
    }
  }

  // Draw the game
  game.clear();
  gamePlayer.draw();
  for (i = 0; i < platforms.length; ++i) {
    platforms[i].draw();
  }
  drawUI();
}

function mathClamp(v, lo, hi) {
  return Math.min(Math.max(lo, v), hi);
}

function mathIntervalOverlap(firstLo, firstHi, secondLo, secondHi) {
  return !((firstLo < secondLo && firstHi < secondLo) || (firstLo > secondLo && firstLo > secondHi));
}

function getRandomInt(min, max) {
  // Returns a random integer in the interval min, max (including both min and max)
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
