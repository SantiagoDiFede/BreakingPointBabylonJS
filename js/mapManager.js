// MapManager - Builds all rooms at once, no teleportation
class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.currentMap = null;
        this.rooms = [];       // Array of Room instances
        this.roomDefs = [];    // Parallel array of room definitions
    }

    // Pick a random map and build ALL rooms
    initRandomMap() {
        var mapIndex = Math.floor(Math.random() * MAP_DATA.length);
        this.currentMap = MAP_DATA[mapIndex];
        console.log("Selected map: " + this.currentMap.name + " (" + this.currentMap.rooms.length + " rooms)");

        this._buildAllRooms();
    }

    // Build every room in the map at its grid position
    _buildAllRooms() {
        var self = this;
        this.rooms = [];
        this.roomDefs = [];

        this.currentMap.rooms.forEach(function(roomDef) {
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
            var room = new Room(self.scene, ROOM_SIZE, ROOM_SIZE, doorConfig, enemyData, worldX, worldZ);
            room.roomId = roomDef.id;
            room.create();

            self.rooms.push(room);
            self.roomDefs.push(roomDef);

            console.log("Built room: " + roomDef.name + " (id=" + roomDef.id + ") at world (" + worldX + ", " + worldZ + ") enemies=" + enemyData.length);
        });
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
        var startId = this.currentMap.startRoomId;
        for (var i = 0; i < this.roomDefs.length; i++) {
            if (this.roomDefs[i].id === startId) {
                return new BABYLON.Vector3(
                    this.roomDefs[i].gridX * ROOM_SIZE,
                    2,
                    this.roomDefs[i].gridZ * ROOM_SIZE
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

    // Dispose all rooms (for restart / return to menu)
    disposeAll() {
        this.rooms.forEach(function(r) { r.dispose(); });
        this.rooms = [];
        this.roomDefs = [];
    }
}
