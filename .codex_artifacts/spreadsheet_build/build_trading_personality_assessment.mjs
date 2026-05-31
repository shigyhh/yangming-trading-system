import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const cwd = "/Users/jianlinhe/Desktop/知行老何-阳明心学交易生态";
const outputDir = path.join(cwd, "outputs/九种交易人格测评");
const outputPath = path.join(outputDir, "九种交易人格测评表_自动评分版.xlsx");

const questions = [
  ["冲动型", "CX1", "看到股票盘中快速拉升时，我很容易来不及分析就追进去。"],
  ["扛单型", "KD1", "明明股价已经跌破我原本设定的位置，我还是会告诉自己“再等等，会回来的”。"],
  ["焦虑型", "JL1", "买入后我会频繁刷新行情，哪怕只是很小的波动。"],
  ["平衡型", "PH1", "每次买入前，我基本知道自己的入场理由、止损位置和仓位上限。"],
  ["从众型", "CZ1", "看到群里、直播间或朋友都在买某只股票，我会忍不住跟着研究甚至下单。"],
  ["完美主义型", "WM1", "我常因为想等更低的买点或更完美的位置，错过原本看好的机会。"],
  ["赌徒型", "DT1", "我常想通过一两笔重仓交易，把之前的亏损快速赚回来。"],
  ["偏执型", "PZ1", "一旦我判断某个方向，很难听进相反观点。"],
  ["拖延型", "TY1", "我知道应该复盘，但经常拖到忘记交易细节。"],
  ["冲动型", "CX2", "某只股票突然被很多人讨论时，我会担心错过机会，哪怕它原本不在我的计划里。"],
  ["焦虑型", "JL2", "持仓期间，我的情绪容易被分时线牵着走。"],
  ["扛单型", "KD2", "亏损越大，我越不舍得止损。"],
  ["从众型", "CZ2", "别人说某只股票有机会时，我会比自己独立分析时更有信心。"],
  ["平衡型", "PH2", "单笔亏损出现时，我能按规则处理，不会因为一笔交易否定自己。"],
  ["完美主义型", "WM2", "买入后只要没有马上按我的预期走，我就会觉得自己入场不够完美。"],
  ["偏执型", "PZ2", "股票下跌时，我反而更想证明自己看得比别人远。"],
  ["赌徒型", "DT2", "连续亏损后，我更容易加仓或加大仓位。"],
  ["拖延型", "TY2", "我做过交易计划，但真正执行前总会临时犹豫或改变。"],
  ["冲动型", "CX3", "连续错过几只上涨股票后，我下一次下单会明显变急。"],
  ["扛单型", "KD3", "我常用“主力洗盘”“公司还不错”“长期肯定没事”来安慰自己继续拿着。"],
  ["焦虑型", "JL3", "我经常因为害怕亏损，过早卖掉原本计划持有的股票。"],
  ["完美主义型", "WM3", "我容易花很多时间比较方案，却迟迟不敢真正下决策。"],
  ["从众型", "CZ3", "市场恐慌时，别人一割肉，我也容易动摇。"],
  ["平衡型", "PH3", "我不会因为别人赚钱，就随便改变自己的交易计划。"],
  ["偏执型", "PZ3", "我容易只寻找支持自己判断的信息，忽略风险提示。"],
  ["赌徒型", "DT3", "我对“翻倍”“涨停”“妖股”这类机会特别兴奋。"],
  ["拖延型", "TY3", "我明知账户需要整理、仓位需要调整，却一拖再拖。"],
  ["冲动型", "CX4", "我经常买完之后，才开始找理由证明自己买得对。"],
  ["扛单型", "KD4", "我经常把短线做成中线，中线做成长线。"],
  ["焦虑型", "JL4", "股票一跌，我就想找人确认自己到底该不该卖。"],
  ["从众型", "CZ4", "我经常买入别人推荐的股票，但卖出时没人提醒我。"],
  ["完美主义型", "WM4", "卖出后如果股票继续上涨，我会反复懊恼，觉得自己没有卖在最高点。"],
  ["偏执型", "PZ4", "别人提醒我该止损或该降低仓位时，我第一反应常常是反驳。"],
  ["平衡型", "PH4", "我更关注一套方法长期是否有效，而不是一两笔输赢。"],
  ["赌徒型", "DT4", "我明知道风险很大，但还是会想“万一这次成了呢”。"],
  ["拖延型", "TY4", "我收藏了很多方法、课程和指标，却很少持续练完一个。"],
  ["冲动型", "CX5", "账户刚赚一笔后，我更容易加快交易频率，觉得自己“手感来了”。"],
  ["扛单型", "KD5", "我会提前写下止损位，但真正触发时又临时改口。"],
  ["焦虑型", "JL5", "持仓会影响我的睡眠、工作或家庭状态。"],
  ["从众型", "CZ5", "我更在意“大家怎么看”，而不是自己的交易规则。"],
  ["完美主义型", "WM5", "我希望每笔交易理由都非常充分，否则就不敢执行。"],
  ["偏执型", "PZ5", "我对“市场可能已经变了”这件事接受得比较慢。"],
  ["赌徒型", "DT5", "我有时会把交易当成刺激、翻身或证明自己的方式。"],
  ["拖延型", "TY5", "我经常告诉自己“有空再说”，结果错过处理问题的窗口。"],
  ["平衡型", "PH5", "我能在交易后复盘自己的行为，而不是只盯着盈亏结果。"],
];

