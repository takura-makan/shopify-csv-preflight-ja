(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ShopifyCsvChecker = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function parseCsv(text) {
    const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    let afterQuote = false;
    for (let i = 0; i < source.length; i += 1) {
      const ch = source[i];
      if (quoted) {
        if (ch === '"' && source[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          quoted = false;
          afterQuote = true;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        if (cell || afterQuote) throw new Error(`引用符の位置が不正です（文字 ${i + 1}）`);
        quoted = true;
      } else if (ch === "," || ch === "\n" || ch === "\r") {
        row.push(cell);
        cell = "";
        afterQuote = false;
        if (ch !== ",") {
          rows.push(row);
          row = [];
          if (ch === "\r" && source[i + 1] === "\n") i += 1;
        }
      } else {
        if (afterQuote) throw new Error(`閉じた引用符の後に文字があります（文字 ${i + 1}）`);
        cell += ch;
      }
    }
    if (quoted) throw new Error("閉じていない引用符があります");
    if (cell || row.length || afterQuote) {
      row.push(cell);
      rows.push(row);
    }
    if (!rows.length) throw new Error("CSVが空です");
    return rows;
  }

  function check(text, mode = "new") {
    if (!new Set(["new", "update"]).has(mode)) throw new Error("確認モードが不正です");
    const rows = parseCsv(text);
    const headers = rows[0].map((x) => x.trim());
    const issues = [];
    const add = (severity, record, message) => issues.push({ severity, record, message });
    const col = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
    const titleCol = col("Title");
    const handleCol = col("URL handle", "Handle");
    const priceCol = col("Price", "Variant Price");
    const statusCol = col("Status");
    const optionNameCol = col("Option1 name", "Option1 Name");
    const optionValueCol = col("Option1 value", "Option1 Value");
    const skuCol = col("SKU", "Variant SKU");
    const imageCol = col("Product image URL", "Image Src");
    if (titleCol < 0) add("error", 1, "Title列がありません");
    if (mode === "update" && handleCol < 0) add("error", 1, "更新にはURL handle（旧形式はHandle）列が必要です");
    if (headers.some((header) => !header)) add("warning", 1, "空の列名があります");
    const repeated = headers.filter((name, index) => name && headers.indexOf(name) !== index);
    if (repeated.length) add("warning", 1, `同名の列があります: ${[...new Set(repeated)].join("、")}`);

    const products = new Map();
    let dataRows = 0;
    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.every((value) => value.trim() === "")) continue;
      dataRows += 1;
      const rec = i + 1;
      if (row.length !== headers.length) {
        add("error", rec, `列数が${row.length}、見出しは${headers.length}です`);
        continue;
      }
      const value = (index) => index < 0 ? "" : row[index].trim();
      const title = value(titleCol);
      const handle = value(handleCol);
      const sku = value(skuCol);
      const optionValue = value(optionValueCol);
      if (mode === "update" && !handle) add("error", rec, "更新対象のURL handleが空です");
      if (handle && /\s/.test(handle)) add("error", rec, "URL handleに空白があります");
      if (handle) {
        if (!products.has(handle)) products.set(handle, { title: false, records: [] });
        const product = products.get(handle);
        product.title ||= Boolean(title);
        product.records.push(rec);
      } else if (mode === "new" && !title) {
        add("error", rec, "商品名もURL handleも空です");
      }
      if (priceCol >= 0 && value(priceCol) && (!/^\d+(?:\.\d+)?$/.test(value(priceCol)))) {
        add("warning", rec, "価格が0以上の数値形式ではありません。Shopifyで確認してください");
      }
      if (statusCol >= 0 && value(statusCol) && !["active", "draft", "archived"].includes(value(statusCol).toLowerCase())) {
        add("warning", rec, "Statusがactive / draft / archived以外です");
      }
      if ((sku || optionValue) && (optionNameCol < 0 || optionValueCol < 0)) {
        add("warning", rec, "バリエーション関連の値があります。Option1 name / Option1 value列も確認してください");
      }
      if (!title && !handle && imageCol >= 0 && value(imageCol)) {
        add("warning", rec, "画像URLがありますが、対応する商品を特定できません");
      }
    }
    for (const [handle, product] of products) {
      if (!product.title) add("warning", product.records[0], `handle「${handle}」にTitleがありません。既存商品の更新か確認してください`);
    }
    if (!dataRows) add("warning", 1, "商品行がありません");
    return { dataRows, columns: headers.length, issues };
  }

  return { parseCsv, check };
});
