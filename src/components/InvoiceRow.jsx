import React from "react";
import { Trash2 } from "lucide-react";
import { calculateLineTotal, formatCurrency } from "../utils/calculations";
import styles from "./InvoiceRow.module.css";

export default function InvoiceRow({
  item,
  onChange,
  onDelete,
  currency,
  viewOnly,
}) {
  const handleInput = (e) => {
    if (viewOnly) return;
    const { name, value } = e.target;
    onChange({ ...item, [name]: value });
  };

  const total = calculateLineTotal(item.quantity, item.unitPrice);

  return (
    <tr className={styles.row}>
      <td className={styles.td}>
        <input
          name="description"
          value={item.description}
          onChange={handleInput}
          className={styles.input}
          placeholder="Item description"
          disabled={viewOnly}
        />
      </td>
      <td className={styles.td}>
        <input
          type="number"
          name="quantity"
          value={item.quantity}
          onChange={handleInput}
          min="0"
          className={`${styles.input} ${styles.numberInput}`}
          disabled={viewOnly}
        />
      </td>
      <td className={styles.td}>
        <input
          type="number"
          name="unitPrice"
          value={item.unitPrice}
          onChange={handleInput}
          min="0"
          step="0.01"
          className={`${styles.input} ${styles.numberInput}`}
          disabled={viewOnly}
        />
      </td>
      <td className={styles.td}>
        <span className={styles.total}>{formatCurrency(total, "en-NG", currency || "NGN")}</span>
      </td>
      {!viewOnly && (
        <td className={styles.td}>
          <button className={styles.deleteButton} onClick={onDelete} title="Delete item">
            <Trash2 size={16} />
          </button>
        </td>
      )}
    </tr>
  );
}
