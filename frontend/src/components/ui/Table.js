import React from 'react';

const Table = ({ children, className = '' }) => {
    return (
        <div className={`w-full overflow-x-auto ${className}`}>
            <table className={`min-w-full divide-y divide-[var(--border-color)] ${className}`}>
                {children}
            </table>
        </div>
    );
};

export const TableHeader = ({ children }) => {
    return (
        <thead className="bg-[var(--table-header-bg)] text-xs uppercase text-[var(--secondary-text)] border-b border-[var(--border-color)]">
            {children}
        </thead>
    );
};

export const TableBody = ({ children }) => {
    return (
        <tbody className="divide-y divide-[var(--border-color)]">
            {children}
        </tbody>
    );
};

export const TableRow = ({ children, isSelected = false, onClick, className = '' }) => {
    return (
        <tr 
            className={`
                ${isSelected ? 'bg-[var(--hover-bg)]' : 'hover:bg-[var(--hover-bg)]'} 
                ${onClick ? 'cursor-pointer' : ''}
                transition-colors
                ${className}
            `}
            onClick={onClick}
        >
            {children}
        </tr>
    );
};

export const TableCell = ({ children, className = '' }) => {
    return (
        <td className={`px-6 py-4 text-sm text-[var(--primary-text)] ${className}`}>
            {children}
        </td>
    );
};

export const TableHeaderCell = ({ children, className = '' }) => {
    return (
        <th scope="col" className={`px-6 py-3 text-left ${className}`}>
            {children}
        </th>
    );
};

export default Table; 