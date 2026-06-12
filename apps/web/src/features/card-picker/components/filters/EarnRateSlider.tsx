import { useMemo } from 'react';

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function EarnRateSlider({ value, onChange }: Props) {
  const min = 0,
    max = 3,
    numberOfBars = 30,
    step = 0.05;

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
        input[type="range"].earn-slider { -webkit-appearance: none; appearance: none; width: 100%; cursor: pointer; background: ${gradient}; height: 0.25rem; border-radius: 9999px; margin: 0; display: block; border: none; outline: none; }
        input[type="range"].earn-slider:focus { outline: none; }
        input[type="range"].earn-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -0.05rem; background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); box-sizing: border-box; }
        input[type="range"].earn-slider::-moz-range-thumb { background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); cursor: pointer; box-sizing: border-box; }
        .ladder-bar { flex: 1; background-color: #e5e7eb; cursor: pointer; transition: background-color 0.2s ease-in-out, transform 0.1s ease-in; border-radius: 2px 2px 0 0; }
        .ladder-bar.active { background-color: #DC2626; }
        .ladder-bar:hover { transform: scaleY(1.05); background-color: #f87171; }
      `}</style>
      <div className="text-left mb-2 pl-1">
        <span className="text-xs text-gray-700 font-medium">
          Over <span className="text-red-600 font-bold text-lg">{value.toFixed(2)}</span> pts/$
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
          step={0.05}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="earn-slider"
        />
      </div>
    </div>
  );
}
