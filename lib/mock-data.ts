export type NoteVisibility = "private" | "public" | "unlisted";
export type ProfileVisibility = "private" | "public";
export type BookVisibility = "private" | "public";
export type ReadingStatus =
  | "want_to_read"
  | "reading"
  | "finished"
  | "paused"
  | "abandoned";
export type NoteSourceType =
  | "manual"
  | "pdf"
  | "txt"
  | "markdown"
  | "weread"
  | "browser_extension";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  visibility: ProfileVisibility;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  owner_id: string;
  title: string;
  author: string;
  book_identifier: string | null;
  cover_url: string | null;
  description: string;
  visibility: BookVisibility;
  created_at: string;
  updated_at: string;
}

export interface ReadingRecord {
  id: string;
  owner_id: string;
  book_id: string;
  status: ReadingStatus;
  rating?: number;
  progress_percent: number;
  started_at: string | null;
  finished_at: string | null;
  visibility: "private";
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  owner_id: string;
  book_id: string | null;
  title: string;
  content: string;
  summary?: string;
  visibility: NoteVisibility;
  unlisted_token: string | null;
  source_type: NoteSourceType;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NoteQuote {
  id: string;
  note_id: string;
  owner_id: string;
  quote_text: string;
  chapter: string | null;
  page: number | null;
  position: string | null;
  created_at: string;
}

export interface Tag {
  id: string;
  owner_id: string;
  name: string;
  normalized_name: string;
  created_at: string;
}

export type NoteWithRelations = Note & {
  author: Profile;
  tags: Tag[];
  book: Book | null;
  quotes: NoteQuote[];
};

export type BookWithReading = Book & {
  reading_record: ReadingRecord | null;
};

export const currentDemoUserId = "11111111-1111-4111-8111-111111111111";

export const profiles: Profile[] = [
  {
    id: currentDemoUserId,
    username: "linmo",
    display_name: "林默",
    avatar_url: null,
    bio: "在通勤和睡前读一点书，偏爱小说、散文与普通人的生活史。相信摘录不是收藏，而是把一句话重新放回自己的经验里。",
    visibility: "public",
    created_at: "2025-11-03T09:20:00+08:00",
    updated_at: "2026-10-26T21:15:00+08:00",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    username: "qinghe",
    display_name: "许青禾",
    avatar_url: null,
    bio: "历史与社会观察读者。喜欢沿着一个注释继续找下一本书，也喜欢把复杂问题写成能读懂的短笔记。",
    visibility: "public",
    created_at: "2025-12-12T14:10:00+08:00",
    updated_at: "2026-10-25T18:40:00+08:00",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    username: "zhouyu",
    display_name: "周屿",
    avatar_url: null,
    bio: "设计从业者，读小说也读设计。记录阅读里的空间、物体和人的情绪，偶尔整理一些摘录。",
    visibility: "public",
    created_at: "2026-01-08T10:30:00+08:00",
    updated_at: "2026-10-24T22:05:00+08:00",
  },
];

const profileById = new Map(profiles.map((profile) => [profile.id, profile]));

export const books: Book[] = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    title: "活着",
    author: "余华",
    book_identifier: null,
    cover_url: null,
    description:
      "福贵的一生穿过战争、饥荒与离散。小说没有把苦难写成传奇，而是让它落回吃饭、劳作和一次次告别的日常。",
    visibility: "public",
    created_at: "2026-08-18T20:12:00+08:00",
    updated_at: "2026-10-20T22:10:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    owner_id: currentDemoUserId,
    title: "我与地坛",
    author: "史铁生",
    book_identifier: null,
    cover_url: null,
    description:
      "一座园子承接了一个人最艰难的岁月。散文在缓慢的行走中讨论命运、母亲、写作与活下去的理由。",
    visibility: "public",
    created_at: "2026-07-03T09:30:00+08:00",
    updated_at: "2026-10-18T20:45:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    owner_id: currentDemoUserId,
    title: "额尔古纳河右岸",
    author: "迟子建",
    book_identifier: null,
    cover_url: null,
    description:
      "一位鄂温克族老人讲述族群的迁徙、狩猎、婚姻与消逝。风、火、驯鹿和森林共同构成了小说的呼吸。",
    visibility: "private",
    created_at: "2026-09-11T19:00:00+08:00",
    updated_at: "2026-10-16T21:30:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000004",
    owner_id: "22222222-2222-4222-8222-222222222222",
    title: "置身事内",
    author: "兰小欢",
    book_identifier: null,
    cover_url: null,
    description:
      "从地方政府的财政、土地和产业说起，解释中国经济运行中许多看似分散的现象如何在制度激励下连接起来。",
    visibility: "public",
    created_at: "2026-06-15T13:20:00+08:00",
    updated_at: "2026-10-22T19:10:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000005",
    owner_id: "22222222-2222-4222-8222-222222222222",
    title: "万历十五年",
    author: "黄仁宇",
    book_identifier: null,
    cover_url: null,
    description:
      "以一年为切面，观察皇帝、首辅、文官和将领在同一套制度中的困局。历史的转折往往并不发生在戏剧性的瞬间。",
    visibility: "public",
    created_at: "2026-03-22T16:40:00+08:00",
    updated_at: "2026-10-19T17:25:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000006",
    owner_id: "22222222-2222-4222-8222-222222222222",
    title: "也许你该找个人聊聊",
    author: "洛莉·戈特利布",
    book_identifier: null,
    cover_url: null,
    description:
      "治疗师也会走进另一间咨询室。书里交替讲述来访者与作者自己的困境，呈现改变如何缓慢发生。",
    visibility: "private",
    created_at: "2026-09-02T11:15:00+08:00",
    updated_at: "2026-10-21T22:40:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000007",
    owner_id: "33333333-3333-4333-8333-333333333333",
    title: "人类简史",
    author: "尤瓦尔·赫拉利",
    book_identifier: null,
    cover_url: null,
    description:
      "从认知革命、农业革命到科学革命，作者用宏大的叙事追问：共同想象如何让陌生人协作，又怎样塑造我们的欲望。",
    visibility: "public",
    created_at: "2025-12-22T18:20:00+08:00",
    updated_at: "2026-10-23T20:55:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000008",
    owner_id: "33333333-3333-4333-8333-333333333333",
    title: "献给阿尔吉侬的花束",
    author: "丹尼尔·凯斯",
    book_identifier: null,
    cover_url: null,
    description:
      "一次实验让查理短暂拥有超常智力，也让他看见自己曾经无法理解的善意与残酷。日记的变化记录了意识的觉醒与回退。",
    visibility: "public",
    created_at: "2026-02-14T21:00:00+08:00",
    updated_at: "2026-10-17T23:10:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000009",
    owner_id: "33333333-3333-4333-8333-333333333333",
    title: "设计中的设计",
    author: "原研哉",
    book_identifier: null,
    cover_url: null,
    description:
      "设计不只是制造新奇的形式，也是在重新发现日常。书中从纸、空白、触感与信息出发，讨论设计如何唤起感知。",
    visibility: "public",
    created_at: "2026-04-05T10:10:00+08:00",
    updated_at: "2026-10-15T16:35:00+08:00",
  },
  {
    id: "10000000-0000-4000-8000-000000000010",
    owner_id: "33333333-3333-4333-8333-333333333333",
    title: "月亮与六便士",
    author: "毛姆",
    book_identifier: null,
    cover_url: null,
    description:
      "一个证券经纪人突然离开熟悉的生活去画画。小说讨论天赋、欲望与责任之间无法被轻易调和的冲突。",
    visibility: "private",
    created_at: "2026-08-30T22:30:00+08:00",
    updated_at: "2026-10-13T21:20:00+08:00",
  },
];

