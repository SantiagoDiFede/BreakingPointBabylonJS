class Room {
    constructor(scene, width, depth, doorPositions, enemyData, worldX, worldZ, floorTexture) {
        this.scene = scene;
        this.width = width;
        this.depth = depth;
        this.doorPositions = doorPositions || {};
        this.enemyData = enemyData || [];
        this.meshes = [];
        this.physicsAggregates = [];
        this.doorBlocks = []; 
        this.enemies = [];
        this.roomId = -1;
        this.isCleared = false;
        this.isActivated = false; 
        this.isEnemiesLoaded = false;
        
        // World offset
        this.worldX = worldX || 0;
        this.worldZ = worldZ || 0;
        this.floorTexture = floorTexture || null;
    }

    async create() {
        var ox = this.worldX;
        var oz = this.worldZ;

        // Floor
        var floor = BABYLON.MeshBuilder.CreateBox("floor_" + this.roomId, {
            width: this.width, height: 0.1, depth: this.depth
        }, this.scene);
        floor.position = new BABYLON.Vector3(ox, -0.05, oz);
        var floorMat = new BABYLON.StandardMaterial("floorMat_" + this.roomId, this.scene);
        if (this.floorTexture) {
            floorMat.diffuseTexture = new BABYLON.Texture(this.floorTexture, this.scene);
            floorMat.diffuseTexture.uScale = this.width / 30;
            floorMat.diffuseTexture.vScale = this.depth / 30;
        } else {
            floorMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        }
        floorMat.maxSimultaneousLights = 4;
        floor.material = floorMat;
        this.meshes.push(floor);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            floor, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));

        // Walls
        this._createWall("north", new BABYLON.Vector3(ox, 2.5, oz + this.depth / 2), this.width, ROOM_HEIGHT, WALL_THICKNESS);
        this._createWall("south", new BABYLON.Vector3(ox, 2.5, oz - this.depth / 2), this.width, ROOM_HEIGHT, WALL_THICKNESS);
        this._createWall("east",  new BABYLON.Vector3(ox + this.width / 2, 2.5, oz), WALL_THICKNESS, ROOM_HEIGHT, this.depth);
        this._createWall("west",  new BABYLON.Vector3(ox - this.width / 2, 2.5, oz), WALL_THICKNESS, ROOM_HEIGHT, this.depth);

        // Room light
        this.light = new BABYLON.PointLight("roomLight_" + this.roomId, new BABYLON.Vector3(ox, 4, oz), this.scene);
        this.light.intensity = 0.5;
        this.meshes.push(this.light);

        // Check if this room has NO enemies at all (like Spawn).
        if (this.enemyData.length === 0) {
            this.setCleared(true);
        } else {
            // Initially HIDE and DISABLE door blocks for rooms with enemies
            // Crucial: No physics yet!
            this.doorBlocks.forEach(function(block) {
                block.isVisible = false;
                block.setEnabled(false);
            });
        }
    }

    async activateEnemies() {
        if (this.isActivated || this.isCleared) return;
        this.isActivated = true;
        
        console.log("Activating room " + this.roomId + " (" + this.enemyData.length + " enemies)");
        
        // ENABLE door blocks now that player is inside and enemies are spawning
        this.doorBlocks.forEach(function(block) {
            block.setEnabled(true);
            block.isVisible = true;
            // CREATE PHYSICS AGGREGATE ONLY NOW
            if (!block.physicsAggregate) {
                block.physicsAggregate = new BABYLON.PhysicsAggregate(
                    block, BABYLON.PhysicsShapeType.BOX,
                    { mass: 0, restitution: 0, friction: 1 }, block.getScene()
                );
            }
        });

        var self = this;
        var ox = this.worldX;
        var oz = this.worldZ;
        
        var enemyPromises = [];
        this.enemyData.forEach(function(data) {
            var pos = new BABYLON.Vector3(ox + data.position.x, data.position.y, oz + data.position.z);
            var promise = createEnemy(self.scene, null, playerMesh, pos, data.type).then(function(enemy) {
                if (enemy) self.enemies.push(enemy);
            });
            enemyPromises.push(promise);
        });

        await Promise.all(enemyPromises);
        
        this.isEnemiesLoaded = true;
        
        if (this.enemies.length === 0) {
            this.setCleared(true);
        }
    }

    setCleared(isCleared) {
        this.isCleared = isCleared;
        if (isCleared) {
            this.doorBlocks.forEach(function(block) {
                if (block.physicsAggregate) block.physicsAggregate.dispose();
                block.dispose();
            });
            this.doorBlocks = [];
            console.log("Room " + this.roomId + " cleared!");
        }
    }

    getAliveEnemiesCount() {
        if (!this.isActivated) return this.enemyData.length;
        var count = 0;
        this.enemies.forEach(function(enemy) {
            if (enemy && !enemy.isDead) count++;
        });
        return count;
    }

    checkRoomCleared() {
        if (this.isCleared) return true;
        if (!this.isActivated) return false;
        
        // Do not check for clear until all enemies are fully loaded and spawned
        if (!this.isEnemiesLoaded) return false;
        
        var aliveCount = 0;
        this.enemies.forEach(function(enemy) {
            if (enemy && !enemy.isDead) aliveCount++;
        });

        if (aliveCount === 0) {
            this.setCleared(true);
            return true;
        }
        return false;
    }

    _createWall(direction, position, width, height, depth) {
        var hasDoor = this.doorPositions[direction];
        var doorGap = 4;

        if (hasDoor) {
            if (direction === "north" || direction === "south") {
                var wallPartWidth = (width - doorGap) / 2;
                this._addWallSegment(direction + "_left_" + this.roomId, new BABYLON.Vector3(position.x - (width / 2 - wallPartWidth / 2), position.y, position.z), wallPartWidth, height, depth);
                this._addWallSegment(direction + "_right_" + this.roomId, new BABYLON.Vector3(position.x + (width / 2 - wallPartWidth / 2), position.y, position.z), wallPartWidth, height, depth);
                this._addDoorBlock(direction + "_block_" + this.roomId, position, doorGap, height, depth);
            } else {
                var wallPartDepth = (depth - doorGap) / 2;
                this._addWallSegment(direction + "_bot_" + this.roomId, new BABYLON.Vector3(position.x, position.y, position.z - (depth / 2 - wallPartDepth / 2)), width, height, wallPartDepth);
                this._addWallSegment(direction + "_top_" + this.roomId, new BABYLON.Vector3(position.x, position.y, position.z + (depth / 2 - wallPartDepth / 2)), width, height, wallPartDepth);
                this._addDoorBlock(direction + "_block_" + this.roomId, position, width, height, doorGap);
            }
        } else {
            this._addWallSegment(direction + "_" + this.roomId, position, width, height, depth);
        }
    }

    _addWallSegment(name, position, width, height, depth) {
        var uniqueName = name + "_" + Math.random().toString(36).substr(2, 5);
        var wall = BABYLON.MeshBuilder.CreateBox(uniqueName, { width: width, height: height, depth: depth }, this.scene);
        wall.position = position;
        var wallMat = new BABYLON.StandardMaterial(uniqueName + "Mat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        wallMat.maxSimultaneousLights = 4;
        wall.material = wallMat;
        this.meshes.push(wall);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            wall, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));
    }

    _addDoorBlock(name, position, width, height, depth) {
        var block = BABYLON.MeshBuilder.CreateBox(name, { width: width, height: height, depth: depth }, this.scene);
        block.position = position;
        
        var mat = new BABYLON.StandardMaterial(name + "_mat", this.scene);
        mat.diffuseColor = new BABYLON.Color3(1, 0, 0);
        mat.emissiveColor = new BABYLON.Color3(0.5, 0, 0);
        mat.alpha = 0.3;
        block.material = mat;
        
        // DO NOT create physics aggregate here! Wait for activation.
        this.doorBlocks.push(block);
    }

    dispose() {
        this.meshes.forEach(function(m) { if (m.dispose) m.dispose(); });
        this.physicsAggregates.forEach(function(a) { if (a.dispose) a.dispose(); });
        this.doorBlocks.forEach(function(b) {
            if (b.physicsAggregate) b.physicsAggregate.dispose();
            if (b.dispose) b.dispose();
        });
        this.enemies.forEach(function(e) {
            if (e.physicsAggregate) e.physicsAggregate.dispose();
            if (e.dispose) e.dispose();
        });
        this.meshes = [];
        this.physicsAggregates = [];
        this.doorBlocks = [];
        this.enemies = [];
    }
}