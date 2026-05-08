// 8 predefined maps for roguelike gameplay
// Each room has a grid position (gridX, gridZ) that determines its world position.
// All rooms are built simultaneously — the player walks between them through door openings.
// Door connections: { direction: targetRoomId }
// enemyCount: {min, max} for random spawn
// allowedEnemyTypes: array of enemy type keys from ENEMY_TYPES

// Room size constant (all rooms are square for alignment)
var ROOM_SIZE = 60; // Increased from 40
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
    {
        name: "The Bunker",
        startRoomId: 0,
        floorTexture: "img/thebunkertexture.png",
        rooms: [
            _r(0, "Bunker Entry", -1, 0, { east: 2 },                         0, 0, []),
            _r(1, "Watchtower",    0, 1, { south: 2 },                        2, 4, ["box"]),
            _r(2, "Hub",           0, 0, { west: 0, north: 1, east: 3 },      3, 5, ["box", "fast_box"]),
            _r(3, "Armory",        1, 0, { west: 2, south: 4 },               3, 5, ["sphere", "fast_box"]),
            _r(4, "Boss Room",     1,-1, { north: 3 },                         5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 1: The Cross (5 rooms, cross shape) =====
    {
        name: "The Cross",
        startRoomId: 0,
        floorTexture: "img/thecrosstexture.png",
        rooms: [
            _r(0, "Nexus Core",    0, 0, { north: 1, east: 2, south: 3, west: 4 }, 0, 0, []),
            _r(1, "North Sector",  0, 1, { south: 0 },                              2, 4, ["box"]),
            _r(2, "East Sector",   1, 0, { west: 0 },                               3, 5, ["box", "fast_box"]),
            _r(3, "South Sector",  0,-1, { north: 0 },                              3, 5, ["sphere", "fast_box"]),
            _r(4, "West Sector",  -1, 0, { east: 0 },                               4, 6, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 2: The Serpent (6 rooms, zigzag) =====
    {
        name: "The Serpent",
        startRoomId: 0,
        floorTexture: "img/theserpenttexture.png",
        rooms: [
            _r(0, "Serpent Head", 0, 1, { east: 1 },                           0, 0, []),
            _r(1, "Segment Alpha", 1, 1, { west: 0, south: 2 },                 2, 3, ["box"]),
            _r(2, "The Bend",      1, 0, { north: 1, west: 3 },                 2, 4, ["box", "fast_box"]),
            _r(3, "Segment Beta",  0, 0, { east: 2, south: 4 },                 3, 5, ["fast_box", "sphere"]),
            _r(4, "Shadow Hall",   0,-1, { north: 3, east: 5 },                 4, 6, ["sphere", "fast_box"]),
            _r(5, "Serpent Tail",  1,-1, { west: 4 },                            5, 7, ["box", "fast_box", "tank"])
        ]
    },

    // ===== MAP 3: The Maze (10 rooms) =====
    {
        name: "The Maze",
        startRoomId: 0,
        floorTexture: "img/themazetexture.png",
        rooms: [
            _r(0, "Maze Entry", 0, 0, { north: 1, east: 2 }, 0, 0, []),
            _r(1, "North Alley", 0, 1, { south: 0, north: 3 }, 2, 4, ["box"]),
            _r(2, "East Alley", 1, 0, { west: 0, east: 4 }, 2, 4, ["box"]),
            _r(3, "West Corner", 0, 2, { south: 1, east: 5 }, 3, 5, ["fast_box"]),
            _r(4, "South Corner", 2, 0, { west: 2, north: 6 }, 3, 5, ["sphere"]),
            _r(5, "Middle North", 1, 2, { west: 3, east: 7 }, 3, 5, ["box", "fast_box"]),
            _r(6, "Middle East", 2, 1, { south: 4, north: 8 }, 3, 5, ["box", "sphere"]),
            _r(7, "East Corner", 2, 2, { west: 5, south: 8 }, 4, 6, ["box", "fast_box"]),
            _r(8, "The Crossing", 2, 1.5, { north: 7, south: 6, east: 9 }, 4, 6, ["box", "tank"]),
            _r(9, "Maze Heart", 3, 1.5, { west: 8 }, 6, 8, ["tank", "fast_box"])
        ]
    },

    // ===== MAP 4: The Loop (8 rooms) =====
    {
        name: "The Loop",
        startRoomId: 0,
        floorTexture: "img/thelooptexture.png",
        rooms: [
            _r(0, "Cycle Start", 0, 0, { north: 1, south: 7 }, 0, 0, []),
            _r(1, "Phase One",   0, 1, { south: 0, east: 2 }, 2, 4, ["box"]),
            _r(2, "Phase Two",   1, 1, { west: 1, east: 3 }, 3, 5, ["box", "fast_box"]),
            _r(3, "Phase Three", 2, 1, { west: 2, south: 4 }, 3, 5, ["sphere"]),
            _r(4, "Phase Four",  2, 0, { north: 3, south: 5 }, 4, 6, ["fast_box"]),
            _r(5, "Phase Five",  2,-1, { north: 4, west: 6 }, 4, 6, ["box", "tank"]),
            _r(6, "Phase Six",   1,-1, { east: 5, west: 7 }, 3, 5, ["sphere"]),
            _r(7, "Phase Seven", 0,-1, { east: 6, north: 0 }, 4, 6, ["box", "fast_box"])
        ]
    },

    // ===== MAP 5: The Fortress (11 rooms) =====
    {
        name: "The Fortress",
        startRoomId: 0,
        floorTexture: "img/thefortresstexture.png",
        rooms: [
            _r(0, "Iron Gate", 0, 0, { north: 1 }, 0, 0, []),
            _r(1, "Courtyard", 0, 1, { south: 0, north: 2, west: 3, east: 4 }, 2, 4, ["box"]),
            _r(2, "Great Hall", 0, 2, { south: 1, north: 5 }, 3, 5, ["box", "fast_box"]),
            _r(3, "West Rampart", -1, 1, { east: 1, north: 6 }, 3, 5, ["box"]),
            _r(4, "East Rampart", 1, 1, { west: 1, north: 7 }, 3, 5, ["box"]),
            _r(5, "Throne Room", 0, 3, { south: 2, west: 8, east: 9 }, 5, 7, ["tank", "box"]),
            _r(6, "West Guard", -1, 2, { south: 3 }, 4, 6, ["fast_box"]),
            _r(7, "East Guard", 1, 2, { south: 4 }, 4, 6, ["fast_box"]),
            _r(8, "Left Vault", -1, 3, { east: 5 }, 4, 6, ["sphere"]),
            _r(9, "Right Vault", 1, 3, { west: 5, north: 10 }, 4, 6, ["sphere"]),
            _r(10, "Keep Exit", 1, 4, { south: 9 }, 6, 8, ["tank", "fast_box", "sphere"])
        ]
    },

    // ===== MAP 6: The Abyss (12 rooms) =====
    {
        name: "The Abyss",
        startRoomId: 0,
        floorTexture: "img/theabysstexture.png",
        rooms: [
            _r(0, "Abyss Edge", 0, 0, { south: 1 }, 0, 0, []),
            _r(1, "The Drop 1", 0,-1, { north: 0, south: 2 }, 2, 4, ["box"]),
            _r(2, "The Drop 2", 0,-2, { north: 1, east: 3, west: 4 }, 3, 5, ["box", "fast_box"]),
            _r(3, "Eastern Pit", 1,-2, { west: 2, south: 5 }, 3, 5, ["sphere"]),
            _r(4, "Western Pit", -1,-2, { east: 2, south: 6 }, 3, 5, ["sphere"]),
            _r(5, "Eastern Void", 1,-3, { north: 3, west: 7 }, 4, 6, ["fast_box"]),
            _r(6, "Western Void", -1,-3, { north: 4, east: 7 }, 4, 6, ["fast_box"]),
            _r(7, "Abyssal Nexus", 0,-3, { east: 5, west: 6, south: 8 }, 5, 7, ["box", "tank"]),
            _r(8, "Deep Descent", 0,-4, { north: 7, south: 9 }, 4, 6, ["sphere", "tank"]),
            _r(9, "Abyssal Plain", 0,-5, { north: 8, west: 10, east: 11 }, 5, 7, ["box", "fast_box"]),
            _r(10, "The Shadow", -1,-5, { east: 9 }, 6, 8, ["tank"]),
            _r(11, "The Oblivion", 1,-5, { west: 9 }, 7, 9, ["tank", "fast_box", "sphere"])
        ]
    },

    // ===== MAP 7: The Laboratory (9 rooms) =====
    {
        name: "The Laboratory",
        startRoomId: 0,
        floorTexture: "img/thelaboratorytexture.png",
        rooms: [
            _r(0, "Lab Reception", 0, 0, { east: 1 }, 0, 0, []),
            _r(1, "Main Hallway", 1, 0, { west: 0, north: 2, south: 3 }, 2, 4, ["box"]),
            _r(2, "Biology Lab", 1, 1, { south: 1, east: 4 }, 3, 5, ["fast_box", "box"]),
            _r(3, "Chemistry Lab", 1,-1, { north: 1, east: 5 }, 3, 5, ["sphere", "box"]),
            _r(4, "Cold Storage", 2, 1, { west: 2, south: 6 }, 4, 6, ["sphere"]),
            _r(5, "The Pit", 2,-1, { west: 3, north: 6 }, 4, 6, ["fast_box"]),
            _r(6, "Central Core", 2, 0, { north: 4, south: 5, east: 7 }, 5, 7, ["tank", "box"]),
            _r(7, "Human Testing", 3, 0, { west: 6, east: 8 }, 5, 8, ["box", "fast_box", "tank"]),
            _r(8, "Observation", 4, 0, { west: 7 }, 6, 9, ["tank", "sphere"])
        ]
    }
];
