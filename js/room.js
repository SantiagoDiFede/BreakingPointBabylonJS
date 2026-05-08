class Room {
    constructor(scene, width, depth, doorPositions, enemyData, worldX, worldZ) {
        this.scene = scene;
        this.width = width;
        this.depth = depth;
        this.doorPositions = doorPositions || {};
        this.enemyData = enemyData || [];
        this.meshes = [];
        this.physicsAggregates = [];
        this.enemies = [];
        this.roomId = -1;
        // World offset — room center in world coordinates
        this.worldX = worldX || 0;
        this.worldZ = worldZ || 0;
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
        floorMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        floorMat.maxSimultaneousLights = 4; // Limit lights to prevent shader errors
        floor.material = floorMat;
        this.meshes.push(floor);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            floor, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));

        // Walls (offset by worldX, worldZ)
        this._createWall("north", new BABYLON.Vector3(ox, 2.5, oz + this.depth / 2), this.width, ROOM_HEIGHT, WALL_THICKNESS);
        this._createWall("south", new BABYLON.Vector3(ox, 2.5, oz - this.depth / 2), this.width, ROOM_HEIGHT, WALL_THICKNESS);
        this._createWall("east",  new BABYLON.Vector3(ox + this.width / 2, 2.5, oz), WALL_THICKNESS, ROOM_HEIGHT, this.depth);
        this._createWall("west",  new BABYLON.Vector3(ox - this.width / 2, 2.5, oz), WALL_THICKNESS, ROOM_HEIGHT, this.depth);

        // Room light
        this.light = new BABYLON.PointLight("roomLight_" + this.roomId, new BABYLON.Vector3(ox, 4, oz), this.scene);
        this.light.intensity = 0.5;
        this.meshes.push(this.light);

        // Spawn enemies at world positions (Waiting for all models)
        var self = this;
        var enemyPromises = this.enemyData.map(async function(data) {
            var pos = new BABYLON.Vector3(
                ox + data.position.x,
                data.position.y,
                oz + data.position.z
            );
            var enemy = await createEnemy(self.scene, null, null, pos, data.type);
            if (enemy) {
                self.enemies.push(enemy);
            }
            return enemy;
        });

        await Promise.all(enemyPromises);
    }

    _createWall(direction, position, width, height, depth) {
        var hasDoor = this.doorPositions[direction];
        var doorGap = 4; // width of the door opening

        if (hasDoor) {
            if (direction === "north" || direction === "south") {
                // Horizontal wall with a gap in the center
                var wallPartWidth = (width - doorGap) / 2;
                // Left segment
                this._addWallSegment(
                    direction + "_left_" + this.roomId,
                    new BABYLON.Vector3(position.x - (width / 2 - wallPartWidth / 2), position.y, position.z),
                    wallPartWidth, height, depth
                );
                // Right segment
                this._addWallSegment(
                    direction + "_right_" + this.roomId,
                    new BABYLON.Vector3(position.x + (width / 2 - wallPartWidth / 2), position.y, position.z),
                    wallPartWidth, height, depth
                );
            } else {
                // Vertical wall (east/west) with a gap in the center
                var wallPartDepth = (depth - doorGap) / 2;
                // Bottom segment (negative Z)
                this._addWallSegment(
                    direction + "_bot_" + this.roomId,
                    new BABYLON.Vector3(position.x, position.y, position.z - (depth / 2 - wallPartDepth / 2)),
                    width, height, wallPartDepth
                );
                // Top segment (positive Z)
                this._addWallSegment(
                    direction + "_top_" + this.roomId,
                    new BABYLON.Vector3(position.x, position.y, position.z + (depth / 2 - wallPartDepth / 2)),
                    width, height, wallPartDepth
                );
            }
        } else {
            // Solid wall, no door
            this._addWallSegment(direction + "_" + this.roomId, position, width, height, depth);
        }
    }

    _addWallSegment(name, position, width, height, depth) {
        var uniqueName = name + "_" + Math.random().toString(36).substr(2, 5);
        var wall = BABYLON.MeshBuilder.CreateBox(uniqueName, { width: width, height: height, depth: depth }, this.scene);
        wall.position = position;
        var wallMat = new BABYLON.StandardMaterial(uniqueName + "Mat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        wallMat.maxSimultaneousLights = 4; // Limit lights to prevent shader errors
        wall.material = wallMat;
        this.meshes.push(wall);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            wall, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));
    }

    dispose() {
        this.meshes.forEach(function(m) { if (m.dispose) m.dispose(); });
        this.physicsAggregates.forEach(function(a) { if (a.dispose) a.dispose(); });
        this.enemies.forEach(function(e) {
            if (e.PhysicsAggregate) e.PhysicsAggregate.dispose();
            if (e.dispose) e.dispose();
        });
        this.meshes = [];
        this.physicsAggregates = [];
        this.enemies = [];
    }
}
