// dashboardPage.js

import { getFormatters } from './formatHelpers.js';

/**
 * Render dashboard page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for dashboard page
 */
function renderDashboardPage(BrewCode) {
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    // Get data
    const allBatches = BrewCode.batch.getAll();
    const activeBatches = allBatches.filter(b => b.status === 'active');
    const plannedBatches = allBatches.filter(b => b.status === 'planned');
    const completedBatches = allBatches.filter(b => b.status === 'completed');
    
    const recipes = BrewCode.recipe.getAll();
    const inventory = BrewCode.inventory.getAll({ status: 'active' });
    const equipment = BrewCode.equipment.getAll({ isActive: 1 });
    
    // Get equipment availability
    const batchOccupyingEquipment = equipment.filter(e => e.canBeOccupied === 1);
    let availableEquipment = 0;
    let inUseEquipment = 0;
    
    batchOccupyingEquipment.forEach(e => {
        try {
            const usage = BrewCode.equipment.getCurrentUsage(e.equipmentID);
            if (usage) {
                inUseEquipment++;
            } else {
                availableEquipment++;
            }
        } catch (error) {
            availableEquipment++;
        }
    });

    // Get recent activity (last 10 events across all batches)
    const recentActivity = [];
    activeBatches.forEach(batch => {
        try {
            const timeline = BrewCode.batch.getTimeline(batch.batchID);
            timeline.forEach(event => {
                recentActivity.push({
                    ...event,
                    batchID: batch.batchID,
                    batchName: batch.name
                });
            });
        } catch (error) {
            console.error('Error getting timeline:', error);
        }
    });
    
    // Sort by date descending and take top 10
    recentActivity.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recentEvents = recentActivity.slice(0, 10);

    return `
        <div class="space-y-8">
        
            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div class="bg-green-900/20 border border-green-500 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                     onclick="window.brewcode.navigate('batches')">
                    <div class="text-3xl font-bold text-green-400 mb-2">${activeBatches.length}</div>
                    <div class="text-sm text-gray-400">Active Batches</div>
                    ${activeBatches.length > 0 ? `
                        <div class="text-xs text-green-300 mt-2">Click to view →</div>
                    ` : ''}
                </div>

                <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                     onclick="window.brewcode.navigate('recipes')">
                    <div class="text-3xl font-bold text-blue-400 mb-2">${recipes.length}</div>
                    <div class="text-sm text-gray-400">Recipes</div>
                    <div class="text-xs text-blue-300 mt-2">Click to browse →</div>
                </div>

                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                     onclick="window.brewcode.navigate('inventory')">
                    <div class="text-3xl font-bold text-purple-400 mb-2">${inventory.length}</div>
                    <div class="text-sm text-gray-400">Inventory</div>
                    ${inventory.length > 0 ? `
                        <div class="text-xs text-purple-300 mt-2">Click to view →</div>
                    ` : ''}
                </div>

                <div class="bg-amber-900/20 border border-amber-500 rounded-lg p-6 hover:shadow-lg transition-shadow cursor-pointer"
                     onclick="window.brewcode.navigate('equipment')">
                    <div class="text-3xl font-bold text-amber-400 mb-2">${availableEquipment}/${batchOccupyingEquipment.length}</div>
                    <div class="text-sm text-gray-400">Equipment Available</div>
                    <div class="text-xs text-amber-300 mt-2">Click to view →</div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h2 class="text-xl font-bold text-white mb-4">Quick Actions</h2>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                        onclick="window.brewcode.navigate('recipes')"
                        class="bg-green-900/30 hover:bg-green-900/50 border border-green-500 text-white p-4 rounded-lg transition-all text-left"
                    >
                        <div class="text-2xl mb-2">🍺</div>
                        <div class="font-semibold mb-1">Start New Batch</div>
                        <div class="text-sm text-gray-400">Choose a recipe and begin brewing</div>
                    </button>

                    <button 
                        onclick="window.brewcode.showCreateRecipe()"
                        class="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500 text-white p-4 rounded-lg transition-all text-left"
                    >
                        <div class="text-2xl mb-2">📖</div>
                        <div class="font-semibold mb-1">Create Recipe</div>
                        <div class="text-sm text-gray-400">Design a new brewing recipe</div>
                    </button>

                    <button 
                        onclick="window.brewcode.showAddInventory()"
                        class="bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500 text-white p-4 rounded-lg transition-all text-left"
                    >
                        <div class="text-2xl mb-2">📦</div>
                        <div class="font-semibold mb-1">Add Inventory</div>
                        <div class="text-sm text-gray-400">Track new ingredients or supplies</div>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- Active Batches -->
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-xl font-bold text-white">Active Batches</h2>
                        ${activeBatches.length > 0 ? `
                            <button 
                                onclick="window.brewcode.navigate('batches')"
                                class="text-amber-400 hover:text-amber-300 text-sm"
                            >
                                View All →
                            </button>
                        ` : ''}
                    </div>

                    ${activeBatches.length === 0 ? `
                        <div class="text-center py-8 text-gray-400">
                            <div class="text-4xl mb-3">🍺</div>
                            <p>No active batches</p>
                            <button 
                                onclick="window.brewcode.navigate('recipes')"
                                class="mt-4 text-amber-400 hover:text-amber-300 text-sm"
                            >
                                Start your first batch →
                            </button>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${activeBatches.slice(0, 5).map(batch => renderActiveBatchCard(batch, fmt)).join('')}
                            ${activeBatches.length > 5 ? `
                                <div class="text-center pt-2">
                                    <button 
                                        onclick="window.brewcode.navigate('batches')"
                                        class="text-sm text-amber-400 hover:text-amber-300"
                                    >
                                        Show ${activeBatches.length - 5} more →
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `}
                </div>

                <!-- Recent Activity -->
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h2 class="text-xl font-bold text-white mb-4">Recent Activity</h2>
                    
                    ${recentEvents.length === 0 ? `
                        <div class="text-center py-8 text-gray-400">
                            <div class="text-4xl mb-3">📋</div>
                            <p>No recent activity</p>
                            <p class="text-sm mt-2">Start a batch to see activity here</p>
                        </div>
                    ` : `
                        <div class="space-y-3 max-h-96 overflow-y-auto">
                            ${recentEvents.map(event => renderActivityItem(event, fmt)).join('')}
                        </div>
                    `}
                </div>
            </div>

            <!-- Additional Stats -->
            ${allBatches.length > 0 ? `
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                    <h2 class="text-xl font-bold text-white mb-4">Batch Statistics</h2>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-400">${plannedBatches.length}</div>
                            <div class="text-sm text-gray-400">Planned</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-400">${activeBatches.length}</div>
                            <div class="text-sm text-gray-400">Active</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-purple-400">${completedBatches.length}</div>
                            <div class="text-sm text-gray-400">Completed</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-amber-400">${allBatches.length}</div>
                            <div class="text-sm text-gray-400">Total</div>
                        </div>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Render active batch card for dashboard
 * @param {Object} batch - Batch object
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for batch card
 */
function renderActiveBatchCard(batch, fmt) {
    return `
        <div 
            class="bg-gray-900 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer border border-gray-700"
            onclick="window.brewcode.viewBatch(${batch.batchID})"
        >
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1">
                    <h3 class="font-semibold text-white">${batch.name}</h3>
                    <div class="text-sm text-gray-400">${batch.recipeName}</div>
                </div>
                <div class="text-right">
                    <div class="text-sm text-amber-400">${fmt.volume(batch.actualBatchSizeL)}</div>
                </div>
            </div>
            <div class="flex justify-between items-center text-xs">
                <span class="text-gray-500">Started ${fmt.date(batch.startDate)}</span>
                <span class="text-amber-400 hover:text-amber-300">View →</span>
            </div>
        </div>
    `;
}

/**
 * Render activity item for timeline
 * @param {Object} event - Activity event object
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for activity item
 */
function renderActivityItem(event, fmt) {
    const icons = {
        'batch_started': '🚀',
        'batch_completed': '✅',
        'batch_abandoned': '❌',
        'stage_started': '▶️',
        'stage_completed': '✔️',
        'stage_skipped': '⏭️',
        'measurement': '📊',
        'equipment_assigned': '🔧',
        'equipment_released': '🔓',
        'ingredient_used': '🧪'
    };

    const icon = icons[event.type] || '📌';

    return `
        <div class="flex gap-3 py-2 border-b border-gray-700 last:border-0">
            <div class="text-xl">${icon}</div>
            <div class="flex-1 min-w-0">
                <div class="text-sm text-white truncate">${event.description}</div>
                <div class="text-xs text-gray-500">
                    ${event.batchName} • ${fmt.datetime(event.date)}
                </div>
            </div>
            ${event.batchID ? `
                <button 
                    onclick="event.stopPropagation(); window.brewcode.viewBatch(${event.batchID})"
                    class="text-amber-400 hover:text-amber-300 text-xs flex-shrink-0"
                >
                    View
                </button>
            ` : ''}
        </div>
    `;
}

export { renderDashboardPage };