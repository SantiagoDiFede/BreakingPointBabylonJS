class Room {
    constructor(scene, width, depth, doorPositions, enemyData) {
        this.scene = scene;
        this.width = width;
        this.depth = depth;
        this.doorPositions = doorPositions || {};
        this.enemyData = enemyData || [];
        this.meshes = [];
        this.physicsAggregates = [];
        this.enemies = [];
        this.roomId = -1;
    }

    create() {
        // Floor
        var floor = BABYLON.MeshBuilder.CreateBox("floor", {
            width: this.width, height: 0.1, depth: this.depth
        }, this.scene);
        floor.position.y = -0.05;
        var floorMat = new BABYLON.StandardMaterial("floorMat", this.scene);
        floorMat.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        floor.material = floorMat;
        this.meshes.push(floor);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            floor, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));

        // Walls
        this._createWall("north", new BABYLON.Vector3(0, 2.5, this.depth / 2), this.width, 5, 0.5);
        this._createWall("south", new BABYLON.Vector3(0, 2.5, -this.depth / 2), this.width, 5, 0.5);
        this._createWall("east", new BABYLON.Vector3(this.width / 2, 2.5, 0), 0.5, 5, this.depth);
        this._createWall("west", new BABYLON.Vector3(-this.width / 2, 2.5, 0), 0.5, 5, this.depth);

        // Light
        var light = new BABYLON.PointLight("roomLight", new BABYLON.Vector3(0, 4, 0), this.scene);
        light.intensity = 0.5;
        this.meshes.push(light);

        // Spawn enemies
        var self = this;
        this.enemyData.forEach(function(data) {
            var pos = (data.position instanceof BABYLON.Vector3)
                ? data.position
                : new BABYLON.Vector3(data.position.x, data.position.y, data.position.z);
            var enemy = createEnemy(self.scene, floor, null, pos, data.type);
            self.enemies.push(enemy);
        });
    }

    _createWall(direction, position, width, height, depth) {
        var hasDoor = this.doorPositions[direction];
        if (hasDoor) {
            var wallPartWidth  = (direction === "north" || direction === "south") ? (width - 4) / 2 : width;
            var wallPartDepth  = (direction === "east"  || direction === "west")  ? (depth - 4) / 2 : depth;

            if (direction === "north" || direction === "south") {
                this._addWallSegment(direction + "_left",
                    position.add(new BABYLON.Vector3(-(width / 2 - wallPartWidth / 2), 0, 0)),
                    wallPartWidth, height, depth);
                this._addWallSegment(direction + "_right",
                    position.add(new BABYLON.Vector3(width / 2 - wallPartWidth / 2, 0, 0)),
                    wallPartWidth, height, depth);
            } else {
                this._addWallSegment(direction + "_top",
                    position.add(new BABYLON.Vector3(0, 0, -(depth / 2 - wallPartDepth / 2))),
                    width, height, wallPartDepth);
                this._addWallSegment(direction + "_bottom",
                    position.add(new BABYLON.Vector3(0, 0, depth / 2 - wallPartDepth / 2)),
                    width, height, wallPartDepth);
            }
            this._createDoorTrigger(direction, position);
        } else {
            this._addWallSegment(direction, position, width, height, depth);
        }
    }

    _addWallSegment(name, position, width, height, depth) {
        var uniqueName = name + "_" + Math.random().toString(36).substr(2, 5);
        var wall = BABYLON.MeshBuilder.CreateBox(uniqueName, { width: width, height: height, depth: depth }, this.scene);
        wall.position = position;
        var wallMat = new BABYLON.StandardMaterial(uniqueName + "Mat", this.scene);
        wallMat.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        wall.material = wallMat;
        this.meshes.push(wall);
        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            wall, BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 }, this.scene
        ));
    }

    _createDoorTrigger(direction, position) {
        var trigger = BABYLON.MeshBuilder.CreateBox("door_trigger_" + direction, {
            width: (direction === "north" || direction === "south") ? 4 : 0.6,
            height: 4,
            depth: (direction === "east"  || direction === "west")  ? 4 : 0.6
        }, this.scene);
        trigger.position = new BABYLON.Vector3(position.x, 2, position.z);
        trigger.visibility = 0.3;
        var trigMat = new BABYLON.StandardMaterial("triggerMat_" + direction, this.scene);
        trigMat.diffuseColor = new BABYLON.Color3(0, 1, 0);
        trigger.material = trigMat;
        trigger.isDoor = true;
        trigger.doorDirection = direction;
        this.meshes.push(trigger);
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
