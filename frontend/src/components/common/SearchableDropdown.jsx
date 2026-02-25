import { useState, useRef, useEffect } from "react";

const SearchableDropdown = ({
    label,
    required,
    placeholder = "Search...",
    options = [],
    value,
    onChange,
    renderOption,
    displayValue,
    searchKeys = ["name"],
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef(null);
    const inputRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
                setSearch("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter((opt) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return searchKeys.some((key) =>
            String(opt[key] || "").toLowerCase().includes(q)
        );
    });

    const selectedOption = options.find((o) => String(o.id) === String(value));

    const handleSelect = (opt) => {
        onChange(opt);
        setIsOpen(false);
        setSearch("");
    };

    return (
        <div className="sd-container" ref={containerRef}>
            {label && (
                <label className="sd-label">
                    {label} {required && <span className="required">*</span>}
                </label>
            )}
            <div className="sd-input-wrapper">
                <input
                    ref={inputRef}
                    type="search"
                    autoComplete="off"
                    className={`sd-search-input-unified ${isOpen ? "sd-input-active" : ""} ${selectedOption ? "sd-has-selection" : ""}`}
                    placeholder={selectedOption ? (displayValue ? displayValue(selectedOption) : selectedOption.name) : placeholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                />
                <i className={`fas fa-chevron-${isOpen ? "up" : "down"} sd-chevron-unified`} />

                {isOpen && (
                    <div className="sd-dropdown-unified custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="sd-no-results">No results found</div>
                        ) : (
                            filtered.map((opt) => (
                                <div
                                    key={opt.id}
                                    className={`sd-option ${String(opt.id) === String(value) ? "sd-option-selected" : ""}`}
                                    onClick={() => handleSelect(opt)}
                                >
                                    {renderOption ? renderOption(opt) : (
                                        <span>{opt.name}</span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchableDropdown;
