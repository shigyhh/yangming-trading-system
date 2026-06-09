import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool"

const workbookPath =
  process.env.WORKBOOK_PATH ||
  "/Users/jianlinhe/Desktop/yangming-trading-system/outputs/360-thoughts/阳明心学交易系统-36场景360念统一调整表.xlsx"

const input = await FileBlob.load(workbookPath)
const workbook = await SpreadsheetFile.importXlsx(input)

for (const range of ["360念统一表!A1:V6", "36场景索引!A1:L6", "场景级源内容!A1:F12"]) {
  const result = await workbook.inspect({
    kind: "table",
    range,
    include: "values,formulas",
    tableMaxRows: 20,
    tableMaxCols: 24,
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
