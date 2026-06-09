import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool"

const workbookPath =
  process.env.WORKBOOK_PATH ||
  "/Users/jianlinhe/Desktop/yangming-trading-system/outputs/360-thoughts/阳明心学交易系统-36场景360念照回升级版.xlsx"

const input = await FileBlob.load(workbookPath)
const workbook = await SpreadsheetFile.importXlsx(input)

for (const range of ["360念统一表!A1:Z8", "360念统一表!A356:Z361", "36场景索引!A1:L6"]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 28,
  })
  console.log(`--- ${range} ---`)
  console.log(result.ndjson)
}

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan",
})
console.log("--- formula errors ---")
console.log(errors.ndjson)

for (const renderTarget of [
  { sheetName: "360念统一表", range: "A1:Z15" },
  { sheetName: "36场景索引", range: "A1:L15" },
  { sheetName: "场景级源内容", range: "A1:F15" },
]) {
  await workbook.render({ ...renderTarget, scale: 1 })
}
console.log("--- render ---")
console.log("ok")
