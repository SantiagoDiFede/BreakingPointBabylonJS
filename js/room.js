class Room {
    constructor(scene, width, depth, doorPositions = {}, enemyData = []) {
        this.scene = scene;
        this.width = width;
        this.depth = depth;
        this.doorPositions = doorPositions; // { north: true, south: false, east: true, west: false }
        this.enemyData = enemyData; // Array of { type: 'box', position: Vector3 }
        this.meshes = [];
        this.physicsAggregates = [];
        this.enemies = [];
    }

    create() {
        // Create Floor
        const floor = BABYLON.MeshBuilder.CreateBox("floor", {
            width: this.width,
            height: 0.1,
            depth: this.depth
        }, this.scene);
        floor.position.y = -0.05;
        this.meshes.push(floor);

        const floorMaterial = new BABYLON.StandardMaterial("floorMat", this.scene);
        floorMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.4, 0.4);
        floor.material = floorMaterial;

        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            floor,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 },
            this.scene
        ));

        // Create Walls
        this._createWall("north", new BABYLON.Vector3(0, 2.5, this.depth / 2), this.width, 5, 0.5);
        this._createWall("south", new BABYLON.Vector3(0, 2.5, -this.depth / 2), this.width, 5, 0.5);
        this._createWall("east", new BABYLON.Vector3(this.width / 2, 2.5, 0), 0.5, 5, this.depth);
        this._createWall("west", new BABYLON.Vector3(-this.width / 2, 2.5, 0), 0.5, 5, this.depth);

        // Create Light for the room
        const light = new BABYLON.PointLight("roomLight", new BABYLON.Vector3(0, 4, 0), this.scene);
        light.intensity = 0.5;
        this.meshes.push(light);

        // Spawn Enemies
        this.enemyData.forEach(data => {
            const enemy = createEnemy(this.scene, floor, null, data.position);
            this.enemies.push(enemy);
        });
    }

    _createWall(direction, position, width, height, depth) {
        const hasDoor = this.doorPositions[direction];
        
        if (hasDoor) {
            // Split wall into two parts or add a trigger
            const wallPartWidth = (direction === "north" || direction === "south") ? (width - 4) / 2 : width;
            const wallPartDepth = (direction === "east" || direction === "west") ? (depth - 4) / 2 : depth;

            if (direction === "north" || direction === "south") {
                this._addWallSegment(`${direction}_left`, 
                    position.add(new BABYLON.Vector3(-(width / 2 - wallPartWidth / 2), 0, 0)), 
                    wallPartWidth, height, depth);
                this._addWallSegment(`${direction}_right`, 
                    position.add(new BABYLON.Vector3(width / 2 - wallPartWidth / 2, 0, 0)), 
                    wallPartWidth, height, depth);
                
                // Add Door Trigger
                this._createDoorTrigger(direction, position);
            } else {
                this._addWallSegment(`${direction}_top`, 
                    position.add(new BABYLON.Vector3(0, 0, -(depth / 2 - wallPartDepth / 2))), 
                    width, height, wallPartDepth);
                this._addWallSegment(`${direction}_bottom`, 
                    position.add(new BABYLON.Vector3(0, 0, depth / 2 - wallPartDepth / 2)), 
                    width, height, wallPartDepth);
                
                // Add Door Trigger
                this._createDoorTrigger(direction, position);
            }
        } else {
            this._addWallSegment(direction, position, width, height, depth);
        }
    }

    _addWallSegment(name, position, width, height, depth) {
        const wall = BABYLON.MeshBuilder.CreateBox(name, { width, height, depth }, this.scene);
        wall.position = position;
        this.meshes.push(wall);

        const wallMaterial = new BABYLON.StandardMaterial(name + "Mat", this.scene);
        wallMaterial.diffuseColor = new BABYLON.Color3(0.6, 0.6, 0.6);
        wall.material = wallMaterial;

        this.physicsAggregates.push(new BABYLON.PhysicsAggregate(
            wall,
            BABYLON.PhysicsShapeType.BOX,
            { mass: 0, restitution: 0, friction: 1 },
            this.scene
        ));
    }

    _createDoorTrigger(direction, position) {
        const trigger = BABYLON.MeshBuilder.CreateBox(`door_trigger_${direction}`, {
            width: (direction === "north" || direction === "south") ? 4 : 0.6,
            height: 4,
            depth: (direction === "east" || direction === "west") ? 4 : 0.6
        }, this.scene);
        trigger.position = position;
        trigger.position.y = 2;
        trigger.visibility = 0.3; // Semitransparent for debugging, can be 0 later
        
        const triggerMaterial = new BABYLON.StandardMaterial("triggerMat", this.scene);
        triggerMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0);
        trigger.material = triggerMaterial;

        this.meshes.push(trigger);
        
        // Custom property to identify door
        trigger.isDoor = true;
        trigger.doorDirection = direction;
    }

    dispose() {
        this.meshes.forEach(m => m.dispose());
        this.physicsAggregates.forEach(a => a.dispose());
        this.enemies.forEach(e => {
            if (e.dispose) e.dispose();
            // Need to handle enemy removal correctly
        });
        this.meshes = [];
        this.physicsAggregates = [];
        this.enemies = [];
    }
}
