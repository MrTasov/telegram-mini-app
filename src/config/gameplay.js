/* Release 0.28: balance data shared by the existing owners and recipes. */
const GameplayBalance={
  survival:{
    "hungerMinutes": 2160,
    "thirstMinutes": 1440,
    "max": 100,
    "respawn": 50,
    "low": 20,
    "wellFed": 80,
    "regenMs": 20000,
    "regenHP": 1,
    "zeroGraceMs": 120000,
    "harmMs": 5000,
    "bothHarmMs": 2500,
    "harmHP": 1,
    "hungerCycle": 1.25,
    "hungerMove": 0.9,
    "thirstSpeedCap": 0.7,
    "useMs": 1000,
    "useMove": 0.5,
    "effects": {
      "tea": {
        "durationMs": 20000,
        "healPerSecond": 1,
        "icon": "🍵"
      },
      "regen": {
        "durationMs": 40000,
        "healPerSecond": 2,
        "icon": "💉"
      },
      "energy": {
        "durationMs": 120000,
        "gatheringRate": 1.2,
        "icon": "⚡"
      },
      "vitality": {
        "durationMs": 120000,
        "maxHP": 30,
        "damageFactor": 0.75,
        "icon": "🛡"
      },
      "adrenaline": {
        "durationMs": 60000,
        "speed": 1.25,
        "reloadRate": 1.3,
        "icon": "🏃"
      },
      "oil": {
        "shots": 120,
        "damageBonus": 0.3,
        "icon": "🛢"
      }
    },
    "uses": {
      "food": {
        "action": "eat",
        "category": "food",
        "hunger": 35,
        "hp": 0
      },
      "omelet": {
        "action": "eat",
        "category": "food",
        "hunger": 35,
        "hp": 10
      },
      "cooked_fish": {
        "action": "eat",
        "category": "food",
        "hunger": 30,
        "hp": 10
      },
      "fried_chicken": {
        "action": "eat",
        "category": "food",
        "hunger": 40,
        "hp": 10
      },
      "steak": {
        "action": "eat",
        "category": "food",
        "hunger": 50,
        "hp": 15
      },
      "roasted_corn": {
        "action": "eat",
        "category": "food",
        "hunger": 20,
        "hp": 5
      },
      "bread": {
        "action": "eat",
        "category": "food",
        "hunger": 25,
        "hp": 0
      },
      "berry_porridge": {
        "action": "eat",
        "category": "food",
        "hunger": 45,
        "hp": 15
      },
      "bean_soup": {
        "action": "eat",
        "category": "food",
        "hunger": 25,
        "hp": 10
      },
      "fish_soup": {
        "action": "eat",
        "category": "food",
        "hunger": 30,
        "hp": 10
      },
      "vegetable_stew": {
        "action": "eat",
        "category": "food",
        "hunger": 30,
        "hp": 10
      },
      "meat_stew": {
        "action": "eat",
        "category": "food",
        "hunger": 45,
        "hp": 15
      },
      "berries": {
        "action": "eat",
        "category": "food",
        "hunger": 4,
        "hp": 0
      },
      "tomato": {
        "action": "eat",
        "category": "food",
        "hunger": 5,
        "hp": 0
      },
      "carrot": {
        "action": "eat",
        "category": "food",
        "hunger": 6,
        "hp": 0
      },
      "water": {
        "action": "drink",
        "category": "drink",
        "thirst": 40,
        "hunger": 0,
        "hp": 0
      },
      "milk": {
        "action": "drink",
        "category": "drink",
        "thirst": 25,
        "hunger": 10,
        "hp": 0
      },
      "tomato_juice": {
        "action": "drink",
        "category": "drink",
        "thirst": 30,
        "hunger": 5,
        "hp": 0
      },
      "berry_mors": {
        "action": "drink",
        "category": "drink",
        "thirst": 30,
        "hunger": 0,
        "hp": 5
      },
      "herbal_tea": {
        "action": "drink",
        "category": "drink",
        "thirst": 30,
        "hunger": 0,
        "hp": 0,
        "effect": "tea"
      },
      "energy_drink": {
        "action": "drink",
        "category": "drink",
        "thirst": 20,
        "hunger": 0,
        "hp": 0,
        "effect": "energy"
      },
      "regen_injector": {
        "action": "inject",
        "category": "healing",
        "effect": "regen"
      },
      "vitality_injector": {
        "action": "inject",
        "category": "buff",
        "effect": "vitality"
      },
      "adrenaline_injector": {
        "action": "inject",
        "category": "buff",
        "effect": "adrenaline"
      },
      "weapon_oil": {
        "action": "inject",
        "category": "buff",
        "effect": "oil"
      },
      "meds": {
        "action": "inject",
        "category": "healing",
        "hp": 50
      }
    },
    "recipes": {
      "omelet": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Омлет",
        "input": {
          "eggs": 2,
          "milk": 1
        },
        "output": "omelet",
        "qty": 1,
        "ms": 5000
      },
      "fried_chicken": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Жареная курица",
        "input": {
          "chicken_meat": 1
        },
        "output": "fried_chicken",
        "qty": 1,
        "ms": 8000
      },
      "steak": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Стейк",
        "input": {
          "beef": 1
        },
        "output": "steak",
        "qty": 1,
        "ms": 8000
      },
      "roasted_corn": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Жареная кукуруза",
        "input": {
          "corn": 2
        },
        "output": "roasted_corn",
        "qty": 1,
        "ms": 5000
      },
      "bread": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Хлеб",
        "input": {
          "grain": 4,
          "eggs": 1,
          "water": 1
        },
        "output": "bread",
        "qty": 2,
        "ms": 10000
      },
      "berry_porridge": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Каша с ягодами",
        "input": {
          "grain": 3,
          "milk": 1,
          "berries": 1
        },
        "output": "berry_porridge",
        "qty": 1,
        "ms": 8000
      },
      "bean_soup": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Фасолевый суп",
        "input": {
          "beans": 3,
          "onion": 1,
          "tomato": 1,
          "water": 1
        },
        "output": "bean_soup",
        "qty": 2,
        "ms": 12000
      },
      "fish_soup": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Уха",
        "input": {
          "cooked_fish": 1,
          "potato": 1,
          "carrot": 1,
          "onion": 1,
          "water": 1
        },
        "output": "fish_soup",
        "qty": 2,
        "ms": 12000
      },
      "vegetable_stew": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Овощное рагу",
        "input": {
          "potato": 2,
          "carrot": 2,
          "onion": 1,
          "tomato": 1,
          "water": 1
        },
        "output": "vegetable_stew",
        "qty": 2,
        "ms": 15000
      },
      "meat_stew_beef": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Мясное рагу · говядина",
        "input": {
          "beef": 1,
          "potato": 1,
          "beans": 1,
          "onion": 1,
          "water": 1
        },
        "output": "meat_stew",
        "qty": 2,
        "ms": 20000
      },
      "meat_stew_chicken": {
        "station": "kitchen",
        "category": "Еда",
        "name": "Мясное рагу · курица",
        "input": {
          "chicken_meat": 1,
          "potato": 1,
          "beans": 1,
          "onion": 1,
          "water": 1
        },
        "output": "meat_stew",
        "qty": 2,
        "ms": 20000
      },
      "tomato_juice": {
        "station": "kitchen",
        "category": "Напитки",
        "name": "Томатный сок",
        "input": {
          "tomato": 3
        },
        "output": "tomato_juice",
        "qty": 1,
        "ms": 5000
      },
      "berry_mors": {
        "station": "kitchen",
        "category": "Напитки",
        "name": "Ягодный морс",
        "input": {
          "berries": 3,
          "water": 1
        },
        "output": "berry_mors",
        "qty": 2,
        "ms": 5000
      },
      "herbal_tea": {
        "station": "kitchen",
        "category": "Напитки",
        "name": "Травяной чай",
        "input": {
          "water": 1,
          "medicinal_herbs": 2
        },
        "output": "herbal_tea",
        "qty": 1,
        "ms": 8000
      },
      "meds": {
        "station": "medical",
        "category": "Лечение",
        "name": "Аптечка",
        "input": {
          "medicinal_herbs": 4,
          "water": 1
        },
        "output": "meds",
        "qty": 1,
        "ms": 12000
      },
      "regen_injector": {
        "station": "medical",
        "category": "Лечение",
        "name": "Регенерация",
        "input": {
          "medicinal_herbs": 6,
          "water": 1
        },
        "output": "regen_injector",
        "qty": 1,
        "ms": 15000
      },
      "vitality_injector": {
        "station": "medical",
        "category": "Бафы",
        "name": "Живучесть",
        "input": {
          "meds": 1,
          "medicinal_herbs": 4,
          "parts": 2
        },
        "output": "vitality_injector",
        "qty": 1,
        "ms": 20000
      },
      "adrenaline_injector": {
        "station": "medical",
        "category": "Бафы",
        "name": "Адреналин",
        "input": {
          "medicinal_herbs": 3,
          "parts": 1,
          "copper": 1
        },
        "output": "adrenaline_injector",
        "qty": 1,
        "ms": 15000
      },
      "weapon_oil": {
        "station": "craft_bench",
        "category": "Бафы",
        "name": "Оружейное масло",
        "input": {
          "technical_crop": 3,
          "coal": 1
        },
        "output": "weapon_oil",
        "qty": 1,
        "ms": 10000
      },
      "feed_corn": {
        "station": "feed_craft",
        "category": "Корм",
        "name": "Корм из кукурузы",
        "input": {
          "corn": 10
        },
        "output": "animal_feed",
        "qty": 20,
        "ms": 2500
      }
    },
    "loot": {
      "market": 0.35,
      "supply": 0.25,
      "default": 0.1,
      "furniture": 0.2,
      "qty": 1
    },
    "stations": {
      "kitchen_stove": {
        "footprint": {
          "w": 150,
          "h": 80
        },
        "body": {
          "x": 4,
          "y": 4,
          "w": 142,
          "h": 72
        },
        "recipeStation": "kitchen",
        "powerKW": 1.5,
        "name": "Кухонная плита",
        "range": 48,
        "art": "kitchen_stove"
      },
      "med_lab": {
        "footprint": {
          "w": 160,
          "h": 80
        },
        "body": {
          "x": 4,
          "y": 4,
          "w": 152,
          "h": 72
        },
        "recipeStation": "medical",
        "powerKW": 1,
        "name": "Лаборатория",
        "range": 48,
        "art": "med_lab"
      }
    },
    "placement": {
      "kitchen_stove": {
        "limit": 2,
        "cost": {
          "iron": 12,
          "copper": 6,
          "parts": 4
        },
        "rooms": [
          "room6"
        ],
        "craftable": true,
        "guard": "production",
        "art": "kitchen_stove"
      },
      "med_lab": {
        "limit": 2,
        "cost": {
          "iron": 10,
          "copper": 8,
          "parts": 6
        },
        "rooms": [
          "room4"
        ],
        "craftable": true,
        "guard": "production",
        "art": "med_lab"
      }
    }
  },
  farm:{"waterCapacity": 40, "cleanCapacity": 100, "waterPerDay": 28, "waterKW": 1, "irrigationKW": 0.8, "animalKW": 0.4, "spoilDays": 2, "warnDays": 0.5, "irrigationMs": 10000, "intervalMinMs": 290000, "intervalMaxMs": 290000, "waterPerCycle": 1, "firstMinMs": 290000, "firstMaxMs": 290000, "dryGrowth": 0.35, "crops": {"carrot": {"days": 1, "yield": 10}, "onion": {"days": 1, "yield": 8}, "beans": {"days": 1.25, "yield": 10}, "potato": {"days": 1.25, "yield": 10}, "grain": {"days": 1.25, "yield": 12}, "corn": {"days": 1.5, "yield": 12}, "tomato": {"days": 1.5, "yield": 9}, "berries": {"days": 1.75, "yield": 8}, "medicinal_herbs": {"days": 2, "yield": 8}, "technical_crop": {"days": 2, "yield": 6}}},
  animals:{cowMin:2,cowMax:6},
  processing:{steelIron:3,steelCoal:1,steelQty:1,steelMs:4000,ironOre:2,copperOre:2,stone:2,coal:1,gunpowder:4,gunpowderMs:2000},
  resources:{coalStack:100,gunpowderStack:1000,coalNodesPerZone:8,coalNodeCapacity:100,spacing:36,treeWood:10,treeChopExtraMs:500,stoneDensity:2},
  ammunition:{ammo:{gunpowder:6},ammo556:{gunpowder:6}}
};
