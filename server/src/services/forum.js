import crypto from "node:crypto";
import { appendRuntimeRecord, readRuntimeRecords, updateRuntimeRecords } from "../lib/store.js";

const POST_FILE = "forum-posts.json";
const COMMENT_FILE = "forum-comments.json";

export const forumCategories = [
  { id: "mind", name: "心学入门", description: "把心学讲成人能用得上的交易日课。" },
  { id: "trading_mind", name: "交易认知", description: "讨论贪、惧、急、悔在盘面上的显影。" },
  { id: "stock_basics", name: "股票基础", description: "面向新手的股票、K线、仓位与风险常识。" },
  { id: "kline_review", name: "K线复盘", description: "只复盘动作与纪律，不做个股推荐。" },
  { id: "risk", name: "风险教育", description: "先学活下来，再谈稳定提升。" },
  { id: "qa", name: "同修问答", description: "新手问题、训练疑问和助教承接入口。" }
];

const categoryMap = new Map(forumCategories.map((item) => [item.id, item]));

const seedPosts = [
  {
    id: "seed-mind-001",
    category: "mind",
    title: "王阳明心学里，交易者先练哪一念？",
    summary: "先看见贪、惧、急、悔，再谈交易系统。",
    content: [
      "很多交易者一上来就找买点，其实更应该先找自己的起心动念。",
      "心学里讲知行合一，放到交易里，就是知道风险以后，仓位、止损和复盘也要跟上。每次下单前停一下：我现在是在按计划行动，还是在被恐惧、侥幸、急躁推着走？",
      "这不是让人不交易，而是让交易从冲动变成有记录、可复盘、可训练的动作。"
    ].join("\n\n"),
    tags: ["知行合一", "交易心性", "入门"],
    author_name: "知行学堂",
    view_count: 168,
    comment_count: 0,
    like_count: 12,
    pinned: true,
    source_channel: "seed",
    created_at: "2026-05-28T08:00:00.000Z",
    updated_at: "2026-05-28T08:00:00.000Z"
  },
  {
    id: "seed-stock-001",
    category: "stock_basics",
    title: "股票基础：K线不是预测工具，而是复盘语言",
    summary: "一根K线只记录开高低收，真正有价值的是你当时怎么判断、怎么执行。",
    content: [
      "K线由开盘价、最高价、最低价、收盘价组成。它能记录价格运动，但不能保证下一步怎么走。",
      "新手看K线，先不要急着找神奇形态。更重要的是记录三件事：当时趋势是否清楚、自己的仓位是否合理、错了以后有没有退出条件。",
      "知行K线训练台的目标，也是把每一次买、卖、观望变成可复盘的动作。"
    ].join("\n\n"),
    tags: ["K线基础", "新手教程", "复盘"],
    author_name: "知行学堂",
    view_count: 126,
    comment_count: 0,
    like_count: 9,
    pinned: true,
    source_channel: "seed",
    created_at: "2026-05-28T08:05:00.000Z",
    updated_at: "2026-05-28T08:05:00.000Z"
  },
  {
    id: "seed-risk-001",
    category: "risk",
    title: "为什么不先教买点？先教仓位和止损",
    summary: "买点只解决入场，仓位和止损决定一次错误会不会扩大。",
    content: [
      "交易教育最容易吸引人的，是买点、形态和涨停故事。但真正决定普通用户能不能长期训练下去的，往往是仓位和止损。",
      "如果一次错误会伤到本金和心态，后面的技术动作都会变形。先把单笔风险降下来，人才有余地复盘和修正。",
      "所以高风险人格不代表不能学习，而是训练顺序要换：先降仓位、守纪律，再慢慢谈进攻。"
    ].join("\n\n"),
    tags: ["风险教育", "仓位", "止损"],
    author_name: "知行学堂",
    view_count: 102,
    comment_count: 0,
    like_count: 7,
    pinned: false,
    source_channel: "seed",
    created_at: "2026-05-28T08:10:00.000Z",
    updated_at: "2026-05-28T08:10:00.000Z"
  },
  {
    id: "seed-kline-001",
    category: "kline_review",
    title: "一局K线训练后，应该复盘哪三件事？",
    summary: "看结果之前，先看计划、情绪和动作。",
    content: [
      "一局训练结束后，不要只问赚没赚。先问三个问题：我有没有提前设定条件？我中途有没有因为涨跌改变计划？我错了以后有没有缩小损失？",
      "如果这三件事能说清楚，哪怕这局没拿高分，也是在进步。训练的意义不是证明自己每次都对，而是让错误越来越小、动作越来越稳。"
    ].join("\n\n"),
    tags: ["K线训练", "复盘方法", "训练反馈"],
    author_name: "知行学堂",
    view_count: 89,
    comment_count: 0,
    like_count: 6,
    pinned: false,
    source_channel: "seed",
    created_at: "2026-05-28T08:15:00.000Z",
    updated_at: "2026-05-28T08:15:00.000Z"
  },
  {
    id: "seed-qa-001",
    category: "qa",
    title: "新同修提问：测评结果高风险是不是不能交易？",
    summary: "不是贴标签，而是给训练顺序。",
    content: [
      "高风险不等于不能学，也不等于这个人一定亏损。它只是说明当前更容易被某些惯性牵着走，比如冲动、扛单、焦虑或拖延。",
      "测评结果的价值，是帮你知道先练什么。高风险用户更适合先做低仓位、少频次、强复盘的训练，再由助教判断是否进入训练营陪跑。"
    ].join("\n\n"),
    tags: ["测评结果", "高风险", "助教承接"],
    author_name: "知行学堂",
    view_count: 76,
    comment_count: 0,
    like_count: 5,
    pinned: false,
    source_channel: "seed",
    created_at: "2026-05-28T08:20:00.000Z",
    updated_at: "2026-05-28T08:20:00.000Z"
  }
];