export const readingRecords: ReadingRecord[] = [
  {
    id: "d0000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    book_id: "10000000-0000-4000-8000-000000000001",
    status: "finished",
    rating: 5,
    progress_percent: 100,
    started_at: "2026-08-20T00:00:00+08:00",
    finished_at: "2026-09-04T00:00:00+08:00",
    visibility: "private",
    created_at: "2026-08-20T08:00:00+08:00",
    updated_at: "2026-09-04T22:30:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000002",
    owner_id: currentDemoUserId,
    book_id: "10000000-0000-4000-8000-000000000002",
    status: "reading",
    rating: 4,
    progress_percent: 62,
    started_at: "2026-09-28T00:00:00+08:00",
    finished_at: null,
    visibility: "private",
    created_at: "2026-09-28T21:00:00+08:00",
    updated_at: "2026-10-18T20:45:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000003",
    owner_id: currentDemoUserId,
    book_id: "10000000-0000-4000-8000-000000000003",
    status: "want_to_read",
    progress_percent: 0,
    started_at: null,
    finished_at: null,
    visibility: "private",
    created_at: "2026-09-11T19:00:00+08:00",
    updated_at: "2026-10-16T21:30:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000004",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000004",
    status: "finished",
    rating: 5,
    progress_percent: 100,
    started_at: "2026-06-20T00:00:00+08:00",
    finished_at: "2026-07-08T00:00:00+08:00",
    visibility: "private",
    created_at: "2026-06-20T18:10:00+08:00",
    updated_at: "2026-07-08T23:20:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000005",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000005",
    status: "reading",
    rating: 4,
    progress_percent: 45,
    started_at: "2026-10-01T00:00:00+08:00",
    finished_at: null,
    visibility: "private",
    created_at: "2026-10-01T09:30:00+08:00",
    updated_at: "2026-10-19T17:25:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000006",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000006",
    status: "reading",
    rating: 4,
    progress_percent: 78,
    started_at: "2026-09-06T00:00:00+08:00",
    finished_at: null,
    visibility: "private",
    created_at: "2026-09-06T20:00:00+08:00",
    updated_at: "2026-10-21T22:40:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000007",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000007",
    status: "finished",
    rating: 4,
    progress_percent: 100,
    started_at: "2026-01-03T00:00:00+08:00",
    finished_at: "2026-02-10T00:00:00+08:00",
    visibility: "private",
    created_at: "2026-01-03T09:00:00+08:00",
    updated_at: "2026-02-10T22:10:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000008",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000008",
    status: "finished",
    rating: 5,
    progress_percent: 100,
    started_at: "2026-02-18T00:00:00+08:00",
    finished_at: "2026-03-04T00:00:00+08:00",
    visibility: "private",
    created_at: "2026-02-18T21:00:00+08:00",
    updated_at: "2026-03-04T23:10:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000009",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000009",
    status: "reading",
    rating: 4,
    progress_percent: 33,
    started_at: "2026-10-02T00:00:00+08:00",
    finished_at: null,
    visibility: "private",
    created_at: "2026-10-02T10:10:00+08:00",
    updated_at: "2026-10-15T16:35:00+08:00",
  },
  {
    id: "d0000000-0000-4000-8000-000000000010",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000010",
    status: "want_to_read",
    progress_percent: 0,
    started_at: null,
    finished_at: null,
    visibility: "private",
    created_at: "2026-08-30T22:30:00+08:00",
    updated_at: "2026-10-13T21:20:00+08:00",
  },
];

