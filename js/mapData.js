// 10 predefined maps for roguelike gameplay
// Each map has 7-12 rooms. Room 0 is always the spawn room.
// Door connections: { direction: targetRoomId }
// enemyCount: {min, max} for random spawn on first visit
// allowedEnemyTypes: array of enemy type keys from ENEMY_TYPES

function _r(id, name, w, d, doors, eMin, eMax, types) {
    return {
        id: id, name: name, width: w, depth: d,
        doors: doors,
        enemyCount: { min: eMin, max: eMax },
        allowedEnemyTypes: types || ["box"]
    };
}

var MAP_DATA = [
    // ===== MAP 0: The Gauntlet (7 rooms, linear) =====
    {
        name: "The Gauntlet",
        startRoomId: 0,
        rooms: [
            _r(0, "Spawn", 30, 30, { north: 1 }, 0, 0, []),
            _r(1, "Hall 1", 125, 125, { south: 0, north: 2 }, 2, 4, ["box"]),
            _r(2, "Hall 2", 150, 100, { south: 1, north: 3 }, 3, 5, ["box"]),
            _r(3, "Hall 3", 125, 125, { south: 2, north: 4 }, 3, 5, ["box", "fast_box"]),
            _r(4, "Hall 4", 100, 150, { south: 3, north: 5 }, 4, 6, ["box", "fast_box"]),
            _r(5, "Hall 5", 150, 125, { south: 4, north: 6 }, 4, 6, ["box", "sphere"]),
            _r(6, "Final", 150, 150, { south: 5 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 1: The Cross (9 rooms) =====
    {
        name: "The Cross",
        startRoomId: 0,
        rooms: [
            _r(0, "Center", 30, 30, { north: 1, east: 2, south: 3, west: 4 }, 0, 0, []),
            _r(1, "North", 125, 125, { south: 0, east: 5 }, 2, 4, ["box"]),
            _r(2, "East", 125, 125, { west: 0, north: 6 }, 2, 4, ["box"]),
            _r(3, "South", 125, 125, { north: 0, east: 7 }, 2, 4, ["box", "fast_box"]),
            _r(4, "West", 125, 125, { east: 0 }, 3, 5, ["box"]),
            _r(5, "NE Wing", 150, 100, { west: 1 }, 3, 5, ["fast_box"]),
            _r(6, "EN Wing", 100, 150, { south: 2 }, 3, 5, ["sphere"]),
            _r(7, "SE Wing", 150, 125, { west: 3, north: 8 }, 4, 6, ["box", "tank"]),
            _r(8, "Deep SE", 150, 150, { south: 7 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 2: The Serpent (8 rooms, zigzag) =====
    {
        name: "The Serpent",
        startRoomId: 0,
        rooms: [
            _r(0, "Entrance", 30, 30, { east: 1 }, 0, 0, []),
            _r(1, "Bend 1", 125, 125, { west: 0, south: 2 }, 2, 4, ["box"]),
            _r(2, "Bend 2", 150, 100, { north: 1, west: 3 }, 3, 4, ["box"]),
            _r(3, "Bend 3", 125, 125, { east: 2, south: 4 }, 3, 5, ["box", "fast_box"]),
            _r(4, "Bend 4", 100, 150, { north: 3, east: 5 }, 3, 5, ["fast_box"]),
            _r(5, "Bend 5", 125, 125, { west: 4, south: 6 }, 4, 6, ["box", "sphere"]),
            _r(6, "Bend 6", 150, 125, { north: 5, west: 7 }, 4, 6, ["sphere", "fast_box"]),
            _r(7, "Tail", 150, 150, { east: 6 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 3: The Maze (12 rooms) =====
    {
        name: "The Maze",
        startRoomId: 0,
        rooms: [
            _r(0, "Entry", 30, 30, { east: 1, south: 3 }, 0, 0, []),
            _r(1, "Path A", 125, 125, { west: 0, east: 2 }, 2, 3, ["box"]),
            _r(2, "Path B", 100, 125, { west: 1, south: 5 }, 2, 4, ["box"]),
            _r(3, "Path C", 125, 100, { north: 0, south: 6 }, 2, 3, ["box"]),
            _r(4, "Junction", 125, 125, { east: 5, south: 7 }, 3, 5, ["box", "fast_box"]),
            _r(5, "Path D", 100, 150, { west: 4, north: 2, south: 8 }, 3, 4, ["fast_box"]),
            _r(6, "Path E", 125, 125, { north: 3, east: 7 }, 3, 5, ["box"]),
            _r(7, "Hub", 150, 125, { west: 6, north: 4, south: 9 }, 4, 6, ["box", "sphere"]),
            _r(8, "Dead End", 100, 100, { north: 5, south: 10 }, 3, 5, ["sphere"]),
            _r(9, "Tunnel", 125, 100, { north: 7, east: 10 }, 4, 5, ["fast_box"]),
            _r(10, "Deep", 150, 125, { west: 9, north: 8, south: 11 }, 4, 6, ["box", "tank"]),
            _r(11, "Abyss", 150, 150, { north: 10 }, 5, 8, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 4: The Ring (8 rooms, circular) =====
    {
        name: "The Ring",
        startRoomId: 0,
        rooms: [
            _r(0, "Gate", 30, 30, { east: 1, south: 7 }, 0, 0, []),
            _r(1, "Arc 1", 125, 125, { west: 0, east: 2 }, 2, 4, ["box"]),
            _r(2, "Arc 2", 150, 100, { west: 1, south: 3 }, 3, 4, ["box"]),
            _r(3, "Arc 3", 125, 125, { north: 2, south: 4 }, 3, 5, ["box", "fast_box"]),
            _r(4, "Arc 4", 100, 150, { north: 3, west: 5 }, 3, 5, ["fast_box"]),
            _r(5, "Arc 5", 125, 125, { east: 4, west: 6 }, 4, 6, ["sphere"]),
            _r(6, "Arc 6", 150, 125, { east: 5, north: 7 }, 4, 6, ["box", "sphere"]),
            _r(7, "Arc 7", 125, 125, { south: 6, north: 0 }, 4, 6, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 5: The Tree (10 rooms) =====
    {
        name: "The Tree",
        startRoomId: 0,
        rooms: [
            _r(0, "Root", 30, 30, { north: 1 }, 0, 0, []),
            _r(1, "Trunk", 125, 125, { south: 0, west: 2, east: 3 }, 2, 3, ["box"]),
            _r(2, "Left Branch", 125, 100, { east: 1, north: 4, south: 5 }, 3, 4, ["box"]),
            _r(3, "Right Branch", 125, 100, { west: 1, north: 6, south: 7 }, 3, 4, ["box", "fast_box"]),
            _r(4, "Left Leaf 1", 100, 125, { south: 2 }, 3, 5, ["fast_box"]),
            _r(5, "Left Leaf 2", 100, 125, { north: 2 }, 3, 5, ["sphere"]),
            _r(6, "Right Leaf 1", 100, 125, { south: 3 }, 3, 5, ["box"]),
            _r(7, "Right Stem", 125, 125, { north: 3, east: 8 }, 4, 6, ["box", "fast_box"]),
            _r(8, "Deep Branch", 150, 125, { west: 7, south: 9 }, 4, 6, ["sphere", "tank"]),
            _r(9, "Deep Leaf", 150, 150, { north: 8 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 6: The Depths (11 rooms) =====
    {
        name: "The Depths",
        startRoomId: 0,
        rooms: [
            _r(0, "Surface", 30, 30, { east: 1 }, 0, 0, []),
            _r(1, "Descent 1", 125, 125, { west: 0, east: 2 }, 2, 3, ["box"]),
            _r(2, "Descent 2", 125, 100, { west: 1, east: 3 }, 2, 4, ["box"]),
            _r(3, "Fork", 150, 125, { west: 2, south: 4 }, 3, 4, ["box", "fast_box"]),
            _r(4, "Pit 1", 125, 125, { north: 3, west: 5 }, 3, 5, ["fast_box"]),
            _r(5, "Side Cave", 100, 100, { east: 4, south: 6 }, 3, 5, ["sphere"]),
            _r(6, "Cavern", 150, 100, { north: 5, east: 7 }, 4, 5, ["box"]),
            _r(7, "Underground", 125, 125, { west: 6, east: 8 }, 4, 6, ["box", "fast_box"]),
            _r(8, "Deep Cave", 150, 125, { west: 7, south: 9, east: 10 }, 4, 6, ["sphere", "tank"]),
            _r(9, "Chasm", 125, 150, { north: 8 }, 5, 6, ["fast_box", "tank"]),
            _r(10, "Bottom", 150, 150, { west: 8 }, 5, 8, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 7: The Fortress (9 rooms, H shape) =====
    {
        name: "The Fortress",
        startRoomId: 0,
        rooms: [
            _r(0, "Gate", 30, 30, { north: 1, south: 3, east: 2 }, 0, 0, []),
            _r(1, "Left Tower Top", 125, 125, { south: 0 }, 2, 4, ["box"]),
            _r(2, "Bridge", 150, 100, { west: 0, east: 4 }, 3, 5, ["box", "fast_box"]),
            _r(3, "Left Tower Bot", 125, 125, { north: 0, south: 7 }, 2, 4, ["box"]),
            _r(4, "Right Hall", 125, 125, { west: 2, north: 5, south: 6 }, 3, 5, ["fast_box"]),
            _r(5, "Right Tower Top", 150, 125, { south: 4 }, 4, 6, ["sphere"]),
            _r(6, "Right Tower Bot", 125, 150, { north: 4, south: 8 }, 4, 6, ["box", "tank"]),
            _r(7, "Dungeon L", 125, 125, { north: 3 }, 4, 6, ["fast_box", "sphere"]),
            _r(8, "Dungeon R", 150, 150, { north: 6 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 8: The Catacombs (10 rooms, irregular) =====
    {
        name: "The Catacombs",
        startRoomId: 0,
        rooms: [
            _r(0, "Entrance", 30, 30, { east: 1 }, 0, 0, []),
            _r(1, "Corridor", 125, 100, { west: 0, south: 2 }, 2, 3, ["box"]),
            _r(2, "Chamber", 125, 125, { north: 1, east: 3 }, 2, 4, ["box"]),
            _r(3, "Junction", 150, 125, { west: 2, south: 5, east: 4 }, 3, 5, ["box", "fast_box"]),
            _r(4, "Dead End", 100, 100, { west: 3 }, 3, 5, ["sphere"]),
            _r(5, "Crypt", 125, 125, { north: 3, west: 6 }, 3, 5, ["box"]),
            _r(6, "Tomb", 100, 150, { east: 5, south: 7 }, 4, 5, ["fast_box"]),
            _r(7, "Ossuary", 125, 125, { north: 6, east: 8 }, 4, 6, ["box", "sphere"]),
            _r(8, "Deep Crypt", 150, 125, { west: 7, south: 9 }, 4, 6, ["tank", "fast_box"]),
            _r(9, "Vault", 150, 150, { north: 8 }, 5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 9: The Abyss (7 rooms, large intense rooms) =====
    {
        name: "The Abyss",
        startRoomId: 0,
        rooms: [
            _r(0, "Edge", 30, 30, { east: 1, west: 2 }, 0, 0, []),
            _r(1, "Void East", 150, 150, { west: 0, south: 3 }, 3, 5, ["box", "fast_box"]),
            _r(2, "Void West", 150, 150, { east: 0, south: 4 }, 3, 5, ["box", "sphere"]),
            _r(3, "Chasm East", 150, 125, { north: 1, west: 5 }, 4, 6, ["fast_box", "tank"]),
            _r(4, "Chasm West", 125, 150, { north: 2, east: 5 }, 4, 6, ["sphere", "tank"]),
            _r(5, "Nexus", 150, 150, { east: 3, west: 4, south: 6 }, 5, 7, ["box", "fast_box", "sphere"]),
            _r(6, "Core", 150, 150, { north: 5 }, 6, 8, ["box", "fast_box", "sphere", "tank"])
        ]
    }
];
