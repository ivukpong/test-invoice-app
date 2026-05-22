import React from "react";
import { Plus, Trash2 } from "lucide-react";
import InvoiceRow from "./InvoiceRow";
import styles from "./InvoiceTable.module.css";

export default function InvoiceTable({
  items,
  onItemsChange,
  currency,
  viewOnly,
}) {
  const handleRowChange = (index, newItem) => {
    const updated = [...items];
    updated[index] = newItem;
    onItemsChange(updated);
  };

  const addRow = () => {
    onItemsChange([...items, { description: "", quantity: 0, unitPrice: 0 }]);
  };

  const deleteRow = (index) => {
    const updated = items.filter((_, i) => i !== index);
    onItemsChange(updated);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Invoice Items</h3>
      </div>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Quantity</th>
              <th className={styles.th}>Unit Price</th>
              <th className={styles.th}>Line Total</th>
              {!viewOnly && <th className={styles.th}></th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <InvoiceRow
                key={idx}
                item={item}
                currency={currency}
                onChange={(newItem) => handleRowChange(idx, newItem)}
                onDelete={() => deleteRow(idx)}
                viewOnly={viewOnly}
              />
            ))}
          </tbody>
        </table>
      </div>
      {!viewOnly && (
        <button className={styles.addButton} onClick={addRow}>
          <Plus size={20} />
          Add Item
        </button>
      )}
    </div>
  );
}