export const tags: Tag[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    name: "文学",
    normalized_name: "文学",
    created_at: "2026-08-18T20:15:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    owner_id: currentDemoUserId,
    name: "阅读方法",
    normalized_name: "阅读方法",
    created_at: "2026-08-18T20:16:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    owner_id: currentDemoUserId,
    name: "待读",
    normalized_name: "待读",
    created_at: "2026-09-11T19:05:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    owner_id: "22222222-2222-4222-8222-222222222222",
    name: "历史",
    normalized_name: "历史",
    created_at: "2026-03-22T16:45:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000005",
    owner_id: "22222222-2222-4222-8222-222222222222",
    name: "社会学",
    normalized_name: "社会学",
    created_at: "2026-06-15T13:25:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000006",
    owner_id: "22222222-2222-4222-8222-222222222222",
    name: "心理",
    normalized_name: "心理",
    created_at: "2026-09-02T11:20:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000007",
    owner_id: "33333333-3333-4333-8333-333333333333",
    name: "小说",
    normalized_name: "小说",
    created_at: "2025-12-22T18:25:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000008",
    owner_id: "33333333-3333-4333-8333-333333333333",
    name: "设计",
    normalized_name: "设计",
    created_at: "2026-04-05T10:15:00+08:00",
  },
  {
    id: "a0000000-0000-4000-8000-000000000009",
    owner_id: "33333333-3333-4333-8333-333333333333",
    name: "摘录",
    normalized_name: "摘录",
    created_at: "2026-02-14T21:05:00+08:00",
  },
];

