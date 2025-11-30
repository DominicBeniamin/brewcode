// test.js
import BrewCode from '../modules/brewcode.js';

async function test() {
    // Initialize
    await BrewCode.init();
    console.log('✅ Database initialized');
    
    // Test query
    const tables = BrewCode.query('SELECT name FROM sqlite_master WHERE type="table"');
    console.log('✅ Tables:', tables);
    
    // Test ingredient type
    const appleJuice = BrewCode.ingredient.createType({
        categoryID: 1,
        name: "Test Apple Juice",
        beverageTypes: ["Cider"]
    });
    console.log('✅ Ingredient created:', appleJuice);
    
    // Test supply type
    const bottleType = BrewCode.supply.type.create({
        categoryID: 9,
        name: "Test Bottle Type"
    });
    console.log('✅ Supply type created:', bottleType);
    
    console.log('\n🎉 ALL TESTS PASSED!');
}

test().catch(console.error);