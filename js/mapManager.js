// MapManager - Builds all rooms at once, no teleportation
class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.currentMap = null;
        this.rooms = [];       // Array of Room instances
        this.roomDefs = [];    // Parallel array of room definitions
    }

    // Step 1: Just pick the data
    selectRandomMap() {
        var mapIndex = Math.floor(Math.random() * MAP_DATA.length);
        this.currentMap = MAP_DATA[mapIndex];
        console.log("Selected map: " + this.currentMap.name);
        return this.currentMap;
    }

    // Step 2: Build the rooms for the currently selected map
    async buildSelectedMap() {
        if (!this.currentMap) return;
        console.log("Building map: " + this.currentMap.name + " (" + this.currentMap.rooms.length + " rooms)");
        await this._buildAllRooms();
    }

    // Original combined method for backward compatibility if needed
    async initRandomMap() {
        this.selectRandomMap();
        await this.buildSelectedMap();
    }

    // Dispose all current rooms and their contents
    disposeMap() {
        this.rooms.forEach(room => {
            room.meshes.forEach(m => {
                if (m.dispose) m.dispose();
            });
            room.enemies.forEach(e => {
                if (e.dispose) e.dispose();
                // If it has physics
                if (e.physicsAggregate) e.physicsAggregate.dispose();
            });
            room.doorBlocks.forEach(b => b.dispose());
        });
        this.rooms = [];
        this.roomDefs = [];
    }

    // Build every room in the map at its grid position
    async _buildAllRooms() {
        var self = this;
        this.rooms = [];
        this.roomDefs = [];

        // Build rooms one by one or in parallel
        // Using parallel for speed, but room.create is already internally parallel for enemies
        var roomPromises = this.currentMap.rooms.map(async function(roomDef) {
            // Compute world position from grid coordinates
            var worldX = roomDef.gridX * ROOM_SIZE;
            var worldZ = roomDef.gridZ * ROOM_SIZE;

            // Build door config (which directions have openings)
            var doorConfig = {};
            if (roomDef.doors.north !== undefined) doorConfig.north = true;
            if (roomDef.doors.south !== undefined) doorConfig.south = true;
            if (roomDef.doors.east  !== undefined) doorConfig.east  = true;
            if (roomDef.doors.west  !== undefined) doorConfig.west  = true;

            // Generate enemies
            var enemyData = self._generateEnemies(roomDef);

            // Create room at world position
            var room = new Room(self.scene, ROOM_SIZE, ROOM_SIZE, doorConfig, enemyData, worldX, worldZ, self.currentMap.floorTexture);
            room.roomId = roomDef.id;
            await room.create(); // Wait for room and its enemies to be created

            self.rooms.push(room);
            self.roomDefs.push(roomDef);

            console.log("Built room: " + roomDef.name + " (id=" + roomDef.id + ") at world (" + worldX + ", " + worldZ + ") enemies=" + enemyData.length);
        });

        await Promise.all(roomPromises);
    }

    // Generate random enemies for a room definition
    _generateEnemies(roomDef) {
        if (!roomDef.allowedEnemyTypes || roomDef.allowedEnemyTypes.length === 0) return [];

        var min = roomDef.enemyCount.min;
        var max = roomDef.enemyCount.max;
        var count = min + Math.floor(Math.random() * (max - min + 1));
        var margin = 5;
        var enemies = [];

        for (var i = 0; i < count; i++) {
            var x = (Math.random() - 0.5) * (ROOM_SIZE - margin * 2);
            var z = (Math.random() - 0.5) * (ROOM_SIZE - margin * 2);
            var typeIdx = Math.floor(Math.random() * roomDef.allowedEnemyTypes.length);
            var type = roomDef.allowedEnemyTypes[typeIdx];
            enemies.push({ type: type, position: { x: x, y: 1, z: z } });
        }

        return enemies;
    }

    // Determine which room the player is currently in based on position
    getCurrentRoom() {
        if (!playerMesh) return null;
        var px = playerMesh.position.x;
        var pz = playerMesh.position.z;

        for (var i = 0; i < this.rooms.length; i++) {
            var room = this.rooms[i];
            var halfW = room.width / 2;
            var halfD = room.depth / 2;
            if (px >= room.worldX - halfW && px <= room.worldX + halfW &&
                pz >= room.worldZ - halfD && pz <= room.worldZ + halfD) {
                return room;
            }
        }
        return null;
    }

    // Get the room definition for the room the player is currently in
    getCurrentRoomDef() {
        var room = this.getCurrentRoom();
        if (!room) return null;
        for (var i = 0; i < this.roomDefs.length; i++) {
            if (this.roomDefs[i].id === room.roomId) return this.roomDefs[i];
        }
        return null;
    }

    // Get spawn position (center of start room)
    getSpawnPosition() {
        if (!this.currentMap) return new BABYLON.Vector3(0, 2, 0);
        var startId = this.currentMap.startRoomId;
        
        // Prefer using currentMap.rooms directly if build hasn't happened yet
        var roomsToSearch = this.currentMap.rooms;
        
        for (var i = 0; i < roomsToSearch.length; i++) {
            var r = roomsToSearch[i];
            if (r.id === startId) {
                return new BABYLON.Vector3(
                    r.gridX * ROOM_SIZE,
                    2,
                    r.gridZ * ROOM_SIZE
                );
            }
        }
        return new BABYLON.Vector3(0, 2, 0);
    }

    getMapName() {
        return this.currentMap ? this.currentMap.name : "None";
    }

    getRoomCount() {
        return this.currentMap ? this.currentMap.rooms.length : 0;
    }

    getCurrentRoomName() {
        var def = this.getCurrentRoomDef();
        return def ? def.name : "—";
    }

    // Get count of alive enemies in current room
    getAliveEnemiesCount() {
        var room = this.getCurrentRoom();
        return room ? room.getAliveEnemiesCount() : 0;
    }

    // Check if the player's current room is cleared of enemies
    checkCurrentRoomCleared() {
        var room = this.getCurrentRoom();
        if (room) {
            // Trigger spawning if not already active
            room.activateEnemies();
            return room.checkRoomCleared();
        }
        return true;
    }

    // Check if the whole map is cleared
    isAllRoomsCleared() {
        return this.rooms.every(room => room.isCleared);
    }

    getUnclearedRoomsCount() {
        return this.rooms.filter(room => !room.isCleared).length;
    }

    // Manage lights based on player proximity to avoid GL_MAX_VERTEX_UNIFORM_BUFFERS error
    updateProximityLights() {
        var currentRoomDef = this.getCurrentRoomDef();
        if (!currentRoomDef) return;

        // Collect IDs of current room and its direct neighbors
        var activeRoomIds = new Set();
        activeRoomIds.add(currentRoomDef.id);
        
        if (currentRoomDef.doors) {
            for (var dir in currentRoomDef.doors) {
                activeRoomIds.add(currentRoomDef.doors[dir]);
            }
        }

        // Toggle room lights
        for (var i = 0; i < this.rooms.length; i++) {
            var room = this.rooms[i];
            if (room.light) {
                room.light.setEnabled(activeRoomIds.has(room.roomId));
            }
        }
    }

    // Dispose all rooms (for restart / return to menu)
    disposeAll() {
        this.rooms.forEach(function(r) { r.dispose(); });
        this.rooms = [];
        this.roomDefs = [];
    }
}