const dimensions = [
  ["冲动型", "风险型", "一看拉升就上头，买完才想逻辑", "下单前延迟能力"],
  ["扛单型", "风险型", "止损很难，下跌时总相信会回来", "认错执行力"],
  ["完美主义型", "风险型", "总想买最低、卖最高，结果错过机会", "接受不完美的执行力"],
  ["偏执型", "风险型", "一旦认定方向，就听不进相反信息", "反证能力"],
  ["焦虑型", "风险型", "持仓后坐立不安，被波动牵着走", "持仓稳定力"],
  ["从众型", "风险型", "别人一说好就心动，别人一恐慌就割肉", "独立决策力"],
  ["赌徒型", "风险型", "喜欢重仓搏一把，总想一笔翻身", "仓位控制力"],
  ["拖延型", "风险型", "知道该做却总拖着，知和行断开", "即时行动力"],
  ["平衡型", "稳定型", "有规则、有节奏，能控制仓位和情绪", "系统迭代力"],
];

const workbook = Workbook.create();
const input = workbook.worksheets.add("填写测评");
const result = workbook.worksheets.add("自动结果");
const rules = workbook.worksheets.add("评分规则");

const palette = {
  green: "#1F4E3D",
  green2: "#2F7D5F",
  gold: "#D89C2B",
  softGreen: "#EAF4EF",
  softGold: "#FFF5DF",
  softRed: "#FCE8E6",
  gray: "#F6F7F8",
  border: "#D9E2DE",
  text: "#1F2933",
};

function styleTitle(sheet, rangeRef, title, subtitle) {
  const titleRange = sheet.getRange(rangeRef);
  titleRange.merge();
  titleRange.values = [[title]];
  titleRange.format = {
    fill: palette.green,
    font: { name: "Microsoft YaHei", size: 18, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
  };
  titleRange.format.rowHeightPx = 42;
  const sub = sheet.getRange("A2:F3");
  sub.merge();
  sub.values = [[subtitle]];
  sub.format = {
    fill: palette.softGreen,
    font: { name: "Microsoft YaHei", size: 10, color: palette.text },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "outside", style: "thin", color: palette.border },
  };
  sub.format.rowHeightPx = 54;
}

function setWidths(sheet, widths) {
  widths.forEach(([rangeRef, width]) => {
    sheet.getRange(rangeRef).format.columnWidthPx = width;
  });
}

function styleHeader(range) {
  range.format = {
    fill: palette.green2,
    font: { name: "Microsoft YaHei", size: 10, bold: true, color: "#FFFFFF" },
    horizontalAlignment: "center",
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: "#FFFFFF" },
  };
}

function styleBody(range) {
  range.format = {
    fill: "#FFFFFF",
    font: { name: "Microsoft YaHei", size: 10, color: palette.text },
    verticalAlignment: "center",
    wrapText: true,
    borders: { preset: "all", style: "thin", color: palette.border },
  };
}

