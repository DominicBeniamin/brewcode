-- =============================================================================
-- BREWCODE SEED DATA
-- =============================================================================
-- Minimal, universally applicable reference data.
-- Users are expected to add their own types and subtypes through the UI.
--
-- Execution order:
--   1. ingredientTypes       (depends on itemCategories)
--   2. ingredientSubtypes    (depends on ingredientTypes)
--   3. ingredientTypeContexts(depends on ingredientTypes + usageContexts)
--   4. supplyTypes           (depends on itemCategories)
--
-- All inserts use INSERT OR IGNORE for safe re-execution.
-- Category IDs are resolved by name, not hardcoded.
-- =============================================================================

-- =============================================================================
-- INGREDIENT TYPES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Water
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Tap Water', 'Municipal tap water, may require treatment', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Water';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Spring Water', 'Bottled or natural spring water', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Water';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Distilled Water', 'Pure distilled water with no minerals', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Water';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Well Water', 'Private well water, mineral content varies', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Water';

-- -----------------------------------------------------------------------------
-- Fruits & Juices
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Apple', 'Fresh, pressed, or commercial apple juice', '["Cider"]', 1
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Pear', 'Fresh, pressed, or commercial pear juice', '["Perry"]', 1
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Grape', 'Fresh, pressed, or commercial grape juice', '["Wine"]', 1
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Blackberry', 'Fresh, frozen, or dried blackberries', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Strawberry', 'Fresh, frozen, or dried strawberries', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Raspberry', 'Fresh, frozen, or dried raspberries', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Blueberry', 'Fresh, frozen, or dried blueberries', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Cherry', 'Fresh, frozen, or dried cherries', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Peach', 'Fresh, frozen, or dried peaches', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Pomegranate', 'Fresh pomegranate or juice', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Fruits & Juices';

-- -----------------------------------------------------------------------------
-- Grains & Malts
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Pale Malt', 'Base malt providing the majority of fermentable sugars', '["Beer"]', 1
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Pilsner Malt', 'Light base malt for lagers and pale ales', '["Beer"]', 1
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Crystal / Caramel Malt', 'Stewed and kilned malt adding sweetness and colour', '["Beer"]', 0
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Roasted Malt', 'Darkly roasted malt for stouts and porters', '["Beer"]', 0
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Wheat Malt', 'Malted wheat for wheat beers and haze', '["Beer"]', 0
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Dry Malt Extract (DME)', 'Concentrated dried wort for extract brewing', '["Beer"]', 0
FROM itemCategories WHERE name = 'Grains & Malts';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Liquid Malt Extract (LME)', 'Concentrated liquid wort for extract brewing', '["Beer"]', 0
FROM itemCategories WHERE name = 'Grains & Malts';

-- -----------------------------------------------------------------------------
-- Honeys, Syrups & Sugars
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Honey', 'Primary fermentable for mead', '["Mead"]', 1
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Table Sugar', 'Refined white sucrose', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Dextrose (Corn Sugar)', 'Highly fermentable monosaccharide, common priming sugar', '["Beer","Cider","Mead"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Lactose', 'Non-fermentable milk sugar for sweetness and body', '["Beer"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Brown Sugar', 'Partially refined sugar with molasses content', '["Beer","Mead","Cider"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Maple Syrup', 'Pure maple syrup', '["Beer","Mead","Cider"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Molasses', 'Thick dark syrup, by-product of sugar refining', '["Beer","Mead"]', 0
FROM itemCategories WHERE name = 'Honeys, Syrups & Sugars';

