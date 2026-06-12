interface Props {
  value: number;
  onChange: (v: number) => void;
  onChangeEnd?: (v: number) => void;
}

export function FeeSlider({ value, onChange, onChangeEnd }: Props) {
  const min = 0,
    max = 1000;
  const percentage = ((Math.min(value, max) - min) / (max - min)) * 100;
  const gradient = `linear-gradient(to right, #DC2626 ${percentage}%, #e5e7eb ${percentage}%)`;

  return (
    <div className="w-full bg-white pt-2 pb-6 px-1">
      <style>{`
        input[type="range"].fee-slider { -webkit-appearance: none; appearance: none; width: 100%; cursor: pointer; background: ${gradient}; height: 0.25rem; border-radius: 9999px; margin: 0; display: block; border: none; outline: none; }
        input[type="range"].fee-slider:focus { outline: none; }
        input[type="range"].fee-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; margin-top: -0.05rem; background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; cursor: pointer; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); box-sizing: border-box; }
        input[type="range"].fee-slider::-moz-range-thumb { background-color: #DC2626; height: 1rem; width: 1rem; border-radius: 9999px; border: 2px solid white; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); cursor: pointer; box-sizing: border-box; }
      `}</style>
      <div className="text-left mb-2 pl-1">
        <span className="text-xs text-gray-700 font-medium">
          Up to{' '}
          <span className="text-red-600 font-bold text-lg">
            {value >= 1000 ? 'Any' : `$${value}`}
          </span>
        </span>
      </div>
      <div className="relative mb-2">
        <div className="flex justify-between mb-1 text-xs font-bold text-gray-400 px-1">
          <span>$</span>
          <span>$$</span>
          <span>$$$</span>
          <span>$$$$</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={25}
          value={value > 1000 ? 1000 : value}
          onChange={(e) => {
            const val = Number(e.target.value);
            onChange(val === 1000 ? 2000 : val);
          }}
          onMouseUp={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onChangeEnd?.(val === 1000 ? 2000 : val);
          }}
          onTouchEnd={(e) => {
            const val = Number((e.target as HTMLInputElement).value);
            onChangeEnd?.(val === 1000 ? 2000 : val);
          }}
          className="fee-slider"
        />
      </div>
    </div>
  );
}