export const notes: Note[] = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    book_id: "10000000-0000-4000-8000-000000000001",
    title: "活着：把苦难写成了日常的重量",
    content:
      "## 读完以后\n\n《活着》最难读的地方，不是接连不断的死亡，而是每一次失去之后，日子还是要继续。福贵没有变成英雄，他只是继续耕地、吃饭、记住那些离开的人。\n\n余华把苦难压得很低，低到几乎贴着土地。也正因为如此，那些短暂的温暖才显得具体：一碗饭、一句家常话、一个人还在身边。\n\n我更喜欢把这本书理解成一部关于记忆的小说。活着不只是幸存，也是替离开的人保留他们曾经存在过的证据。",
    summary: "余华把苦难压回吃饭、劳作和告别的日常，让“活着”不再是一句口号。读完更在意那些短暂却具体的温暖。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-09-04T21:40:00+08:00",
    updated_at: "2026-10-20T22:10:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000002",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000004",
    title: "《置身事内》里的地方财政逻辑",
    content:
      "## 一条理解现实的线索\n\n读这本书之前，我常把城市扩张、土地价格和产业政策看成彼此独立的问题。书中把它们放回地方政府的财政激励里，很多现象才连成一条线。\n\n土地财政并不只是“卖地”三个字。它还涉及基础设施投入、招商引资、税收竞争和债务周期。理解这些机制，不等于为所有结果辩护，而是先看清楚事情怎样发生。\n\n对我最有用的阅读方法，是每读完一章就追问：这里的行为主体是谁，他面对什么约束，短期选择会带来什么长期后果。",
    summary: "从地方财政、土地与产业激励出发，把许多分散现象连成一条可理解的线索。重点不是记住结论，而是学会追问行为主体和制度约束。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-07-08T22:30:00+08:00",
    updated_at: "2026-10-22T19:10:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000003",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000002",
    title: "在《我与地坛》里重新理解等待",
    content:
      "## 慢下来之后看见的东西\n\n史铁生写地坛，写的并不是一个景点，而是一个人在漫长的停顿里重新学习如何与自己的命运相处。\n\n“等待”在他的文字里不是被动，而是一种缓慢的辨认。辨认季节，辨认母亲没有说出口的担心，也辨认自己究竟还想做什么。\n\n读到这里，我会想起那些没有产出的散步。它们看起来什么也没有发生，却在某个不被注意的时刻，把一个人从狭窄的念头里带出来。",
    summary: "史铁生借地坛书写漫长的停顿与重新辨认：等待不是被动，而是在缓慢看见命运、母亲和自己。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-09-18T20:10:00+08:00",
    updated_at: "2026-10-18T20:45:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000004",
    owner_id: currentDemoUserId,
    book_id: "10000000-0000-4000-8000-000000000007",
    title: "读《人类简史》：共同想象如何运行",
    content:
      "## 从“相信”开始\n\n《人类简史》最吸引我的不是宏大的时间线，而是它对共同想象的解释。货币、国家、公司、法律，这些东西没有一片可以触摸的实体，却能让大量陌生人按照同一套规则行动。\n\n这当然不是一句“都是虚构的”就能结束。共同想象之所以有效，是因为它被制度反复确认，被人们日常实践。\n\n我也对书中过快的因果关系保持警惕。宏大的叙事很有启发，但每一个“因此”都值得再停下来找证据。",
    summary: "共同想象让陌生人协作，也塑造制度与欲望。书中的宏大解释很有启发，但每个因果关系仍值得回到证据。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-02-10T22:20:00+08:00",
    updated_at: "2026-10-23T20:55:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000005",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000003",
    title: "《额尔古纳河右岸》的风与火",
    content:
      "## 一部有呼吸声的小说\n\n迟子建的文字让我先听见风，再看见人。迁徙、狩猎和仪式不是背景知识，而是人物生活内部的时间。\n\n最让我难忘的是叙述者的声音。她不是在向游客介绍一个族群，而是在把已经失去的生活重新讲给后人听。\n\n读这本书时，我不断想到“现代化”这个词多么容易掩盖具体的代价。森林变小了，驯鹿变少了，年轻人离开了，但每个人的选择都不是抽象的。",
    summary: "迟子建先写出风、火与驯鹿，再让人物在迁徙和消逝中呼吸。阅读时更能感到“现代化”背后具体的人与选择。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-16T21:30:00+08:00",
    updated_at: "2026-10-16T21:30:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000006",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000009",
    title: "设计不是把东西做得更漂亮",
    content:
      "## 让感知重新变得敏锐\n\n原研哉谈“无印良品”时，讨论的不是极简风格，而是如何让日常物品重新显出自己的质地。设计在这里更像一种提问方式：我们真的需要更多东西吗？\n\n书里关于纸张、空白和触感的描述让我很有共鸣。好的设计有时不是增加信息，而是为用户留出理解的空间。\n\n这也提醒我，做界面时不要急着用更多装饰填满页面。留白、层级和节奏本身就是内容的一部分。",
    summary: "设计不只是把东西做得更漂亮，而是重新唤醒对纸张、空白与触感的感知。对界面而言，留白和节奏同样是内容。",
    visibility: "public",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-15T16:35:00+08:00",
    updated_at: "2026-10-15T16:35:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000007",
    owner_id: currentDemoUserId,
    book_id: null,
    title: "给朋友看的读书周记：十月",
    content:
      "## 这一周读完什么\n\n这周只读完了一本薄书，其余时间都在重读旧笔记。慢慢发现，重读不是重复，而是检验自己是否真的改变了。\n\n《我与地坛》读到一半时停下来，把母亲相关的段落重新看了一遍。以前只看见“失去”，这次更注意那些没有被说出口的照顾。\n\n下周想整理一篇关于“阅读记录究竟该记什么”的短笔记。",
    summary: "一周重读旧笔记和《我与地坛》的片段，发现重读是在检验自己是否真的改变。下周想整理一篇关于阅读记录方法的短笔记。",
    visibility: "unlisted",
    unlisted_token: "unlisted-demo-weekly-october",
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-24T22:00:00+08:00",
    updated_at: "2026-10-26T21:15:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000008",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000005",
    title: "《万历十五年》读后提纲",
    content:
      "## 制度不是背景板\n\n准备整理成一篇完整的读书笔记，先记下几个关键词：\n\n- 万历皇帝的消极抵抗\n- 张居正改革后的制度反弹\n- 海瑞的道德理想与行政现实\n- 戚继光的军事制度约束\n\n这本书让我意识到，个人的性格和选择当然重要，但如果不看制度提供的行动空间，很多解释会变得过于简单。",
    summary: "以万历十五年为切面，观察皇帝、文官与将领如何受制度约束。个人选择很重要，但必须放回行动空间里理解。",
    visibility: "unlisted",
    unlisted_token: "unlisted-demo-wanli-outline",
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-18T19:20:00+08:00",
    updated_at: "2026-10-19T17:25:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000009",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000008",
    title: "关于阿尔吉侬的几句摘录",
    content:
      "## 智力之外\n\n查理的日记从笨拙变得复杂，又慢慢退回简单。真正刺痛人的不是智力的曲线，而是他在变得“聪明”之后，终于看懂了别人曾经怎样对待他。\n\n这篇先只保留摘录和几个问题：聪明是否等于理解？被理解是否需要同样的语言能力？当一个人知道自己正在失去什么时，尊严意味着什么？",
    summary: "查理的智力变化让周围人的善意与残酷同时显形。先留下摘录和问题，再整理关于理解与尊严的长笔记。",
    visibility: "unlisted",
    unlisted_token: "unlisted-demo-algernon-notes",
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-12T23:00:00+08:00",
    updated_at: "2026-10-17T23:10:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000010",
    owner_id: currentDemoUserId,
    book_id: null,
    title: "我的十一月待读清单",
    content:
      "## 不给自己排太满\n\n十一月想留出一点没有计划的阅读时间。\n\n- 重读《我与地坛》后半部分\n- 找一本短篇小说集，每天读一篇\n- 整理十月留下的摘录，不需要全部写成文章\n\n如果只能完成一件事，我希望是第三件。记录不是为了堆满书架，而是为了知道什么真正留下来。",
    summary: "十一月不把书单排得太满，预留重读、短篇和摘录整理的时间。相比完成数量，更希望知道什么真正留下来。",
    visibility: "private",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-26T22:10:00+08:00",
    updated_at: "2026-10-26T22:10:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000011",
    owner_id: "22222222-2222-4222-8222-222222222222",
    book_id: "10000000-0000-4000-8000-000000000006",
    title: "读《也许你该找个人聊聊》时的自我记录",
    content:
      "## 改变不是一句决心\n\n这本书让我看到，人会在同一套模式里反复受伤，并不是因为不知道问题在哪里，而是因为那套模式曾经保护过自己。\n\n读的时候我一直在想：我是不是也把某些“忙”当成了不必面对的表达？\n\n这部分暂时只留给自己。等读完再回来看，可能会更诚实一些。",
    summary: "书中的来访者与治疗师都困在曾保护过自己的旧模式里。读到这里，我开始留意自己是否也用“忙”回避面对。",
    visibility: "private",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-21T22:40:00+08:00",
    updated_at: "2026-10-21T22:40:00+08:00",
  },
  {
    id: "90000000-0000-4000-8000-000000000012",
    owner_id: "33333333-3333-4333-8333-333333333333",
    book_id: "10000000-0000-4000-8000-000000000010",
    title: "《月亮与六便士》人物关系草稿",
    content:
      "## 先记人物\n\n斯特里克兰、斯特里克兰夫人、布兰奇、施特略夫。现在只记下第一印象：每个人都在用自己的方式维护某种“体面”，而斯特里克兰对体面的彻底拒绝同时伤害了别人。\n\n待补：为什么小说要让叙述者始终保持一段距离？这种距离感是在保护谁？",
    summary: "先梳理斯特里克兰与周围人物的关系，记下每个人维护“体面”的方式。下一步再思考叙述者为何始终与故事保持距离。",
    visibility: "private",
    unlisted_token: null,
    source_type: "manual",
    source_id: null,
    created_at: "2026-10-13T21:20:00+08:00",
    updated_at: "2026-10-13T21:20:00+08:00",
  },
];

