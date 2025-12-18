// batchesPage.js - Place in modules/ folder

import { getFormatters } from './formatHelpers.js';

/**
 * Render batches list page
 * @param {Object} BrewCode - BrewCode API instance
 * @returns {string} HTML for batches page
 */
function renderBatchesPage(BrewCode) {
    const batches = BrewCode.batch.getAll();
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (batches.length === 0) {
        return `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🍺</div>
                <h2 class="text-2xl font-bold text-white mb-2">No Batches Yet</h2>
                <p class="text-gray-400 mb-6">Start your first batch to begin brewing</p>
                <button 
                    onclick="window.brewcode.navigate('recipes')"
                    class="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                    Browse Recipes
                </button>
            </div>
        `;
    }

    // Group batches by status
    const planned = batches.filter(b => b.status === 'planned');
    const active = batches.filter(b => b.status === 'active');
    const completed = batches.filter(b => b.status === 'completed');
    const abandoned = batches.filter(b => b.status === 'abandoned');

    return `
        <div class="mb-6">
            <h2 class="text-3xl font-bold text-white mb-6">Batches</h2>

            <!-- Status Overview -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-blue-400">${planned.length}</div>
                    <div class="text-sm text-gray-400">Planned</div>
                </div>
                <div class="bg-green-900/20 border border-green-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-green-400">${active.length}</div>
                    <div class="text-sm text-gray-400">Active</div>
                </div>
                <div class="bg-purple-900/20 border border-purple-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-purple-400">${completed.length}</div>
                    <div class="text-sm text-gray-400">Completed</div>
                </div>
                <div class="bg-gray-700/20 border border-gray-500 rounded-lg p-4">
                    <div class="text-2xl font-bold text-gray-400">${abandoned.length}</div>
                    <div class="text-sm text-gray-400">Abandoned</div>
                </div>
            </div>

            <!-- Filter Tabs -->
            <div class="mb-6 flex gap-2 flex-wrap">
                <button 
                    onclick="window.brewcode.filterBatches('all')"
                    id="batch-filter-all"
                    class="px-4 py-2 rounded-lg bg-amber-600 text-white font-medium"
                >
                    All (${batches.length})
                </button>
                <button 
                    onclick="window.brewcode.filterBatches('active')"
                    id="batch-filter-active"
                    class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
                >
                    Active (${active.length})
                </button>
                <button 
                    onclick="window.brewcode.filterBatches('planned')"
                    id="batch-filter-planned"
                    class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
                >
                    Planned (${planned.length})
                </button>
                <button 
                    onclick="window.brewcode.filterBatches('completed')"
                    id="batch-filter-completed"
                    class="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium"
                >
                    Completed (${completed.length})
                </button>
            </div>
        </div>

        <!-- Batches List -->
        <div class="space-y-4" id="batchesList">
            ${batches.map(batch => renderBatchCard(batch, fmt)).join('')}
        </div>
    `;
}

/**
 * Render a single batch card
 * @param {Object} batch - Batch object
 * @param {Object} fmt - Formatters object
 * @returns {string} HTML for batch card
 */
function renderBatchCard(batch, fmt) {
    const statusColors = {
        'planned': 'border-blue-500 bg-blue-900/10',
        'active': 'border-green-500 bg-green-900/10',
        'completed': 'border-purple-500 bg-purple-900/10',
        'abandoned': 'border-gray-500 bg-gray-700/10'
    };

    const statusBadges = {
        'planned': 'bg-blue-900/30 text-blue-300',
        'active': 'bg-green-900/30 text-green-300',
        'completed': 'bg-purple-900/30 text-purple-300',
        'abandoned': 'bg-gray-700/30 text-gray-400'
    };

    const cardColor = statusColors[batch.status] || 'border-gray-500 bg-gray-800';
    const badgeColor = statusBadges[batch.status] || 'bg-gray-700 text-gray-300';

    return `
        <div 
            class="bg-gray-800 rounded-lg border ${cardColor} p-6 hover:shadow-lg transition-shadow cursor-pointer"
            onclick="window.brewcode.viewBatch(${batch.batchID})"
            data-batch-status="${batch.status}"
        >
            <div class="flex justify-between items-start mb-4">
                <div class="flex-1">
                    <h3 class="text-xl font-bold text-white mb-2">${batch.name}</h3>
                    <div class="text-sm text-gray-400 mb-2">
                        Based on: <span class="text-amber-400">${batch.recipeName}</span>
                    </div>
                    <div class="flex gap-2 items-center flex-wrap">
                        <span class="${badgeColor} px-2 py-1 rounded text-xs font-medium uppercase">
                            ${batch.status}
                        </span>
                        <span class="text-sm text-gray-400">
                            ${fmt.volume(batch.actualBatchSizeL)}
                        </span>
                    </div>
                </div>
                <div class="text-right text-sm text-gray-500">
                    ${batch.startDate ? `
                        <div>Started: ${fmt.date(batch.startDate)}</div>
                    ` : ''}
                    ${batch.endDate ? `
                        <div>Ended: ${fmt.date(batch.endDate)}</div>
                    ` : ''}
                </div>
            </div>

            ${batch.notes ? `
                <p class="text-sm text-gray-400 mb-4 line-clamp-2">${batch.notes}</p>
            ` : ''}

            <div class="flex justify-between items-center text-sm pt-4 border-t border-gray-700">
                <span class="text-gray-500">Batch #${batch.batchID}</span>
                <span class="text-amber-400 hover:text-amber-300">View Details →</span>
            </div>
        </div>
    `;
}

