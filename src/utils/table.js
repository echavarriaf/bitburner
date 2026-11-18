/**
 * Imprime una tabla con formato en la terminal
 *
 * Cada columna debe definir:
 * -key: nombre de la propiedad en cada fila
 * -label: cabecera
 * -align: izquierda o derecha
 *
 * @param {NS} ns
 * @param {{key:string, label:string,align?:"left"|"rigth"}[]} columns
 * @param {Object[]} rows
 */

export const printTable = (ns, columns, rows) => {
  if (columns.length === 0) {
    return;
  }

  const normalizedRows = rows.map((row) => {
    const normalized = {};

    for (const column of columns) {
      normalized[column.key] = String(row[column.key] ?? "");
    }

    return normalized;
  });

  const widths = {};

  for (const column of columns) {
    widths[column.key] = Math.max(
      column.label.length,
      ...normalizedRows.map((row) => row[column.key].length),
    );
  }

  const separator =
    "+" +
    columns.map((column) => "-".repeat(widths[column.key] + 2)).join("+") +
    "+";

  const header =
    "|" +
    columns
      .map((column) => {
        const width = widths[column.key];

        return ` ${column.label.padEnd(width)} `;
      })
      .join("|") +
    "|";

  ns.tprintf("%s", separator);
  ns.tprintf("%s", header);
  ns.tprintf("%s", separator);

  for (const row of normalizedRows) {
    const line =
      "|" +
      columns
        .map((column) => {
          const value = row[column.key];
          const width = widths[column.key];

          const formatted =
            column.align === "rigth"
              ? value.padStart(width)
              : value.padEnd(width);

          return ` ${formatted} `;
        })
        .join("|") +
      "|";

    ns.tprintf("%s", line);
  }
  ns.tprintf("%s", separator);
};

/**
 * Convierte una tabla en lineas de texto formateadas
 *
 * Cada columna debe definir:
 * -key: nombre de la propiedad en cada fila
 * -label: cabecera
 * -align: izquierda o derecha
 *
 * @param {NS} ns
 * @param {{key:string, label:string, align?:"left"|"rigth"}[]} columns
 * @param {Object[]} rows
 * @returns {string[]}
 */

export function formatTable(columns, rows) {
  if (columns.length === 0) {
    return [];
  }

  const normalizedRows = rows.map((row) => {
    const normalized = {};

    for (const column of columns) {
      normalized[column.key] = String(row[column.key] ?? "");
    }

    return normalized;
  });

  const widths = {};

  for (const column of columns) {
    widths[column.key] = Math.max(
      column.label.length,
      ...normalizedRows.map((row) => row[column.key].length),
    );
  }

  const separator =
    "+" +
    columns.map((column) => "-".repeat(widths[column.key] + 2)).join("+") +
    "+";

  const header =
    "|" +
    columns
      .map((column) => {
        const width = widths[column.key];

        return ` ${column.label.padEnd(width)} `;
      })
      .join("|") +
    "|";

  const lines = [separator, header, separator];

  for (const row of normalizedRows) {
    const line =
      "|" +
      columns
        .map((column) => {
          const value = row[column.key];
          const width = widths[column.key];

          const formatted =
            column.align === "rigth"
              ? value.padStart(width)
              : value.padEnd(width);

          return ` ${formatted} `;
        })
        .join("|") +
      "|";

      lines.push(line);
  }
  lines.push(separator);

  return lines;
}

/**
 * Imprime una tabla dentro del log/Tail
 * 
 * @param {NS} ns
 * @param {{
 * key: string,
 * label:string,
 * align?:"left"|"right"
 * }[]} columns
 * @param {Object[]} rows
 */
export const logTable=(ns, columns, rows)=>{
    const lines=formatTable(columns, rows);

    for (const line of lines){
        ns.print(line);
    }
}