-- -----------------------------------------------------------------------------
-- Flavorants
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Spice', 'Dried whole or ground spices', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Herb', 'Fresh or dried culinary herbs', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Oak', 'Oak chips, cubes, spirals, or staves for barrel character', '["Wine","Mead","Cider","Beer"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Vanilla', 'Vanilla pods, extract, or powder', '["Mead","Beer","Cider"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Coffee', 'Whole bean, ground, or cold brew coffee', '["Beer","Mead"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Cacao / Chocolate', 'Cacao nibs, powder, or chocolate', '["Beer","Mead"]', 0
FROM itemCategories WHERE name = 'Flavorants';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Flower', 'Edible flowers such as elderflower, rose, or hibiscus', '["Wine","Mead","Cider","Beer"]', 0
FROM itemCategories WHERE name = 'Flavorants';

-- -----------------------------------------------------------------------------
-- Hops
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Hop Pellet', 'Compressed hop pellets (T-90)', '["Beer"]', 0
FROM itemCategories WHERE name = 'Hops';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Hop Whole Cone', 'Whole dried hop cones', '["Beer"]', 0
FROM itemCategories WHERE name = 'Hops';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Hop Extract', 'CO₂ or isomerised hop extract', '["Beer"]', 0
FROM itemCategories WHERE name = 'Hops';

-- -----------------------------------------------------------------------------
-- Additives
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Yeast Nutrient', 'General yeast nutrient blend', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Diammonium Phosphate (DAP)', 'Inorganic yeast nitrogen source', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Potassium Metabisulphite', 'Sulphite-based antioxidant and antimicrobial', '["Wine","Mead","Cider","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Potassium Sorbate', 'Fermentation inhibitor for stabilisation', '["Wine","Mead","Cider","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Campden Tablet', 'Pre-measured potassium metabisulphite tablet', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Pectic Enzyme', 'Breaks down pectin for clarity and juice yield', '["Wine","Mead","Cider","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Bentonite', 'Negatively charged clay fining agent', '["Wine","Mead","Cider"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Isinglass', 'Fish-derived collagen fining agent', '["Wine","Mead","Cider","Beer"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Tartaric Acid', 'Primary organic acid in wine must', '["Wine","Mead"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Malic Acid', 'Organic acid found in apples and grapes', '["Wine","Mead","Cider","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Citric Acid', 'Mild organic acid for pH adjustment', '["Wine","Mead","Cider","Beer","Perry"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Acid Blend', 'Pre-mixed blend of tartaric, malic, and citric acids', '["Wine","Mead","Cider"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Tannin', 'Oak, grape, or commercial tannin powder', '["Wine","Mead","Cider"]', 0
FROM itemCategories WHERE name = 'Additives';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Irish Moss', 'Carrageenan-based kettle fining for wort clarity', '["Beer"]', 0
FROM itemCategories WHERE name = 'Additives';

-- -----------------------------------------------------------------------------
-- Yeasts & Microbes
-- -----------------------------------------------------------------------------
INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Wine Yeast', 'Saccharomyces cerevisiae strains for wine fermentation', '["Wine"]', 1
FROM itemCategories WHERE name = 'Yeasts & Microbes';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Mead Yeast', 'Yeast strains suited for high-sugar honey fermentation', '["Mead"]', 1
FROM itemCategories WHERE name = 'Yeasts & Microbes';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Cider Yeast', 'Yeast strains for apple and perry fermentation', '["Cider","Perry"]', 1
FROM itemCategories WHERE name = 'Yeasts & Microbes';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Beer Yeast', 'Saccharomyces strains for beer fermentation', '["Beer"]', 1
FROM itemCategories WHERE name = 'Yeasts & Microbes';

INSERT OR IGNORE INTO ingredientTypes (categoryID, name, description, beverageTypes, isPrimaryRequired)
SELECT categoryID, 'Lactic Acid Bacteria', 'Oenococcus oeni or Lactobacillus for malolactic fermentation', '["Wine","Mead","Cider","Beer"]', 0
FROM itemCategories WHERE name = 'Yeasts & Microbes';

-- =============================================================================
-- INGREDIENT SUBTYPES
-- =============================================================================
-- Only seeded where a universally recognised, finite set of subtypes exists.
-- All other subtypes are left for users to create.
-- =============================================================================

-- Grape varietals (finite, well-known set)
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Merlot' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Cabernet Sauvignon' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Shiraz / Syrah' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Pinot Noir' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Chardonnay' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Sauvignon Blanc' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Riesling' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Pinot Grigio / Pinot Gris' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Muscat' FROM ingredientTypes WHERE name = 'Grape';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Muscadine' FROM ingredientTypes WHERE name = 'Grape';

-- Beer Yeast subtypes
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Ale' FROM ingredientTypes WHERE name = 'Beer Yeast';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Lager' FROM ingredientTypes WHERE name = 'Beer Yeast';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Wheat' FROM ingredientTypes WHERE name = 'Beer Yeast';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Belgian' FROM ingredientTypes WHERE name = 'Beer Yeast';

-- Wine Yeast subtypes
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Red Wine' FROM ingredientTypes WHERE name = 'Wine Yeast';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'White Wine' FROM ingredientTypes WHERE name = 'Wine Yeast';
INSERT OR IGNORE INTO ingredientSubtypes (ingredientTypeID, name)
SELECT ingredientTypeID, 'Champagne / Sparkling' FROM ingredientTypes WHERE name = 'Wine Yeast';

-- =============================================================================
-- INGREDIENT TYPE CONTEXTS
-- =============================================================================

-- Water
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Tap Water','Spring Water','Distilled Water','Well Water')
  AND uc.name IN ('fermentable','salt');

-- Fruits: fermentable and primer
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Apple','Pear','Grape','Blackberry','Strawberry',
                  'Raspberry','Blueberry','Cherry','Peach','Pomegranate')
  AND uc.name IN ('fermentable','primer');

-- Grains & Malts: fermentable
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Pale Malt','Pilsner Malt','Crystal / Caramel Malt',
                  'Roasted Malt','Wheat Malt',
                  'Dry Malt Extract (DME)','Liquid Malt Extract (LME)')
  AND uc.name = 'fermentable';

-- Sugars: fermentable and primer
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Honey','Table Sugar','Dextrose (Corn Sugar)',
                  'Brown Sugar','Maple Syrup','Molasses')
  AND uc.name IN ('fermentable','primer');

-- Lactose: nonfermentable only
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name = 'Lactose'
  AND uc.name = 'nonfermentable';

-- Flavorants: nonfermentable
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Spice','Herb','Oak','Vanilla','Coffee',
                  'Cacao / Chocolate','Flower')
  AND uc.name = 'nonfermentable';

