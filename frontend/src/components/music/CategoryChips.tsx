type CategoryChipsProps = {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
};

export default function CategoryChips({
  categories,
  activeCategory,
  onChange,
}: CategoryChipsProps) {
  return (
    <div className="chips-row">
      {categories.map((category) => (
        <button
          key={category}
          type="button"
          className={`chip ${activeCategory === category ? "chip--active" : ""}`}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}