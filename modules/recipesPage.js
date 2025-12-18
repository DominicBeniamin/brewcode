// recipesPage.js - Place in modules/ folder

import { getFormatters } from './formatHelpers.js';

/**
 * Render recipes list page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for recipes page
 */
function renderRecipesPage(BrewCode) {
    const recipes = BrewCode.recipe.getAll();
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (recipes.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📖</div>
                <h2 class="text-2xl font-bold text-white mb-2">No Recipes Yet</h2>
                <p class="text-gray-400 mb-6">Create your first recipe to get started</p>
                <button 
                    onclick="window.brewcode.showCreateRecipe()"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    + Create Recipe
                </button>
            </div>
        `;
    }

    return `
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-bold text-white">Recipes</h2>
            <button 
                onclick="window.brewcode.showCreateRecipe()"
                class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
                + Create Recipe
            </button>
        </div>

        <!-- Filter Tabs -->
        <div class="mb-6 flex gap-2">
            <button 
                onclick="window.brewcode.filterRecipes('all')"
                id="filter-all"
                class="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium"
            >
                All (${recipes.length})
            </button>
            <button 
                onclick="window.brewcode.filterRecipes('Mead')"
                id="filter-Mead"
                class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
            >
                Mead (${recipes.filter(r => r.type === 'Mead').length})
            </button>
            <button 
                onclick="window.brewcode.filterRecipes('Cider')"
                id="filter-Cider"
                class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
            >
                Cider (${recipes.filter(r => r.type === 'Cider').length})
            </button>
            <button 
                onclick="window.brewcode.filterRecipes('Wine')"
                id="filter-Wine"
                class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
            >
                Wine (${recipes.filter(r => r.type === 'Wine').length})
            </button>
            <button 
                onclick="window.brewcode.filterRecipes('Beer')"
                id="filter-Beer"
                class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
            >
                Beer (${recipes.filter(r => r.type === 'Beer').length})
            </button>
        </div>

        <!-- Recipes Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="recipesGrid">
            ${recipes.map(recipe => renderRecipeCard(recipe, fmt)).join('')}
        </div>
    `;
}

/**
 * Render a single recipe card
 * @param {Object} recipe - Recipe object
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for recipe card
 */
function renderRecipeCard(recipe, fmt) {
    const typeColors = {
        'Mead': 'border-amber-500 bg-amber-900/20',
        'Cider': 'border-green-500 bg-green-900/20',
        'Wine': 'border-purple-500 bg-purple-900/20',
        'Beer': 'border-yellow-500 bg-yellow-900/20',
        'Perry': 'border-teal-500 bg-teal-900/20'
    };

    const typeEmojis = {
        'Mead': '🍯',
        'Cider': '🍎',
        'Wine': '�葡',
        'Beer': '🍺',
        'Perry': '🍐'
    };

    const cardColor = typeColors[recipe.type] || 'border-gray-500 bg-gray-800';
    const emoji = typeEmojis[recipe.type] || '📖';

    return `
        <div 
            class="bg-gray-800 rounded-lg border ${cardColor} p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onclick="window.brewcode.viewRecipe(${recipe.recipeID})"
            data-recipe-type="${recipe.type}"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="text-3xl">${emoji}</div>
                ${recipe.isDraft === 1 ? `
                    <span class="bg-yellow-900/30 text-yellow-300 text-xs px-2 py-1 rounded">
                        Draft
                    </span>
                ` : ''}
            </div>

            <h3 class="text-xl font-bold text-white mb-2">${recipe.name}</h3>
            
            <div class="text-sm text-gray-400 mb-4">
                <span class="font-semibold text-gray-300">${recipe.type}</span>
                ${recipe.batchSizeL ? ` • ${fmt.volume(recipe.batchSizeL)}` : ''}
            </div>

            ${recipe.description ? `
                <p class="text-sm text-gray-400 mb-4 line-clamp-2">
                    ${recipe.description}
                </p>
            ` : ''}

            ${recipe.author ? `
                <div class="text-xs text-gray-500 mb-3">
                    By ${recipe.author}
                </div>
            ` : ''}

            <div class="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-700">
                <span>Created ${fmt.date(recipe.createdDate)}</span>
                <span class="text-amber-400 hover:text-amber-300">View Details →</span>
            </div>
        </div>
    `;
}

/**
 * Render recipe detail page
 * @param {Object} BrewCode - BrewCode API instance
 * @param {number} recipeID - Recipe ID to display
 * @returns {string} HTML for recipe detail page
 */
function renderRecipeDetail(BrewCode, recipeID) {
    const recipe = BrewCode.recipe.getWithDetails(recipeID);
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (!recipe) {
        return `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-red-500 mb-4">Recipe Not Found</h2>
                <button 
                    onclick="window.brewcode.navigate('recipes')"
                    class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                >
                    ← Back to Recipes
                </button>
            </div>
        `;
    }

    return `
        <div class="mb-6">
            <button 
                onclick="window.brewcode.navigate('recipes')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Recipes
            </button>
            
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-4xl font-bold text-white mb-2">${recipe.name}</h1>
                    <div class="flex gap-3 items-center">
                        <span class="bg-amber-900/30 text-amber-300 px-3 py-1 rounded text-sm font-medium">
                            ${recipe.type}
                        </span>
                        ${recipe.isDraft === 1 ? `
                            <span class="bg-yellow-900/30 text-yellow-300 px-3 py-1 rounded text-sm">
                                Draft
                            </span>
                        ` : ''}
                    </div>
                </div>
                
                <button 
                    onclick="window.brewcode.createBatchFromRecipe(${recipe.recipeID})"
                    class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    🍺 Start Batch
                </button>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <!-- Recipe Info Card -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-white mb-4">Recipe Info</h3>
                <div class="space-y-3 text-sm">
                    ${recipe.batchSizeL ? `
                        <div>
                            <span class="text-gray-400">Batch Size:</span>
                            <span class="text-white font-medium ml-2">${fmt.volume(recipe.batchSizeL)}</span>
                        </div>
                    ` : ''}
                    ${recipe.author ? `
                        <div>
                            <span class="text-gray-400">Author:</span>
                            <span class="text-white font-medium ml-2">${recipe.author}</span>
                        </div>
                    ` : ''}
                    <div>
                        <span class="text-gray-400">Created:</span>
                        <span class="text-white font-medium ml-2">${fmt.date(recipe.createdDate)}</span>
                    </div>
                    <div>
                        <span class="text-gray-400">Modified:</span>
                        <span class="text-white font-medium ml-2">${fmt.date(recipe.modifiedDate)}</span>
                    </div>
                </div>
            </div>

            <!-- Description Card -->
            ${recipe.description ? `
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 lg:col-span-2">
                    <h3 class="text-lg font-semibold text-white mb-4">Description</h3>
                    <p class="text-gray-300">${recipe.description}</p>
                </div>
            ` : '<div></div>'}
        </div>

        <!-- Stages -->
        <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
            <h3 class="text-2xl font-semibold text-white mb-6">Recipe Stages</h3>
            
            ${recipe.stages && recipe.stages.length > 0 ? `
                <div class="space-y-6">
                    ${recipe.stages.map((stage, index) => renderStageDetail(stage, index + 1, fmt)).join('')}
                </div>
            ` : `
                <p class="text-gray-400 text-center py-8">No stages defined for this recipe</p>
            `}
        </div>
    `;
}

/**
 * Render stage detail
 * @param {Object} stage - Stage object
 * @param {number} stageNumber - Stage number (1-based)
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for stage detail
 */
function renderStageDetail(stage, stageNumber, fmt) {
    return `
        <div class="border-l-4 border-amber-500 pl-6 py-4">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h4 class="text-xl font-semibold text-white mb-1">
                        ${stageNumber}. ${stage.stageName}
                    </h4>
                    ${stage.expectedDurationDays ? `
                        <span class="text-sm text-gray-400">
                            Expected Duration: ${fmt.duration(stage.expectedDurationDays)}
                        </span>
                    ` : ''}
                </div>
            </div>

            ${stage.instructions ? `
                <div class="bg-gray-900 rounded p-4 mb-4">
                    <p class="text-gray-300 text-sm whitespace-pre-line">${stage.instructions}</p>
                </div>
            ` : ''}

            ${stage.ingredients && stage.ingredients.length > 0 ? `
                <div class="mt-4">
                    <h5 class="text-sm font-semibold text-gray-400 mb-2">Ingredients:</h5>
                    <ul class="space-y-2">
                        ${stage.ingredients.map(ing => `
                            <li class="text-sm text-gray-300 flex justify-between">
                                <span>${ing.ingredientTypeName}</span>
                                <span class="font-medium">
                                    ${ing.amount} ${ing.unit}
                                    ${ing.scalingMethod === 'fixed' ? ' (fixed)' : ''}
                                    ${ing.scalingMethod === 'step' ? ' (step)' : ''}
                                </span>
                            </li>
                            ${ing.notes ? `
                                <li class="text-xs text-gray-500 ml-4">
                                    ${ing.notes}
                                </li>
                            ` : ''}
                        `).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Filter recipes by type
 * @param {string} type - Recipe type to filter by ('all' or specific type)
 */
function filterRecipes(type) {
    // Update button states
    const buttons = document.querySelectorAll('[id^="filter-"]');
    buttons.forEach(btn => {
        if (btn.id === `filter-${type}`) {
            btn.className = 'px-4 py-2 rounded-lg bg-amber-600 text-white font-medium';
        } else {
            btn.className = 'px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium';
        }
    });

    // Filter recipe cards
    const cards = document.querySelectorAll('[data-recipe-type]');
    cards.forEach(card => {
        if (type === 'all' || card.dataset.recipeType === type) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

export { 
    renderRecipesPage, 
    renderRecipeDetail,
    filterRecipes
};