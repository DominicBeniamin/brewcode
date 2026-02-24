import { useState } from 'react';
import { UnitConverter } from './UnitConverter';
import { DensityCorrector } from './DensityCorrector';
import { ABVCalculator } from './ABVCalculator';
import { PrimingCalculator } from './PrimingCalculator';

type Tool = 'converter' | 'density' | 'abv' | 'priming';

export function BrewToolsPage() {
  const [activeTool, setActiveTool] = useState<Tool>('converter');

  const tools = [
    { id: 'converter' as Tool, label: 'Unit Converter' },
    { id: 'density' as Tool, label: 'Density Correction' },
    { id: 'abv' as Tool, label: 'ABV Calculator' },
    { id: 'priming' as Tool, label: 'Priming Calculator' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-500 mb-2">🔢 Brew Tools</h1>
          <p className="text-gray-400">Calculators and converters for brewing</p>
        </div>

        {/* Tool Selector - Desktop: Buttons, Mobile: Dropdown */}
        
        {/* Desktop Button Row (hidden below sm breakpoint) */}
        <div className="hidden sm:flex gap-2 mb-6 overflow-x-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                activeTool === tool.id
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>

        {/* Mobile Dropdown (hidden above sm breakpoint) */}
        <div className="sm:hidden mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">Select Tool</label>
          <select
            value={activeTool}
            onChange={(e) => setActiveTool(e.target.value as Tool)}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-amber-500 focus:outline-none"
          >
            {tools.map((tool) => (
              <option key={tool.id} value={tool.id}>
                {tool.label}
              </option>
            ))}
          </select>
        </div>

        {/* Active Tool */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          {activeTool === 'converter' && <UnitConverter />}
          {activeTool === 'density' && <DensityCorrector />}
          {activeTool === 'abv' && <ABVCalculator />}
          {activeTool === 'priming' && <PrimingCalculator />}
        </div>
      </div>
    </div>
  );
}