/**
 * Render batch detail page
 * @param {Object} BrewCode - BrewCode API instance
 * @param {number} batchID - Batch ID to display
 * @returns {string} HTML for batch detail page
 */
function renderBatchDetail(BrewCode, batchID) {
    const batch = BrewCode.batch.getWithDetails(batchID);
    const settings = BrewCode.settings.get();
    const fmt = getFormatters(settings);

    if (!batch) {
        return `
            <div class="text-center py-12">
                <h2 class="text-2xl font-bold text-red-500 mb-4">Batch Not Found</h2>
                <button 
                    onclick="window.brewcode.navigate('batches')"
                    class="bg-gray-700 hover:bg-gray-600 text-white py-2 px-6 rounded-lg"
                >
                    ← Back to Batches
                </button>
            </div>
        `;
    }

    const statusColors = {
        'planned': 'bg-blue-900/30 text-blue-300',
        'active': 'bg-green-900/30 text-green-300',
        'completed': 'bg-purple-900/30 text-purple-300',
        'abandoned': 'bg-gray-700/30 text-gray-400'
    };

    const badgeColor = statusColors[batch.status] || 'bg-gray-700 text-gray-300';

    return `
        <div class="mb-6">
            <button 
                onclick="window.brewcode.navigate('batches')"
                class="text-amber-400 hover:text-amber-300 mb-4 inline-block"
            >
                ← Back to Batches
            </button>
            
            <div class="flex justify-between items-start">
                <div>
                    <h1 class="text-4xl font-bold text-white mb-2">${batch.name}</h1>
                    <div class="flex gap-3 items-center mb-2">
                        <span class="${badgeColor} px-3 py-1 rounded text-sm font-medium uppercase">
                            ${batch.status}
                        </span>
                        <span class="text-gray-400">Batch #${batch.batchID}</span>
                    </div>
                    <div class="text-sm text-gray-400">
                        Based on: <span class="text-amber-400">${batch.recipeName}</span>
                    </div>
                </div>
                
                <div class="flex gap-2">
                    ${batch.status === 'planned' ? `
                        <button 
                            onclick="window.brewcode.startBatch(${batch.batchID})"
                            class="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            ▶️ Start Batch
                        </button>
                    ` : ''}
                    ${batch.status === 'active' ? `
                        <button 
                            onclick="window.brewcode.completeBatch(${batch.batchID})"
                            class="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                            ✓ Complete Batch
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>

        <!-- Batch Info Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 class="text-lg font-semibold text-white mb-4">Batch Info</h3>
                <div class="space-y-3 text-sm">
                    <div>
                        <span class="text-gray-400">Batch Size:</span>
                        <span class="text-white font-medium ml-2">${fmt.volume(batch.actualBatchSizeL)}</span>
                    </div>
                    ${batch.startDate ? `
                        <div>
                            <span class="text-gray-400">Started:</span>
                            <span class="text-white font-medium ml-2">${fmt.date(batch.startDate)}</span>
                        </div>
                    ` : ''}
                    ${batch.endDate ? `
                        <div>
                            <span class="text-gray-400">Ended:</span>
                            <span class="text-white font-medium ml-2">${fmt.date(batch.endDate)}</span>
                        </div>
                    ` : ''}
                    ${batch.status === 'abandoned' && batch.abandonReason ? `
                        <div>
                            <span class="text-gray-400">Reason:</span>
                            <span class="text-red-400 font-medium ml-2">${batch.abandonReason}</span>
                        </div>
                    ` : ''}
                </div>
            </div>

            ${batch.notes ? `
                <div class="bg-gray-800 rounded-lg border border-gray-700 p-6 md:col-span-2">
                    <h3 class="text-lg font-semibold text-white mb-4">Notes</h3>
                    <p class="text-gray-300 text-sm whitespace-pre-line">${batch.notes}</p>
                </div>
            ` : '<div></div>'}
        </div>

        <!-- Stages -->
        ${batch.stages && batch.stages.length > 0 ? `
            <div class="bg-gray-800 rounded-lg border border-gray-700 p-6">
                <h3 class="text-2xl font-semibold text-white mb-6">Batch Stages</h3>
                <div class="space-y-6">
                    ${batch.stages.map(stage => renderBatchStage(stage, fmt, batch.status)).join('')}
                </div>
            </div>
        ` : ''}
    `;
}

/**
 * Render batch stage
 * @param {Object} stage - Stage object
 * @param {Object} fmt - Formatters object
 * @param {string} batchStatus - Overall batch status
 * @returns {string} HTML for stage
 */
function renderBatchStage(stage, fmt, batchStatus) {
    const stageColors = {
        'pending': 'border-gray-500',
        'active': 'border-green-500',
        'completed': 'border-purple-500',
        'skipped': 'border-yellow-500'
    };

    const stageBadges = {
        'pending': 'bg-gray-700 text-gray-300',
        'active': 'bg-green-900/30 text-green-300',
        'completed': 'bg-purple-900/30 text-purple-300',
        'skipped': 'bg-yellow-900/30 text-yellow-300'
    };

    const borderColor = stageColors[stage.status] || 'border-gray-500';
    const badgeColor = stageBadges[stage.status] || 'bg-gray-700 text-gray-300';

    return `
        <div class="border-l-4 ${borderColor} pl-6 py-4">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="text-xl font-semibold text-white">
                            ${stage.stageName}
                        </h4>
                        <span class="${badgeColor} px-2 py-1 rounded text-xs font-medium uppercase">
                            ${stage.status}
                        </span>
                    </div>
                    ${stage.expectedDurationDays ? `
                        <span class="text-sm text-gray-400">
                            Expected: ${fmt.duration(stage.expectedDurationDays)}
                        </span>
                    ` : ''}
                </div>
                <div class="text-right">
                    ${stage.status === 'pending' && batchStatus === 'active' ? `
                        <button 
                            onclick="window.brewcode.startStage(${stage.batchStageID})"
                            class="bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded transition-colors"
                        >
                            Start Stage
                        </button>
                    ` : ''}
                    ${stage.status === 'active' ? `
                        <button 
                            onclick="window.brewcode.completeStage(${stage.batchStageID})"
                            class="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded transition-colors"
                        >
                            Complete
                        </button>
                    ` : ''}
                </div>
            </div>

            ${stage.startDate || stage.endDate ? `
                <div class="text-xs text-gray-500 mb-3">
                    ${stage.startDate ? `Started: ${fmt.date(stage.startDate)}` : ''}
                    ${stage.startDate && stage.endDate ? ' • ' : ''}
                    ${stage.endDate ? `Ended: ${fmt.date(stage.endDate)}` : ''}
                </div>
            ` : ''}

            ${stage.instructions ? `
                <div class="bg-gray-900 rounded p-4 mb-4">
                    <p class="text-gray-300 text-sm whitespace-pre-line">${stage.instructions}</p>
                </div>
            ` : ''}

            ${stage.ingredients && stage.ingredients.length > 0 ? `
                <div class="mt-4">
                    <h5 class="text-sm font-semibold text-gray-400 mb-2">Ingredients:</h5>
                    <div class="bg-gray-900 rounded p-3">
                        <ul class="space-y-2">
                            ${stage.ingredients.map(ing => `
                                <li class="text-sm flex justify-between">
                                    <span class="text-gray-300">${ing.ingredientTypeName}</span>
                                    <span class="text-gray-400">
                                        ${ing.actualAmount || ing.plannedAmount} ${ing.actualUnit || ing.plannedUnit}
                                        ${ing.actualAmount ? ' (used)' : ' (planned)'}
                                    </span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Filter batches by status
 * @param {string} status - Status to filter by
 */
function filterBatches(status) {
    // Update button states
    const buttons = document.querySelectorAll('[id^="batch-filter-"]');
    buttons.forEach(btn => {
        if (btn.id === `batch-filter-${status}`) {
            btn.className = 'px-4 py-2 rounded-lg bg-amber-600 text-white font-medium';
        } else {
            btn.className = 'px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 font-medium';
        }
    });

    // Filter batch cards
    const cards = document.querySelectorAll('[data-batch-status]');
    cards.forEach(card => {
        if (status === 'all' || card.dataset.batchStatus === status) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

export { 
    renderBatchesPage, 
    renderBatchDetail,
    filterBatches
};