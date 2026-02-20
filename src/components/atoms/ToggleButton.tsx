export default function ToggleButton({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      className='flex cursor-pointer items-center justify-center rounded-md p-3 transition-all duration-300 hover:bg-gray-100'
      onClick={onChange}
    >
      <div className='flex items-center gap-x-2'>
        <div
          className={`relative inline-flex h-[16px] w-[28px] cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
            checked ? 'bg-black' : 'bg-[#d7d7d5]'
          }`}
          role='switch'
          aria-checked={checked}
        >
          <span
            className={`inline-block h-[12px] w-[12px] transform cursor-pointer rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out ${
              checked ? 'translate-x-[14px]' : 'translate-x-[2px]'
            }`}
          />
        </div>
        <span className='b2 cursor-pointer text-[14px] font-semibold'>{label}</span>
      </div>
    </button>
  );
}
