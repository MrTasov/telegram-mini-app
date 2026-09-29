ITEM.plant_waste={name:'Растительные отходы',icon:'♻',stack:100,discardable:true};
/* Survival content uses the existing ITEM/recipe owners. */
(()=>{
 ITEM.omelet={"name": "Омлет", "icon": "🍲", "category": "food"};
 ITEM.fried_chicken={"name": "Жареная курица", "icon": "🍲", "category": "food"};
 ITEM.steak={"name": "Стейк", "icon": "🍲", "category": "food"};
 ITEM.roasted_corn={"name": "Жареная кукуруза", "icon": "🍲", "category": "food"};
 ITEM.bread={"name": "Хлеб", "icon": "🍲", "category": "food"};
 ITEM.berry_porridge={"name": "Каша с ягодами", "icon": "🍲", "category": "food"};
 ITEM.bean_soup={"name": "Фасолевый суп", "icon": "🍲", "category": "food"};
 ITEM.fish_soup={"name": "Уха", "icon": "🍲", "category": "food"};
 ITEM.vegetable_stew={"name": "Овощное рагу", "icon": "🍲", "category": "food"};
 ITEM.tomato_juice={"name": "Томатный сок", "icon": "🥤", "category": "drink"};
 ITEM.berry_mors={"name": "Ягодный морс", "icon": "🥤", "category": "drink"};
 ITEM.herbal_tea={"name": "Травяной чай", "icon": "🥤", "category": "drink"};
 ITEM.regen_injector={"name": "Регенерация", "icon": "💉", "category": "healing"};
 ITEM.vitality_injector={"name": "Живучесть", "icon": "🧪", "category": "buff"};
 ITEM.adrenaline_injector={"name": "Адреналин", "icon": "🧪", "category": "buff"};
 ITEM.weapon_oil={"name": "Оружейное масло", "icon": "🧪", "category": "buff"};
 ITEM.meat_stew={"name": "Мясное рагу", "icon": "🍲", "category": "food"};
 ITEM.energy_drink={"name": "Энергетик", "icon": "🥤", "category": "drink"};
 ITEM.food.name='Консервы';ITEM.meds.name='Аптечка';
 for(const [id,d] of Object.entries(GameplayBalance.survival.uses))if(ITEM[id])ITEM[id].category=d.category;
})();
