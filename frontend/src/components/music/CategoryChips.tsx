type Props = {
  categories: string[];
  activeCategory: string;
  onChange: (category: string) => void;
};

export default function CategoryChips({
  categories,
  activeCategory,
  onChange,
}: Props) {
  return (
    <div className="chip-row">
      {categories.map((category) => (
        <button
          key={category}
          className={`chip ${activeCategory === category ? "active" : ""}`}
          onClick={() => onChange(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
}