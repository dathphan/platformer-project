class Win extends Phaser.Scene {
    constructor() {
        super("win");
    }

    preload() {
        
    }

    create() {
        // Add background
        const { width, height } = this.sys.game.canvas;
        let back = this.add.image(width / 2, height / 2, 'background').setScale(2);
        back.scale = 8.0

        // Add congratulatory text
        this.add.text(width / 2, height / 4, 'Congratulations!', { fontSize: '48px', fill: '#000000' }).setOrigin(0.5);

    }

    // Never get here since a new scene is started in create()
    update(time, delta) {
        if (time > 3000){
            this.scene.start("platformerScene");
        }
    }
}