-- Hops: nonfermentable
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Hop Pellet','Hop Whole Cone','Hop Extract')
  AND uc.name = 'nonfermentable';

-- Nutrients: nutrient
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Yeast Nutrient','Diammonium Phosphate (DAP)')
  AND uc.name = 'nutrient';

-- Sulphites: prefermentation-treatment
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Potassium Metabisulphite','Campden Tablet')
  AND uc.name = 'prefermentation-treatment';

-- Stabiliser
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name = 'Potassium Sorbate'
  AND uc.name = 'stabiliser';

-- Fining agents
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Bentonite','Isinglass','Pectic Enzyme',
                  'Irish Moss','Tannin')
  AND uc.name = 'fining';

-- Acids and adjustments: salt context
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Tartaric Acid','Malic Acid','Citric Acid','Acid Blend')
  AND uc.name = 'salt';

-- Yeasts: fermenter
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name IN ('Wine Yeast','Mead Yeast','Cider Yeast','Beer Yeast')
  AND uc.name = 'fermenter';

-- Lactic Acid Bacteria: malolactic
INSERT OR IGNORE INTO ingredientTypeContexts (ingredientTypeID, contextID)
SELECT it.ingredientTypeID, uc.contextID
FROM ingredientTypes it, usageContexts uc
WHERE it.name = 'Lactic Acid Bacteria'
  AND uc.name = 'malolactic';

-- =============================================================================
-- SUPPLY TYPES
-- =============================================================================

-- Cleaners & Sanitizers
INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'PBW (Powdered Brewery Wash)', 'Alkaline cleaner for organic residue'
FROM itemCategories WHERE name = 'Cleaners & Sanitizers';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Star San', 'No-rinse acid-based sanitiser'
FROM itemCategories WHERE name = 'Cleaners & Sanitizers';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Iodophor', 'Iodine-based no-rinse sanitiser'
FROM itemCategories WHERE name = 'Cleaners & Sanitizers';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Sulphite Solution', 'Potassium metabisulphite solution for equipment sanitising'
FROM itemCategories WHERE name = 'Cleaners & Sanitizers';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'General Purpose Cleaner', 'Other cleaning agents not otherwise listed'
FROM itemCategories WHERE name = 'Cleaners & Sanitizers';

-- Bottles & Vessels
INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Wine Bottle (750ml)', 'Standard 750ml wine bottle'
FROM itemCategories WHERE name = 'Bottles & Vessels';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Beer Bottle (330ml)', 'Standard 330ml beer bottle'
FROM itemCategories WHERE name = 'Bottles & Vessels';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Beer Bottle (500ml)', 'Standard 500ml beer bottle'
FROM itemCategories WHERE name = 'Bottles & Vessels';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Champagne Bottle (750ml)', 'Heavy-walled bottle for sparkling wine or cider'
FROM itemCategories WHERE name = 'Bottles & Vessels';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Swing-top Bottle (500ml)', '500ml Grolsch-style swing-top bottle'
FROM itemCategories WHERE name = 'Bottles & Vessels';

-- Closures
INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Cork (#9)', 'Standard straight cork for 19mm bore bottles'
FROM itemCategories WHERE name = 'Closures';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Champagne Cork', 'Mushroom-style cork for sparkling wine and cider'
FROM itemCategories WHERE name = 'Closures';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Crown Cap (26mm)', 'Standard European crown cap for beer and cider'
FROM itemCategories WHERE name = 'Closures';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Screw Cap', 'Standard wine screw cap'
FROM itemCategories WHERE name = 'Closures';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Swing-top Replacement Seal', 'Rubber gasket for swing-top bottles'
FROM itemCategories WHERE name = 'Closures';

-- Packaging Materials
INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Shrink Capsule', 'Heat-shrink capsule for bottle top presentation'
FROM itemCategories WHERE name = 'Packaging Materials';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Bottle Label', 'Self-adhesive bottle label'
FROM itemCategories WHERE name = 'Packaging Materials';

INSERT OR IGNORE INTO supplyTypes (categoryID, name, description)
SELECT categoryID, 'Bottle Box', 'Corrugated box for bottle storage and transport'
FROM itemCategories WHERE name = 'Packaging Materials';