const tagById = new Map(tags.map((tag) => [tag.id, tag]));

const noteTagIds: Record<string, string[]> = {
  "90000000-0000-4000-8000-000000000001": [
    "a0000000-0000-4000-8000-000000000001",
  ],
  "90000000-0000-4000-8000-000000000002": [
    "a0000000-0000-4000-8000-000000000005",
  ],
  "90000000-0000-4000-8000-000000000003": [
    "a0000000-0000-4000-8000-000000000001",
  ],
  "90000000-0000-4000-8000-000000000004": [
    "a0000000-0000-4000-8000-000000000004",
    "a0000000-0000-4000-8000-000000000002",
  ],
  "90000000-0000-4000-8000-000000000005": [
    "a0000000-0000-4000-8000-000000000007",
  ],
  "90000000-0000-4000-8000-000000000006": [
    "a0000000-0000-4000-8000-000000000008",
  ],
  "90000000-0000-4000-8000-000000000007": [
    "a0000000-0000-4000-8000-000000000002",
  ],
  "90000000-0000-4000-8000-000000000008": [
    "a0000000-0000-4000-8000-000000000004",
  ],
  "90000000-0000-4000-8000-000000000009": [
    "a0000000-0000-4000-8000-000000000009",
  ],
  "90000000-0000-4000-8000-000000000010": [
    "a0000000-0000-4000-8000-000000000003",
  ],
  "90000000-0000-4000-8000-000000000011": [
    "a0000000-0000-4000-8000-000000000006",
  ],
  "90000000-0000-4000-8000-000000000012": [
    "a0000000-0000-4000-8000-000000000007",
  ],
};

