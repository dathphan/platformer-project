/** @type {import("../types/phaser")} */

class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        this.JUMP_HEIGHT = 3 * 40
        this.JUMP_TIME = 0.5
        this.FALL_TIME = 0.4
        this.JUMP_DIST = 5 * 40
        this.playerParams();


        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;

        this.extra_jumps = 0;
        this.jumps = 0;
        this.coinNum = 0;
    }

    create() {
        this.background = this.add.image(300, 100, 'background').setOrigin(0);
        this.background.scale = 4.0
        this.background.setScrollFactor(0.05);
        this.coinCounter = this.add.text(390, 250, 'Coins: 0', { fontSize: '16px', fill: '#000077' }).setOrigin(0);
        this.coinCounter.setScrollFactor(0)

        this.map = this.add.tilemap("platformer-level-1", 18, 18, 300, 25);

        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create a layer
        this.groundLayer = this.map.createLayer("Ground", this.tileset, 0, 0);
        this.platformLayer = this.map.createLayer("Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151
        });
        this.coinframe = 0;

        this.gems = this.map.createFromObjects("Objects", {
            name: "gem",
            key: "tilemap_sheet",
            frame: 67
        });

        this.flags = this.map.createFromObjects("Objects", {
            name: "flag",
            key: "tilemap_sheet",
            frame: 111
        });

        this.spawn = this.map.getObjectLayer("Objects").objects.find(object => object.name === "spawn");

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.gems, Phaser.Physics.Arcade.STATIC_BODY);

        this.coinGroup = this.add.group(this.coins);
        this.gemsGroup = this.add.group(this.gems);
        this.flagsGroup = this.add.group(this.flags);

        my.sprite.player = this.physics.add.sprite(this.spawn.x, this.spawn.y, "platformer_characters", "tile_0000.png");
        // my.sprite.player.setCollideWorldBounds(true);
        my.sprite.player.setDragX(this.DRAG);

        this.physics.add.collider(my.sprite.player, this.groundLayer);
        this.physics.add.collider(my.sprite.player, this.platformLayer);

        this.coinTimer = 250
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            this.coinNum++
            if (this.coinNum % 5 == 0) {
                
                this.JUMP_DIST += 10
                this.JUMP_HEIGHT += 5
                this.playerParams();
            }
            this.coinCounter.text = "Coins: " + this.coinNum
        });
        this.physics.add.overlap(my.sprite.player, this.gemsGroup, (obj1, obj2) => {
            this.extra_jumps += 1;
            obj2.destroy(); // remove powerup on overlap
        });
        this.physics.add.overlap(my.sprite.player, this.flagsGroup, (obj1, obj2) => {
            this.win();
        });


        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        this.input.keyboard.on('keydown-F1', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);
        this.physics.world.drawDebug = false

        my.vfx.walking = this.add.particles(0, 0, "smoke", {
            random: true,
            scale: {start: 0.3, end: 0.6},
            lifespan: 350,
            gravityY: -200,
            frequency: 100,
            alpha: {start: 1, end: 0.1}, 
        });

        my.vfx.jumping = this.add.particles(0, 0, "smoke", {
            random: true,
            scale: {start: 0.3, end: 0.6},
            speed: { min: 50, max: 50 }, // Adjust the speed of particles
            angle: { min: 0, max: 180 },   // Adjust the angle of emission
            lifespan: 350,
            gravityY: 0,
            frequency: 100,
            alpha: {start: 1, end: 0.1}, 
        });
        
        my.vfx.walking.stop();
        my.vfx.jumping.stop();

        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25);
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        this.cameras.main.roundPixels = true

    }

    update(time, delta) {
        if (my.sprite.player.body.velocity.y < 0) {
            this.platformLayer.setCollisionByExclusion([-1], false);
        } else {
            this.platformLayer.setCollisionByExclusion([-1], true);
        }

        this.playerMovement()
        this.playerJump(delta)

        // Cap Player Speed
        if (Math.abs(my.sprite.player.body.velocity.x) > this.SPEED) {
            my.sprite.player.body.velocity.x = this.SPEED * Math.sign(my.sprite.player.body.velocity.x)
        }

        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            this.respawn();
        }

        // Jump Powerup
        if (this.powerupTimer > 0) {
            console.log(this.powerupTimer);
            this.powerupTimer -= delta
            if (this.powerupTimer <= 0) {
                this.JUMP_VELOCITY = -600;
            }
        }

        this.coinTimer -= delta
        if (this.coinTimer <= 0) {
            this.coinframe = (this.coinframe + 1) % 2
            this.coins.forEach(coin => {
                coin.setFrame(this.coinframe + 151);
                this.coinTimer = 250
            });
        }

        if (this.background.tilePositionX >= this.background.width) {
            this.background.tilePositionX = 0;
        }
    }

    playerMovement() {
        if(cursors.left.isDown) {
            let acceleration_mult = my.sprite.player.body.velocity.x > 0 ? 5 : 1;
            my.sprite.player.setAccelerationX(-this.ACCELERATION * acceleration_mult);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            } else {
                my.vfx.walking.stop();
            }

        } else if(cursors.right.isDown) {
            let acceleration_mult = my.sprite.player.body.velocity.x < 0 ? 5 : 1;
            my.sprite.player.setAccelerationX(this.ACCELERATION * acceleration_mult);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            my.vfx.walking.startFollow(my.sprite.player, my.sprite.player.displayWidth/2-10, my.sprite.player.displayHeight/2-5, false);
            my.vfx.walking.setParticleSpeed(this.PARTICLE_VELOCITY, 0);

            if (my.sprite.player.body.blocked.down) {
                my.vfx.walking.start();
            } else {
                my.vfx.walking.stop();
            }

        } else {
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.anims.play('idle');
            my.vfx.walking.stop();
        }

        if (my.sprite.player.y > 1000) this.respawn()
    }

    playerJump(delta){
        // Jump
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if (Phaser.Input.Keyboard.JustDown(cursors.up)){
            if (this.coyoteTime > 0){
                this.performJump();
            } else if (this.jumps < this.extra_jumps) {
                this.performJump();
                this.jumps++;
            } else {
                this.jump_buffer = this.JUMP_BUFFER
            }
        }
        if (this.jump_buffer > 0 && my.sprite.player.body.blocked.down){
            this.performJump();
        } else {
            this.jump_buffer -= delta
        }

        // Gravity
        if (my.sprite.player.body.velocity.y > 0) {
            this.physics.world.gravity.y = this.JUMP_GRAVITY;
        } else {
            this.physics.world.gravity.y = this.FALL_GRAVITY;
        }

        // Coyote Time
        if (my.sprite.player.body.blocked.down) {
            this.coyoteTime = this.COYOTE_TIME
            this.jumps = 0;
        } else {
            this.coyoteTime -= delta
        }
    }

    performJump() {
        my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        this.coyoteTime = 0;
        this.jump_buffer = 0;

        my.vfx.jumping.explode(10, my.sprite.player.x, my.sprite.player.y);
    }

    win() {
        this.scene.start("win");
    }

    respawn() {
        my.sprite.player.x = this.spawn.x;
        my.sprite.player.y = this.spawn.y;
    }

    playerParams() {
        this.JUMP_VELOCITY = (-2.0 * this.JUMP_HEIGHT) / this.JUMP_TIME;
        this.JUMP_GRAVITY = (2.0 * this.JUMP_HEIGHT) / (this.JUMP_TIME * this.JUMP_TIME);
        this.FALL_GRAVITY = (2.0 * this.JUMP_HEIGHT) / (this.FALL_TIME * this.FALL_TIME);
        this.COYOTE_TIME = 100
        this.JUMP_BUFFER = 100

        this.ACCELERATION = 400;
        this.SPEED = this.JUMP_DIST / (this.JUMP_TIME + this.FALL_TIME)
        this.DRAG = 600;    // DRAG < ACCELERATION = icy slide
    }
}