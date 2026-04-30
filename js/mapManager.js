// MapManager - Handles map selection, room tracking, and transitions
class MapManager {
    constructor(scene) {
        this.scene = scene;
        this.currentMap = null;
        this.currentRoomDef = null;
        this.currentRoom = null;
        this.visitedRooms = new Set();
    }

    // Pick a random map and load the spawn room
    initRandomMap() {
        var mapIndex = Math.floor(Math.random() * MAP_DATA.length);
        this.currentMap = MAP_DATA[mapIndex];
        this.visitedRooms.clear();
        console.log("Selected map: " + this.currentMap.name + " (" + this.currentMap.rooms.length + " rooms)");

        this._loadRoom(this.currentMap.startRoomId);
    }

    // Get room definition by ID from current map
    _getRoomDef(roomId) {
        for (var i = 0; i < this.currentMap.rooms.length; i++) {
            if (this.currentMap.rooms[i].id === roomId) return this.currentMap.rooms[i];
        }
        return null;
    }

    // Generate random enemies for a room
    _generateEnemies(roomDef) {
        if (!roomDef.allowedEnemyTypes || roomDef.allowedEnemyTypes.length === 0) return [];

        var min = roomDef.enemyCount.min;
        var max = roomDef.enemyCount.max;
        var count = min + Math.floor(Math.random() * (max - min + 1));
        var margin = 15;
        var enemies = [];

        for (var i = 0; i < count; i++) {
            var x = (Math.random() - 0.5) * (roomDef.width - margin * 2);
            var z = (Math.random() - 0.5) * (roomDef.depth - margin * 2);
            var typeIdx = Math.floor(Math.random() * roomDef.allowedEnemyTypes.length);
            var type = roomDef.allowedEnemyTypes[typeIdx];
            enemies.push({ type: type, position: { x: x, y: 1, z: z } });
        }

        return enemies;
    }

    // Build door config: only include directions that have connections
    _buildDoorConfig(roomDef) {
        var doors = {};
        if (roomDef.doors.north !== undefined) doors.north = true;
        if (roomDef.doors.south !== undefined) doors.south = true;
        if (roomDef.doors.east !== undefined) doors.east = true;
        if (roomDef.doors.west !== undefined) doors.west = true;
        return doors;
    }

    // Load a room by ID
    _loadRoom(roomId) {
        if (this.currentRoom) {
            this.currentRoom.dispose();
        }

        var roomDef = this._getRoomDef(roomId);
        if (!roomDef) {
            console.error("Room not found: " + roomId);
            return;
        }

        this.currentRoomDef = roomDef;
        var doorConfig = this._buildDoorConfig(roomDef);

        // Generate enemies only on first visit
        var enemyData = [];
        if (!this.visitedRooms.has(roomId)) {
            enemyData = this._generateEnemies(roomDef);
            this.visitedRooms.add(roomId);
        }

        this.currentRoom = new Room(this.scene, roomDef.width, roomDef.depth, doorConfig, enemyData);
        this.currentRoom.roomId = roomId;
        this.currentRoom.create();

        console.log("Loaded room: " + roomDef.name + " (id=" + roomId + ", enemies=" + enemyData.length + ", visited=" + this.visitedRooms.size + "/" + this.currentMap.rooms.length + ")");
    }

    // Transition to the room connected via doorDirection
    transitionToRoom(doorDirection) {
        if (!this.currentRoomDef || !this.currentRoomDef.doors[doorDirection]) {
            console.warn("No connection for door: " + doorDirection);
            return null;
        }

        var targetId = this.currentRoomDef.doors[doorDirection];
        this._loadRoom(targetId);
        return this.currentRoom;
    }

    getCurrentRoom() {
        return this.currentRoom;
    }

    getMapName() {
        return this.currentMap ? this.currentMap.name : "None";
    }

    getRoomCount() {
        return this.currentMap ? this.currentMap.rooms.length : 0;
    }

    getVisitedCount() {
        return this.visitedRooms.size;
    }
}