export const noteQuotes: NoteQuote[] = [
  {
    id: "c0000000-0000-4000-8000-000000000001",
    note_id: "90000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    quote_text: "人是为活着本身而活着的，而不是为了活着之外的任何事物所活着。",
    chapter: "自序",
    page: 2,
    position: "第 1 段",
    created_at: "2026-09-04T21:15:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000002",
    note_id: "90000000-0000-4000-8000-000000000001",
    owner_id: currentDemoUserId,
    quote_text: "我看到老人和牛渐渐远去，我听到老人粗哑的令人感动的嗓音在远处传来。",
    chapter: "结尾",
    page: 181,
    position: "末段",
    created_at: "2026-09-04T21:20:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000003",
    note_id: "90000000-0000-4000-8000-000000000002",
    owner_id: "22222222-2222-4222-8222-222222222222",
    quote_text: "经济现实不是抽象的数字，而是无数人在具体制度约束下做出的选择。",
    chapter: "第二章",
    page: 54,
    position: "页面右上",
    created_at: "2026-07-08T21:50:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000004",
    note_id: "90000000-0000-4000-8000-000000000003",
    owner_id: "33333333-3333-4333-8333-333333333333",
    quote_text: "我用别人的身体，走自己的路。",
    chapter: "第四章",
    page: 72,
    position: "第 2 段",
    created_at: "2026-09-18T20:00:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000005",
    note_id: "90000000-0000-4000-8000-000000000004",
    owner_id: currentDemoUserId,
    quote_text: "虚构故事的力量在于，它能让人们共同相信同一件事。",
    chapter: "认知革命",
    page: 31,
    position: "段落中部",
    created_at: "2026-02-10T22:00:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000006",
    note_id: "90000000-0000-4000-8000-000000000005",
    owner_id: "22222222-2222-4222-8222-222222222222",
    quote_text: "风从林子里穿过去，像是有人在很远的地方低声说话。",
    chapter: "清晨",
    page: 98,
    position: "第 3 段",
    created_at: "2026-10-16T21:00:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000007",
    note_id: "90000000-0000-4000-8000-000000000006",
    owner_id: "33333333-3333-4333-8333-333333333333",
    quote_text: "设计不是制造新的东西，而是让人重新发现已经存在的东西。",
    chapter: "重新发现日常",
    page: 42,
    position: "第 1 段",
    created_at: "2026-10-15T16:10:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000008",
    note_id: "90000000-0000-4000-8000-000000000008",
    owner_id: "22222222-2222-4222-8222-222222222222",
    quote_text: "当一个人口众多的国家，各人行动全凭儒家简单粗浅而又无法固定的原则所限制，而法律又缺乏创造性，则其社会发展的程度，必然受到限制。",
    chapter: "第七章",
    page: 268,
    position: "章节末尾",
    created_at: "2026-10-18T19:10:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000009",
    note_id: "90000000-0000-4000-8000-000000000009",
    owner_id: "33333333-3333-4333-8333-333333333333",
    quote_text: "我们能够给予别人的，往往只是我们以为别人需要的东西。",
    chapter: "进步报告 10",
    page: 122,
    position: "第 4 段",
    created_at: "2026-10-12T22:40:00+08:00",
  },
  {
    id: "c0000000-0000-4000-8000-000000000010",
    note_id: "90000000-0000-4000-8000-000000000010",
    owner_id: currentDemoUserId,
    quote_text: "记录不是为了堆满书架，而是为了知道什么真正留下来。",
    chapter: "我的笔记",
    page: null,
    position: "待读清单开头",
    created_at: "2026-10-26T22:10:00+08:00",
  },
];

