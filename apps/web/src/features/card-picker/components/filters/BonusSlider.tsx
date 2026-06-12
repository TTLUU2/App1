import { useMemo } from 'react';
import type { BonusType } from '../../types';

interface Props {
  value: number;
  onChange: (v: number) => void;
  bonusType: BonusType;
  onBonusTypeChange: (v: BonusType) => void;
}

export function BonusSlider({ value, onChange, bonusType, onBonusTypeChange }: Props) {
  const min = 0,
    max = 200000,
    step = 5000,
    numberOfBars = 30;

  const bars = useMemo(() => {
    const barArray = [];
    for (let i = 0; i <= numberOfBars; i++) {
      const rawValue = min + (i * (max - min)) / numberOfBars;
      const barValue = Math.round(rawValue / step) * step;
      const heightPercentage = 20 + (i / numberOfBars) * 80;
      barArray.push({ height: heightPercentage, isActive: barValue >= value, value: barValue });
    }
    return barArray;
  }, [value]);

  const percentage = ((value - min) / (max - min)) * 100;
  const gradient = `linear-gradient(to right, #e5e7eb ${percentage}%, #DC2626 ${percentage}%)`;

  return (
    <div className="w-full bg-white pt-2 pb-4">
      <style>{`
        input[type="range"].custom-slider { -webkit-appearance: none; appearance: none; width: 100%; cursor: pointer; background: ${gradient}; height: 0.25rem; border-radius: 9999px; margin: 0; display: block; border: none; outline: none; }
        input[type="range"].custom-slider:focus { outline: none; }
        input[type="range"].custom-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -0.05rem; background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); box-sizing: border-box; }
        input[type="range"].custom-slider::-moz-range-thumb { background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); cursor: pointer; box-sizing: border-box; }
        .ladder-bar { flex: 1; background-color: #e5e7eb; cursor: pointer; transition: background-color 0.2s ease-in-out, transform 0.1s ease-in; border-radius: 2px 2px 0 0; }
        .ladder-bar.active { background-color: #DC2626; }
        .ladder-bar:hover { transform: scaleY(1.05); background-color: #f87171; }
        .toggle-switch { position: relative; display: inline-block; width: 100%; height: 32px; background-color: #e5e7eb; border-radius: 9999px; border: 1px solid #d1d5db; cursor: pointer; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-slider { position: absolute; inset: 1px; display: flex; align-items: center; transition: .4s; border-radius: 9999px; }
        .toggle-text { flex: 1; text-align: center; font-weight: 600; font-size: 13px; z-index: 2; transition: color .4s; }
        .toggle-text.left { color: #DC2626; }
        .toggle-text.right { color: #4b5563; }
        input:checked + .toggle-slider .toggle-text.left { color: #4b5563; }
        input:checked + .toggle-slider .toggle-text.right { color: #DC2626; }
        .handle { position: absolute; height: calc(100% - 2px); width: calc(50% - 2px); left: 1px; top: 1px; background-color: white; transition: .4s; border-radius: 9999px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); z-index: 1; }
        input:checked + .toggle-slider .handle { transform: translateX(calc(100% + 2px)); }
      `}</style>
      <label className="toggle-switch mb-1 transform scale-95 origin-center block">
        <input
          type="checkbox"
          checked={bonusType === 'firstYear'}
          onChange={(e) => onBonusTypeChange(e.target.checked ? 'firstYear' : 'total')}
        />
        <span className="toggle-slider">
          <span className="toggle-text left">Total</span>
          <span className="toggle-text right">First Year</span>
          <span className="handle"></span>
        </span>
      </label>
      <div className="text-left mb-2 pl-1">
        <span className="text-xs text-gray-700 font-medium">
          Over <span className="text-red-600 font-bold text-lg">{value.toLocaleString()}</span>{' '}
          points
        </span>
      </div>
      <div className="mb-2">
        <div className="w-full h-12 flex items-end space-x-[2px] mb-2">
          {bars.map((bar, idx) => (
            <div
              key={idx}
              className={`ladder-bar ${bar.isActive ? 'active' : ''}`}
              style={{ height: `${bar.height}%` }}
              onClick={() => onChange(bar.value)}
            />
          ))}
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="custom-slider"
        />
      </div>
    </div>
  );
}