// Sheet: 填写测评
input.showGridLines = false;
styleTitle(
  input,
  "A1:F1",
  "九种交易人格测评表（自动评分版）",
  "请根据最近 3-6 个月真实交易状态作答。每题在“评分”列选择 1-5 分：1=完全不像我，2=偶尔如此，3=有时如此，4=经常如此，5=几乎就是我。本测评只用于交易认知教育与行为训练分层，不构成投资建议。"
);
setWidths(input, [
  ["A1:A60", 54],
  ["B1:B60", 105],
  ["C1:C60", 64],
  ["D1:D60", 580],
  ["E1:E60", 90],
  ["F1:F60", 160],
]);
input.getRange("A5:F5").values = [["序号", "维度", "编号", "场景题", "评分(1-5)", "分值含义"]];
styleHeader(input.getRange("A5:F5"));
const inputRows = questions.map((q, idx) => [idx + 1, q[0], q[1], q[2], null, "1=不像 / 5=很像"]);
input.getRange(`A6:F${5 + questions.length}`).values = inputRows;
styleBody(input.getRange(`A6:F${5 + questions.length}`));
input.getRange(`A6:C${5 + questions.length}`).format.horizontalAlignment = "center";
input.getRange(`E6:E${5 + questions.length}`).format.horizontalAlignment = "center";
input.getRange(`A6:F${5 + questions.length}`).format.rowHeightPx = 36;
input.getRange(`E6:E${5 + questions.length}`).dataValidation = {
  rule: { type: "whole", operator: "between", formula1: 1, formula2: 5 },
};
input.getRange("H1:J1").merge();
input.getRange("H1:J1").values = [["评分说明"]];
input.getRange("H1:J1").format = {
  fill: palette.gold,
  font: { name: "Microsoft YaHei", size: 12, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
input.getRange("H2:J6").values = [
  ["1 分", "完全不像我", ""],
  ["2 分", "偶尔如此", ""],
  ["3 分", "有时如此", ""],
  ["4 分", "经常如此", ""],
  ["5 分", "几乎就是我", ""],
];
styleBody(input.getRange("H2:J6"));
input.getRange("H2:H6").format.horizontalAlignment = "center";
input.freezePanes.freezeRows(5);

// Sheet: 自动结果
result.showGridLines = false;
styleTitle(
  result,
  "A1:H1",
  "自动诊断结果",
  "填写完 45 道题后，本页会自动生成主人格、副人格、风险等级和九类人格分数。若显示“请先完成45题”，说明仍有题目未评分。"
);
setWidths(result, [
  ["A1:A80", 120],
  ["B1:B80", 110],
  ["C1:C80", 90],
  ["D1:D80", 96],
  ["E1:E80", 76],
  ["F1:F80", 300],
  ["G1:G80", 175],
  ["H1:H80", 210],
]);

result.getRange("A5:H8").format = {
  fill: palette.gray,
  borders: { preset: "all", style: "thin", color: palette.border },
  font: { name: "Microsoft YaHei", size: 10, color: palette.text },
  verticalAlignment: "center",
};
result.getRange("A5:A8").values = [["主人格"], ["副人格"], ["当前交易风险"], ["已完成题数"]];
result.getRange("A5:A8").format = {
  fill: palette.green,
  font: { name: "Microsoft YaHei", size: 11, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: "#FFFFFF" },
};
result.getRange("B5:C5").merge();
result.getRange("B6:C6").merge();
result.getRange("B7:C7").merge();
result.getRange("B8:C8").merge();
result.getRange("B5:B8").formulas = [
  ['=IF($B$8<45,"请先完成45题",IF(AND($C$21>=21,MAX($C$13:$C$20)<=15),"平衡型",INDEX($A$13:$A$20,MATCH(1,$E$13:$E$20,0))))'],
  ['=IF($B$8<45,"",IF($B$5="平衡型","副人格不明显",IF(LARGE($C$13:$C$20,2)<=12,"副人格不明显",INDEX($A$13:$A$20,MATCH(2,$E$13:$E$20,0)))))'],
  ['=IF($B$8<45,"",IF(OR($C$5>=22,COUNTIF($C$13:$C$20,">=20")>=2,$C$21<=10),"高风险",IF(OR(AND($C$5>=18,$C$5<=21),AND($C$21>=11,$C$21<=14)),"中高风险",IF(AND($C$5>=14,$C$5<=17,$C$21>=15,$C$21<=18),"中等风险",IF(AND(MAX($C$13:$C$20)<=13,$C$21>=18),"相对稳定","中等风险")))))'],
  ["=COUNT('填写测评'!$E$6:$E$50)"],
];
result.getRange("D5:D8").values = [["主人格分数"], ["平衡型分数"], ["风险型最高分"], ["未完成题数"]];
result.getRange("E5:E8").formulas = [
  ['=IF($B$8<45,"",IF($B$5="平衡型",$C$21,INDEX($C$13:$C$20,MATCH($B$5,$A$13:$A$20,0))))'],
  ["=IF($C$21=\"\",\"\",$C$21)"],
  ["=IF($B$8<45,\"\",MAX($C$13:$C$20))"],
  ["=45-$B$8"],
];
result.getRange("F5:H8").values = [
  ["报告使用说明", "完成 45 题后，可把下方“AI诊断输入”复制给 AI，生成完整诊断报告。", ""],
  ["判定逻辑", "前 8 个风险型人格最高分为主人格，第二高分为副人格；平衡型高且风险低时判定为平衡型。", ""],
  ["合规边界", "本测评用于交易认知教育、行为觉察和训练分层，不荐股、不预测、不承诺收益。", ""],
  ["建议动作", "先看主人格，再看副人格；训练营分层优先按主人格处理。", ""],
];
result.getRange("B5:E8").format = {
  fill: "#FFFFFF",
  font: { name: "Microsoft YaHei", size: 11, bold: true, color: palette.text },
  horizontalAlignment: "center",
  verticalAlignment: "center",
  borders: { preset: "all", style: "thin", color: palette.border },
};

result.getRange("A12:H12").values = [["人格", "属性", "分数", "强度", "风险排名", "股民版解释", "最该训练能力", "备注"]];
styleHeader(result.getRange("A12:H12"));
result.getRange("A13:H21").values = dimensions.map((d) => [d[0], d[1], null, null, null, d[2], d[3], ""]);
styleBody(result.getRange("A13:H21"));
result.getRange("C13:C21").formulas = dimensions.map((d) => [
  `=IF(COUNTIFS('填写测评'!$B$6:$B$50,A${13 + dimensions.indexOf(d)},'填写测评'!$E$6:$E$50,">=1")<5,"",SUMIF('填写测评'!$B$6:$B$50,A${13 + dimensions.indexOf(d)},'填写测评'!$E$6:$E$50))`,
]);
result.getRange("D13:D21").formulas = Array.from({ length: 9 }, (_, i) => {
  const r = 13 + i;
  return [`=IF(C${r}="","",IFS(C${r}<=10,"特征较弱",C${r}<=16,"偶尔出现",C${r}<=21,"特征明显",TRUE,"高度典型"))`];
});
result.getRange("E13:E20").formulas = Array.from({ length: 8 }, (_, i) => {
  const r = 13 + i;
  return [`=IF(C${r}="","",RANK.EQ(C${r},$C$13:$C$20,0)+COUNTIF($C$13:C${r},C${r})-1)`];
});
result.getRange("E21").values = [[""]];
result.getRange("H13:H21").formulas = Array.from({ length: 9 }, (_, i) => {
  const r = 13 + i;
  return [`=IF(C${r}="","待完成",IF(C${r}>=22,"高度典型",IF(C${r}>=17,"重点关注",IF(C${r}>=11,"偶尔出现","较弱"))))`];
});
result.getRange("C13:E21").format.horizontalAlignment = "center";
result.getRange("A13:B21").format.horizontalAlignment = "center";
result.getRange("A21:H21").format.fill = palette.softGreen;

result.getRange("A24:H24").merge();
result.getRange("A24:H24").values = [["AI诊断输入（复制下面内容给 AI，可生成完整诊断报告）"]];
result.getRange("A24:H24").format = {
  fill: palette.gold,
  font: { name: "Microsoft YaHei", size: 12, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
result.getRange("A25:H33").merge();
result.getRange("A25:H33").formulas = [[
  '=IF($B$8<45,"请先完成45题。","你是一名阳明心学交易人格诊断官。请根据以下分数生成诊断报告，结构包含：主人格、副人格、当前交易风险、最容易亏钱的场景、最该训练的一项能力、阳明心学提醒、7天行动建议。请注意：不荐股、不预测行情、不承诺收益。"&CHAR(10)&CHAR(10)&"冲动型："&C13&" 分"&CHAR(10)&"扛单型："&C14&" 分"&CHAR(10)&"完美主义型："&C15&" 分"&CHAR(10)&"偏执型："&C16&" 分"&CHAR(10)&"焦虑型："&C17&" 分"&CHAR(10)&"从众型："&C18&" 分"&CHAR(10)&"赌徒型："&C19&" 分"&CHAR(10)&"拖延型："&C20&" 分"&CHAR(10)&"平衡型："&C21&" 分"&CHAR(10)&CHAR(10)&"系统初判：主人格="&B5&"，副人格="&B6&"，当前交易风险="&B7&"。")',
]];
result.getRange("A25:H33").format = {
  fill: palette.softGold,
  font: { name: "Microsoft YaHei", size: 10, color: palette.text },
  wrapText: true,
  verticalAlignment: "top",
  borders: { preset: "outside", style: "thin", color: palette.gold },
};
result.getRange("A25:H33").format.rowHeightPx = 24;

try {
  result.getRange("C13:C21").conditionalFormats.add("dataBar", {
    color: palette.green2,
  });
  result.getRange("B7:C7").conditionalFormats.add("containsText", {
    text: "高风险",
    format: { fill: { color: palette.softRed }, font: { bold: true, color: "#B42318" } },
  });
} catch {
  // Conditional formatting is optional; formulas remain the source of truth.
}
result.freezePanes.freezeRows(12);

// Sheet: 评分规则
rules.showGridLines = false;
styleTitle(
  rules,
  "A1:F1",
  "评分规则与报告口径",
  "本页用于团队核对评分逻辑、报告口径和上线说明。正式对外发布时，可隐藏本页，只保留“填写测评”和“自动结果”。"
);
setWidths(rules, [
  ["A1:A80", 125],
  ["B1:B80", 180],
  ["C1:C80", 180],
  ["D1:D80", 260],
  ["E1:E80", 260],
  ["F1:F80", 180],
]);
rules.getRange("A5:F5").values = [["模块", "规则", "条件", "输出", "说明", "合规提醒"]];
styleHeader(rules.getRange("A5:F5"));
rules.getRange("A6:F16").values = [
  ["填写规则", "每题 1-5 分", "45 道题全部完成", "自动生成结果", "建议按最近 3-6 个月真实交易状态填写", "不作为投资建议"],
  ["单项分数", "每类 5 题相加", "最低 5 分，最高 25 分", "九类人格得分", "分数越高，该行为模式越明显", "仅作行为觉察"],
  ["强度解释", "5-10", "特征较弱", "较少出现", "不代表完全没有", "避免绝对化"],
  ["强度解释", "11-16", "偶尔出现", "压力下可能出现", "适合作为提醒项", "避免羞辱用户"],
  ["强度解释", "17-21", "特征明显", "需要重点关注", "适合进入训练任务", "不承诺训练收益"],
  ["强度解释", "22-25", "高度典型", "优先修正", "可能影响账户稳定性", "强调风控教育"],
  ["主人格", "风险型最高分", "前 8 类风险型人格", "主人格", "代表最明显交易模式", "不贴负面标签"],
  ["平衡型例外", "平衡型 >=21 且风险型全部 <=15", "满足条件", "主人格=平衡型", "说明规则、仓位、复盘较稳定", "仍需持续复盘"],
  ["副人格", "风险型第二高分", "第二高分 >12", "副人格", "代表压力下容易暴露的问题", "不作人格定性"],
  ["高风险", "主人格>=22 或两个风险型>=20 或平衡型<=10", "满足其一", "高风险", "重点提示仓位、止损、情绪失控", "不预测盈亏"],
  ["相对稳定", "所有风险型<=13 且平衡型>=18", "同时满足", "相对稳定", "说明行为系统已有基础", "不承诺稳定盈利"],
];
styleBody(rules.getRange("A6:F16"));
rules.getRange("A18:F18").merge();
rules.getRange("A18:F18").values = [["报告语气原则"]];
rules.getRange("A18:F18").format = {
  fill: palette.green2,
  font: { name: "Microsoft YaHei", size: 12, bold: true, color: "#FFFFFF" },
  horizontalAlignment: "center",
};
rules.getRange("A19:F23").values = [
  ["原则 1", "不说“你这个人有问题”", "改说：你在某种市场情境下容易出现某种反应", "", "", ""],
  ["原则 2", "不说“你不适合交易”", "改说：你需要先修正这个重复亏损动作", "", "", ""],
  ["原则 3", "不荐股、不喊单、不预测", "只强调认知、纪律、风控、复盘和行为训练", "", "", ""],
  ["原则 4", "让用户觉得被看见", "不要让用户觉得被批判", "", "", ""],
  ["原则 5", "阳明心学落点", "知行合一、致良知、克己、知止、有定", "", "", ""],
];
styleBody(rules.getRange("A19:F23"));

// Compact verification before export.
const summary = await workbook.inspect({
  kind: "table",
  range: "自动结果!A5:H21",
  include: "values,formulas",
  tableMaxRows: 25,
  tableMaxCols: 8,
});
console.log(summary.ndjson);

const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A",
  options: { useRegex: true, maxResults: 300 },
  summary: "final formula error scan",
});
console.log(errors.ndjson);

await fs.mkdir(outputDir, { recursive: true });
for (const sheetName of ["填写测评", "自动结果", "评分规则"]) {
  const preview = await workbook.render({ sheetName, autoCrop: "all", scale: 1, format: "png" });
  const previewBytes = new Uint8Array(await preview.arrayBuffer());
  await fs.writeFile(path.join(outputDir, `${sheetName}_preview.png`), previewBytes);
}

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
console.log(outputPath);