const notesWithRelations: NoteWithRelations[] = notes.map((note) => {
  const author = profileById.get(note.owner_id);
  if (!author) {
    throw new Error(`Mock note ${note.id} has no matching profile`);
  }

  const noteTags = (noteTagIds[note.id] ?? [])
    .map((tagId) => tagById.get(tagId))
    .filter((tag): tag is Tag => Boolean(tag));
  const book = note.book_id
    ? books.find((candidate) => candidate.id === note.book_id) ?? null
    : null;
  const quotes = noteQuotes.filter((quote) => quote.note_id === note.id);

  return {
    ...note,
    author,
    tags: noteTags,
    book,
    quotes,
  };
});

export const booksWithReading: BookWithReading[] = books.map((book) => ({
  ...book,
  reading_record:
    readingRecords.find((record) => record.book_id === book.id) ?? null,
}));

export const publicNotes = notesWithRelations
  .filter((note) => note.visibility === "public")
  .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

export const featuredNotes = publicNotes.slice(0, 4);

export const recentNotes = [...notesWithRelations]
  .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  .slice(0, 5);

export const currentDemoProfile = profiles[0];

export function getProfileById(id: string): Profile | undefined {
  return profileById.get(id);
}

export function getBookById(id: string): BookWithReading | undefined {
  return booksWithReading.find((book) => book.id === id);
}

export function getNoteById(id: string): NoteWithRelations | undefined {
  return notesWithRelations.find((note) => note.id === id);
}

export function getNotesForBook(bookId: string): NoteWithRelations[] {
  return notesWithRelations
    .filter((note) => note.book_id === bookId)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function getPublicNotesForProfile(profileId: string): NoteWithRelations[] {
  return publicNotes.filter((note) => note.owner_id === profileId);
}

export const readingStatusLabels: Record<ReadingStatus, string> = {
  want_to_read: "想读",
  reading: "在读",
  finished: "已读",
  paused: "暂停",
  abandoned: "搁置",
};

export const visibilityLabels: Record<NoteVisibility, string> = {
  private: "私密",
  public: "公开",
  unlisted: "仅链接",
};

export function formatMockDate(value: string | null): string {
  if (!value) {
    return "——";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}