export async function listForumPosts({ category = "", q = "", limit = 30 } = {}) {
  const posts = await getAllPosts();
  const comments = await readRuntimeRecords(COMMENT_FILE);
  const commentCounts = comments.reduce((counts, comment) => {
    if (!comment.deleted_at) counts[comment.post_id] = Number(counts[comment.post_id] || 0) + 1;
    return counts;
  }, {});
  const normalizedCategory = normalizeCategory(category, true);
  const keyword = String(q || "").trim().toLowerCase();
  const max = Math.min(Math.max(Number(limit) || 30, 1), 100);

  return posts
    .map((post) => ({
      ...post,
      comment_count: Math.max(Number(post.comment_count || 0), Number(commentCounts[post.id] || 0))
    }))
    .filter((post) => {
      if (normalizedCategory && post.category !== normalizedCategory) return false;
      if (!keyword) return true;
      const haystack = [
        post.title,
        post.summary,
        post.content,
        ...(Array.isArray(post.tags) ? post.tags : [])
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    })
    .sort(sortForumPosts)
    .slice(0, max)
    .map(toPublicPost);
}

export async function getForumPost(postId) {
  const id = String(postId || "").trim();
  const posts = await getAllPosts();
  const post = posts.find((item) => item.id === id);
  if (!post) return null;

  if (!post.id.startsWith("seed-")) {
    await updateRuntimeRecords(POST_FILE, (records) => records.map((item) => (
      item.id === id
        ? { ...item, view_count: Number(item.view_count || 0) + 1, updated_at: item.updated_at || item.created_at }
        : item
    )));
    post.view_count = Number(post.view_count || 0) + 1;
  }

  const comments = await readRuntimeRecords(COMMENT_FILE);
  return {
    post: toPublicPost(post, { includeContent: true }),
    comments: comments
      .filter((item) => item.post_id === id && !item.deleted_at)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(toPublicComment)
  };
}

export async function createForumPost({
  userId,
  nickname = "知行同修",
  category = "qa",
  title = "",
  content = "",
  tags = [],
  sourceChannel = ""
}) {
  const cleanTitle = sanitizeText(title).slice(0, 80);
  const cleanContent = sanitizeContent(content).slice(0, 5000);
  if (cleanTitle.length < 4) {
    const error = new Error("标题至少需要 4 个字");
    error.statusCode = 400;
    throw error;
  }
  if (cleanContent.length < 10) {
    const error = new Error("内容至少需要 10 个字");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const post = {
    id: crypto.randomUUID(),
    category: normalizeCategory(category),
    title: cleanTitle,
    summary: buildSummary(cleanContent),
    content: cleanContent,
    tags: normalizeTags(tags),
    author_id: String(userId || ""),
    author_name: sanitizeText(nickname || "知行同修").slice(0, 40),
    view_count: 0,
    comment_count: 0,
    like_count: 0,
    pinned: false,
    source_channel: sanitizeText(sourceChannel || "").slice(0, 80),
    created_at: now,
    updated_at: now
  };

  await appendRuntimeRecord(POST_FILE, post);
  return toPublicPost(post, { includeContent: true });
}

export async function createForumComment({ postId, userId, nickname = "知行同修", content = "" }) {
  const id = String(postId || "").trim();
  const cleanContent = sanitizeContent(content).slice(0, 1200);
  if (cleanContent.length < 2) {
    const error = new Error("评论内容太短");
    error.statusCode = 400;
    throw error;
  }

  const posts = await getAllPosts();
  const post = posts.find((item) => item.id === id);
  if (!post) {
    const error = new Error("帖子不存在");
    error.statusCode = 404;
    throw error;
  }

  const now = new Date().toISOString();
  const comment = {
    id: crypto.randomUUID(),
    post_id: id,
    author_id: String(userId || ""),
    author_name: sanitizeText(nickname || "知行同修").slice(0, 40),
    content: cleanContent,
    created_at: now,
    updated_at: now
  };

  await appendRuntimeRecord(COMMENT_FILE, comment);
  if (!id.startsWith("seed-")) {
    await updateRuntimeRecords(POST_FILE, (records) => records.map((item) => (
      item.id === id
        ? { ...item, comment_count: Number(item.comment_count || 0) + 1, updated_at: now }
        : item
    )));
  }

  return toPublicComment(comment);
}

async function getAllPosts() {
  const runtimePosts = await readRuntimeRecords(POST_FILE);
  const runtimeIds = new Set(runtimePosts.map((item) => item.id));
  return seedPosts
    .filter((item) => !runtimeIds.has(item.id))
    .concat(runtimePosts)
    .map((post) => ({
      ...post,
      category: normalizeCategory(post.category, true) || "qa",
      tags: normalizeTags(post.tags)
    }));
}

function normalizeCategory(category, allowEmpty = false) {
  const value = String(category || "").trim();
  if (allowEmpty && (!value || value === "all")) return "";
  if (categoryMap.has(value)) return value;
  return allowEmpty ? "" : "qa";
}

function normalizeTags(tags) {
  const source = Array.isArray(tags) ? tags : String(tags || "").split(/[，,\s]+/);
  return source.map((tag) => sanitizeText(tag).slice(0, 14)).filter(Boolean).slice(0, 5);
}

function sanitizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sanitizeContent(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildSummary(content) {
  return sanitizeText(content).slice(0, 90);
}

function sortForumPosts(a, b) {
  if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

function toPublicPost(post, { includeContent = false } = {}) {
  return {
    id: post.id,
    category: post.category,
    category_name: categoryMap.get(post.category)?.name || "同修问答",
    title: post.title,
    summary: post.summary || buildSummary(post.content || ""),
    ...(includeContent ? { content: post.content || "" } : {}),
    tags: normalizeTags(post.tags),
    author_name: post.author_name || "知行同修",
    view_count: Number(post.view_count || 0),
    comment_count: Number(post.comment_count || 0),
    like_count: Number(post.like_count || 0),
    pinned: Boolean(post.pinned),
    created_at: post.created_at,
    updated_at: post.updated_at
  };
}

function toPublicComment(comment) {
  return {
    id: comment.id,
    post_id: comment.post_id,
    author_name: comment.author_name || "知行同修",
    content: comment.content || "",
    created_at: comment.created_at
  };
}
