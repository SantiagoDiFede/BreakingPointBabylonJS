// 3 predefined maps for roguelike gameplay
// Each room has a grid position (gridX, gridZ) that determines its world position.
// All rooms are built simultaneously — the player walks between them through door openings.
// Door connections: { direction: targetRoomId }
// enemyCount: {min, max} for random spawn
// allowedEnemyTypes: array of enemy type keys from ENEMY_TYPES

// Room size constant (all rooms are square for alignment)
var ROOM_SIZE = 40;
var ROOM_HEIGHT = 5;
var WALL_THICKNESS = 0.5;

function _r(id, name, gridX, gridZ, doors, eMin, eMax, types) {
    return {
        id: id, name: name,
        gridX: gridX, gridZ: gridZ,
        doors: doors,
        enemyCount: { min: eMin, max: eMax },
        allowedEnemyTypes: types || ["box"]
    };
}

var MAP_DATA = [
    // ===== MAP 0: The Bunker (5 rooms, L-shape) =====
    //
    //      [1]
    //       |
    // [0]--[2]--[3]
    //             |
    //            [4]
    //
    {
        name: "The Bunker",
        startRoomId: 0,
        rooms: [
            _r(0, "Spawn",       -1, 0, { east: 2 },                         0, 0, []),
            _r(1, "Watchtower",    0, 1, { south: 2 },                        2, 4, ["box"]),
            _r(2, "Hub",           0, 0, { west: 0, north: 1, east: 3 },      3, 5, ["box", "fast_box"]),
            _r(3, "Armory",        1, 0, { west: 2, south: 4 },               3, 5, ["sphere", "fast_box"]),
            _r(4, "Boss Room",     1,-1, { north: 3 },                         5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 1: The Cross (5 rooms, cross shape) =====
    //
    //      [1]
    //       |
    // [4]--[0]--[2]
    //       |
    //      [3]
    //
    {
        name: "The Cross",
        startRoomId: 0,
        rooms: [
            _r(0, "Nexus",    0, 0, { north: 1, east: 2, south: 3, west: 4 }, 0, 0, []),
            _r(1, "North",    0, 1, { south: 0 },                              2, 4, ["box"]),
            _r(2, "East",     1, 0, { west: 0 },                               3, 5, ["box", "fast_box"]),
            _r(3, "South",    0,-1, { north: 0 },                              3, 5, ["sphere", "fast_box"]),
            _r(4, "West",    -1, 0, { east: 0 },                               4, 6, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 2: The Serpent (6 rooms, zigzag) =====
    //
    // [0]--[1]
    //       |
    // [3]--[2]
    //  |
    // [4]--[5]
    //
    {
        name: "The Serpent",
        startRoomId: 0,
        rooms: [
            _r(0, "Entrance",   0, 1, { east: 1 },                           0, 0, []),
            _r(1, "Corridor 1", 1, 1, { west: 0, south: 2 },                 2, 3, ["box"]),
            _r(2, "Bend",       1, 0, { north: 1, west: 3 },                 2, 4, ["box", "fast_box"]),
            _r(3, "Corridor 2", 0, 0, { east: 2, south: 4 },                 3, 5, ["fast_box", "sphere"]),
            _r(4, "Dark Hall",  0,-1, { north: 3, east: 5 },                 4, 6, ["sphere", "fast_box"]),
            _r(5, "Core",       1,-1, { west: 4 },                            5, 7, ["box", "fast_box", "tank"])
        ]
    }
];
